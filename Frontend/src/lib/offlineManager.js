// Frontend Offline Management Utilities
// Handles offline detection, local storage, and sync

class OfflineManager {
  constructor() {
    this.isOfflineMode = false;
    this.offlineServerUrl = null;
    this.onlinServerUrl = 'http://localhost:5000';
    this.pendingSessions = [];
    this.listeners = [];
    
    this.init();
  }

  init() {
    // Load pending sessions from localStorage
    this.loadPendingSessions();
    
    // Monitor online/offline status
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    
    // Check initial status
    this.checkConnectionStatus();
  }

  // Check if connected to internet or local offline server
  async checkConnectionStatus() {
    try {
      // First try main server
      const response = await fetch(`${this.onlinServerUrl}/api/courses`, { 
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      
      if (response.ok) {
        this.isOfflineMode = false;
        this.notifyListeners('online');
        return 'online';
      }
    } catch (err) {
      // Main server failed, check for local offline server
      const localIp = this.getLocalServerIP();
      if (localIp) {
        try {
          const offlineUrl = `http://${localIp}:3030`;
          const response = await fetch(`${offlineUrl}/api/offline/status`, {
            method: 'GET',
            signal: AbortSignal.timeout(2000)
          });
          
          if (response.ok) {
            this.isOfflineMode = true;
            this.offlineServerUrl = offlineUrl;
            this.notifyListeners('offline-local');
            return 'offline-local';
          }
        } catch (err) {
          // No local server either
        }
      }
    }
    
    this.isOfflineMode = true;
    this.offlineServerUrl = null;
    this.notifyListeners('offline');
    return 'offline';
  }

  // Get local server IP (teacher's IP)
  getLocalServerIP() {
    // Check localStorage for saved teacher IP
    return localStorage.getItem('offlineServerIP');
  }

  setLocalServerIP(ip) {
    localStorage.setItem('offlineServerIP', ip);
    this.offlineServerUrl = `http://${ip}:3030`;
  }

  // Get appropriate server URL based on mode
  getServerUrl() {
    if (this.isOfflineMode && this.offlineServerUrl) {
      return this.offlineServerUrl;
    }
    return this.onlinServerUrl;
  }

  // Create session (Teacher) - works both online and offline
  async createSession(sessionData) {
    if (this.isOfflineMode && this.offlineServerUrl) {
      // Use local offline server
      const response = await fetch(`${this.offlineServerUrl}/api/offline/session/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData)
      });
      
      const result = await response.json();
      
      // Save to pending sessions for later sync
      this.addPendingSession(result.session);
      
      return result;
    } else {
      // Use online server
      const token = localStorage.getItem('token');
      const response = await fetch(`${this.onlinServerUrl}/api/teacher/generate`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          courseId: sessionData.courseId,
          durationMinutes: sessionData.duration || 15
        })
      });
      
      return await response.json();
    }
  }

  // Mark attendance (Student) - works both online and offline
  async markAttendance(attendanceData) {
    if (this.isOfflineMode && this.offlineServerUrl) {
      // Use local offline server
      const response = await fetch(`${this.offlineServerUrl}/api/offline/attendance/mark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attendanceData)
      });
      
      return await response.json();
    } else {
      // Use online server
      const token = localStorage.getItem('token');
      const response = await fetch(`${this.onlinServerUrl}/api/attendance/scan`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          qrString: attendanceData.qrString
        })
      });
      
      return await response.json();
    }
  }

  // Get active sessions
  async getActiveSessions() {
    if (this.isOfflineMode && this.offlineServerUrl) {
      const response = await fetch(`${this.offlineServerUrl}/api/offline/sessions/active`);
      return await response.json();
    } else {
      const token = localStorage.getItem('token');
      const response = await fetch(`${this.onlinServerUrl}/api/teacher/active-sessions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return await response.json();
    }
  }

  // Save pending session to localStorage
  addPendingSession(session) {
    this.pendingSessions.push(session);
    this.savePendingSessions();
  }

  savePendingSessions() {
    localStorage.setItem('pendingSessions', JSON.stringify(this.pendingSessions));
  }

  loadPendingSessions() {
    const stored = localStorage.getItem('pendingSessions');
    if (stored) {
      this.pendingSessions = JSON.parse(stored);
    }
  }

  // Sync all pending sessions when online
  async syncPendingSessions() {
    if (this.isOfflineMode || this.pendingSessions.length === 0) {
      return { success: false, message: 'No sessions to sync or still offline' };
    }

    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`${this.onlinServerUrl}/api/offline/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sessions: this.pendingSessions
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        // Clear synced sessions
        this.pendingSessions = [];
        this.savePendingSessions();
        
        // Clear from local server if connected
        if (this.offlineServerUrl) {
          const sessionIds = this.pendingSessions.map(s => s.sessionId);
          await fetch(`${this.offlineServerUrl}/api/offline/clear`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionIds })
          });
        }
      }
      
      return result;
    } catch (err) {
      console.error('Sync failed:', err);
      return { success: false, message: err.message };
    }
  }

  // Get pending sessions count
  getPendingCount() {
    return this.pendingSessions.length;
  }

  // Event listeners
  addListener(callback) {
    this.listeners.push(callback);
  }

  removeListener(callback) {
    this.listeners = this.listeners.filter(l => l !== callback);
  }

  notifyListeners(status) {
    this.listeners.forEach(callback => callback(status));
  }

  handleOnline() {
    console.log('Network online detected');
    this.checkConnectionStatus();
  }

  handleOffline() {
    console.log('Network offline detected');
    this.isOfflineMode = true;
    this.notifyListeners('offline');
  }

  // Get connection status for UI
  getStatus() {
    return {
      isOfflineMode: this.isOfflineMode,
      serverUrl: this.getServerUrl(),
      pendingCount: this.getPendingCount(),
      canSync: !this.isOfflineMode && this.pendingSessions.length > 0
    };
  }
}

// Export singleton instance
const offlineManager = new OfflineManager();
export default offlineManager;
