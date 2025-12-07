// Quick test script to verify token ID authentication flow
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:5000/api';

async function testTokenAuth() {
    console.log('=== Testing Token ID Authentication Flow ===\n');
    
    try {
        // Step 1: Login
        console.log('1. Testing login...');
        const loginResp = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username: 'admin', 
                password: 'admin123' 
            })
        });
        
        const loginData = await loginResp.json();
        console.log('   Login response:', JSON.stringify(loginData, null, 2));
        
        if (!loginResp.ok) {
            console.log('   ❌ Login failed');
            return;
        }
        
        // Check if we got tokenId instead of token
        if (loginData.tokenId) {
            console.log('   ✅ Received tokenId (new flow):', loginData.tokenId);
        } else if (loginData.token) {
            console.log('   ⚠️  Received raw token (fallback flow)');
        }
        
        const tokenId = loginData.tokenId || loginData.token;
        
        // Step 2: Access protected route with token ID
        console.log('\n2. Testing protected route with token ID...');
        const headers = {};
        if (loginData.tokenId) {
            headers['x-token-id'] = tokenId;
            console.log('   Using x-token-id header');
        } else {
            headers['Authorization'] = `Bearer ${tokenId}`;
            console.log('   Using Authorization header (fallback)');
        }
        
        const meResp = await fetch(`${API_BASE}/auth/me`, { headers });
        const meData = await meResp.json();
        
        if (meResp.ok) {
            console.log('   ✅ Protected route accessed successfully');
            console.log('   User:', meData.user?.username, '- Role:', meData.user?.role);
        } else {
            console.log('   ❌ Failed to access protected route');
            console.log('   Error:', meData.message);
        }
        
        console.log('\n=== Test Complete ===');
        
    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
    }
}

testTokenAuth();
