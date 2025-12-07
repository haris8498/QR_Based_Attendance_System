// Offline-enabled Student Attendance Scanning
// Add this to StudentDashboard.jsx

import offlineManager from '../lib/offlineManager';

// Modified scanQR function for offline support
const scanQROffline = async (qrString) => {
  try {
    const qrData = JSON.parse(qrString);
    
    // Check if QR is expired
    if (Date.now() > qrData.expiry) {
      return { success: false, message: 'QR Code expired' };
    }

    // Get current user
    const currentUser = system.getCurrentUser();
    if (!currentUser) {
      return { success: false, message: 'Not logged in' };
    }

    // Check connection mode
    const status = offlineManager.getStatus();

    // Prepare attendance data
    const attendanceData = {
      sessionId: qrData.sessionId,
      studentId: currentUser.username,
      studentName: currentUser.name,
      rollNo: currentUser.rollNo,
      timestamp: Date.now()
    };

    if (qrData.offlineMode && status.isOfflineMode) {
      // Offline mode - send to local server
      const serverUrl = qrData.serverUrl || status.serverUrl;
      
      if (!serverUrl) {
        return { 
          success: false, 
          message: 'Offline server not configured. Ask teacher for IP address.' 
        };
      }

      const response = await fetch(`${serverUrl}/api/offline/attendance/mark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attendanceData)
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        return {
          success: true,
          message: '✅ Attendance marked (OFFLINE mode)',
          data: result.record
        };
      } else {
        return {
          success: false,
          message: result.message || 'Failed to mark attendance'
        };
      }
    } else if (!status.isOfflineMode) {
      // Online mode - use normal API
      const token = system.getToken();
      const response = await fetch('http://localhost:5000/api/attendance/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ qrString })
      });

      const result = await response.json();
      
      if (response.ok) {
        return {
          success: true,
          message: '✅ Attendance marked (ONLINE mode)',
          data: result
        };
      } else {
        return {
          success: false,
          message: result.message || 'Failed to mark attendance'
        };
      }
    } else {
      return {
        success: false,
        message: 'Connection issue. Please check network or configure offline mode.'
      };
    }
  } catch (err) {
    console.error('Scan error:', err);
    return {
      success: false,
      message: 'Error: ' + err.message
    };
  }
};

// Get active sessions (works in both online and offline)
const getActiveSessionsOffline = async () => {
  try {
    const status = offlineManager.getStatus();
    
    if (status.isOfflineMode && status.serverUrl) {
      // Get from local server
      const response = await fetch(`${status.serverUrl}/api/offline/sessions/active`);
      const result = await response.json();
      return result.sessions || [];
    } else if (!status.isOfflineMode) {
      // Get from online server
      const token = system.getToken();
      const response = await fetch('http://localhost:5000/api/teacher/active-sessions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      return result.sessions || [];
    }
    
    return [];
  } catch (err) {
    console.error('Error fetching sessions:', err);
    return [];
  }
};

export { scanQROffline, getActiveSessionsOffline };
