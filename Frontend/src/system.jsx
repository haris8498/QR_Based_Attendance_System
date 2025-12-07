// This system module now proxies requests to the backend API.
const API_BASE = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_BASE) ? process.env.REACT_APP_API_BASE : 'http://localhost:5000/api';

class AttendanceSystem {
    constructor() {
        // Try to restore session from cookie or sessionStorage on initialization
        const cookieMatch = document.cookie.match(new RegExp('(^| )authTokenId=([^;]+)'));
        const cookieToken = cookieMatch ? cookieMatch[2] : null;
        const storedToken = sessionStorage.getItem('authToken');
        const storedUser = sessionStorage.getItem('authUser');
        
        this.token = cookieToken || storedToken || null;
        this.currentUser = storedUser ? JSON.parse(storedUser) : null;
    }

    // Auth helpers
    setAuth(token, user) {
        this.token = token;
        this.currentUser = user || null;
        
        // Store token id in cookie (client-side) and user in sessionStorage
        if (token && user) {
            // If token looks like an id (no dots), store as cookie
            if (typeof token === 'string' && token.indexOf('.') === -1) {
                const expires = new Date();
                expires.setHours(expires.getHours() + 12);
                document.cookie = `authTokenId=${token}; path=/; expires=${expires.toUTCString()}; samesite=lax`;
            } else {
                // fallback for legacy JWT tokens
                sessionStorage.setItem('authToken', token);
            }
            sessionStorage.setItem('authUser', JSON.stringify(user));
        }
    }

    getToken() {
        // Always check sessionStorage first in case of refresh
        if (!this.token) {
            // Check for cookie-stored token id first
            const match = document.cookie.match(new RegExp('(^| )authTokenId=([^;]+)'));
            if (match) {
                this.token = match[2];
            } else {
                this.token = sessionStorage.getItem('authToken');
            }
        }
        return this.token;
    }

    getCurrentUser() {
        // Always check sessionStorage first in case of refresh
        if (!this.currentUser) {
            const storedUser = sessionStorage.getItem('authUser');
            this.currentUser = storedUser ? JSON.parse(storedUser) : null;
        }
        return this.currentUser;
    }

    clearAuth() {
        this.token = null;
        this.currentUser = null;
        
        // Clear sessionStorage
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('authUser');
        // remove cookie
        document.cookie = 'authTokenId=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        
        // Clear any browser history state
        if (window.history && window.history.pushState) {
            window.history.pushState(null, '', window.location.href);
            window.onpopstate = function() {
                window.history.pushState(null, '', window.location.href);
            };
        }
    }

    async login(username, password) {
        const resp = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await resp.json();
        if (!resp.ok) return { success: false, message: data.message || 'Login failed' };
        // store tokenId (or fallback token) and user
        const tokenToStore = data.tokenId || data.token;
        this.setAuth(tokenToStore, data.user);
        return { success: true, user: data.user };
    }

    // Build auth headers for requests. If token id (no dots) is used, send it in `x-token-id` header.
    getAuthHeaders(contentType) {
        const token = this.getToken();
        const headers = {};
        if (contentType) headers['Content-Type'] = contentType;
        if (!token) return headers;
        if (typeof token === 'string' && token.indexOf('.') === -1) {
            headers['x-token-id'] = token;
        } else {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    }

    logout() {
        this.clearAuth();
        // Force redirect to login and prevent back button
        window.location.replace('/');
    }

    // Check if user is authenticated
    isAuthenticated() {
        const token = this.getToken();
        if (!token) return false;
        // If token looks like a JWT, do local expiry check. Otherwise assume presence of token id is enough; server will validate.
        try {
            if (typeof token === 'string' && token.split('.').length === 3) {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const isExpired = payload.exp && (Date.now() >= payload.exp * 1000);
                if (isExpired) {
                    this.clearAuth();
                    return false;
                }
                return true;
            }
            return true;
        } catch (err) {
            this.clearAuth();
            return false;
        }
    }

    // Fetch latest current user from server (useful after admin updates)
    async refreshCurrentUser() {
        const token = this.getToken();
        if (!token) return null;
        try {
            // Send token id in header when available
            const headers = {};
            if (typeof token === 'string' && token.indexOf('.') === -1) {
                headers['x-token-id'] = token;
            } else {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const resp = await fetch(`${API_BASE}/auth/me`, { headers });
            const data = await resp.json();
            if (resp.ok && data.user) {
                this.currentUser = data.user;
                return data.user;
            }
            return null;
        } catch (err) {
            console.error('refreshCurrentUser error', err);
            return null;
        }
    }

    async generateQRCode(courseId, durationMinutes = 15) {
        const resp = await fetch(`${API_BASE}/teacher/generate`, {
            method: 'POST', headers: this.getAuthHeaders('application/json'),
            body: JSON.stringify({ courseId, durationMinutes })
        });
        return await resp.json();
    }

    async getCurrentQR(courseId) {
        const token = this.getToken();
        const url = new URL(`${API_BASE}/teacher/current`);
        if (courseId) url.searchParams.append('courseId', courseId);
        const resp = await fetch(url.toString(), { headers: this.getAuthHeaders() });
        return await resp.json();
    }

    async markAttendance(qrString) {
        const resp = await fetch(`${API_BASE}/attendance/scan`, {
            method: 'POST', headers: this.getAuthHeaders('application/json'),
            body: JSON.stringify({ qrString })
        });
        return await resp.json();
    }

    async getAttendanceToday() {
        const resp = await fetch(`${API_BASE}/attendance/today`, { headers: this.getAuthHeaders() });
        return await resp.json();
    }

    async getAttendanceMonth(month, year) {
        const url = new URL(`${API_BASE}/attendance/month`);
        url.searchParams.append('month', month);
        url.searchParams.append('year', year);
        const resp = await fetch(url.toString(), { headers: this.getAuthHeaders() });
        return await resp.json();
    }

    async addStudent(name, rollNo) {
        const resp = await fetch(`${API_BASE}/admin/students`, {
            method: 'POST', headers: this.getAuthHeaders('application/json'),
            body: JSON.stringify({ name, rollNo })
        });
        return await resp.json();
    }

    async addCourse(code, name) {
        const resp = await fetch(`${API_BASE}/admin/courses`, {
            method: 'POST', headers: this.getAuthHeaders('application/json'),
            body: JSON.stringify({ code, name })
        });
        return await resp.json();
    }

    async signup(email, password, fullName, role, rollNo) {
        const resp = await fetch(`${API_BASE}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                password,
                name: fullName,
                role,
                rollNo,
                username: email.split('@')[0] // derive username from email
            })
        });
        const data = await resp.json();
        if (!resp.ok) return { success: false, message: data.message || 'Signup failed' };
        return { success: true, user: data.user };
    }
}

export const system = new AttendanceSystem();