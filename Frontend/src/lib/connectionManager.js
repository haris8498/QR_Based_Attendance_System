import offlineManager from './offlineManager';
import bluetoothService from './bluetoothService';

/**
 * Connection Manager - Handles WiFi, Bluetooth, and Online modes
 */

class ConnectionManager {
  constructor() {
    this.connectionType = 'online'; // 'online', 'wifi', 'bluetooth'
    this.offlineManager = offlineManager;
    this.bluetoothService = bluetoothService;
    this.listeners = [];
  }

  // Initialize and detect best connection
  async initialize() {
    // Try online first
    const onlineStatus = await this.checkOnlineConnection();
    if (onlineStatus) {
      this.connectionType = 'online';
      return { type: 'online', status: 'connected' };
    }

    // Try WiFi offline server
    const wifiStatus = await this.checkWiFiConnection();
    if (wifiStatus) {
      this.connectionType = 'wifi';
      return { type: 'wifi', status: 'connected' };
    }

    // Check Bluetooth availability
    if (bluetoothService.isSupported()) {
      this.connectionType = 'bluetooth';
      return { type: 'bluetooth', status: 'available' };
    }

    return { type: 'none', status: 'disconnected' };
  }

  async checkOnlineConnection() {
    try {
      const response = await fetch('http://localhost:5000/api/courses', {
        signal: AbortSignal.timeout(2000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async checkWiFiConnection() {
    const status = offlineManager.getStatus();
    return status.serverUrl && status.serverUrl.includes('3030');
  }

  // Teacher: Start session with best available connection
  async createSession(sessionData) {
    const connection = await this.initialize();

    switch (connection.type) {
      case 'online':
        return await this.createOnlineSession(sessionData);
      
      case 'wifi':
        return await offlineManager.createSession(sessionData);
      
      case 'bluetooth':
        return await this.createBluetoothSession(sessionData);
      
      default:
        throw new Error('No connection available');
    }
  }

  async createOnlineSession(sessionData) {
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:5000/api/teacher/generate', {
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

  async createBluetoothSession(sessionData) {
    // Start teacher mode
    const teacherConnection = await bluetoothService.startTeacherMode(sessionData.teacherName);
    
    if (!teacherConnection.success) {
      throw new Error('Failed to start Bluetooth teacher mode');
    }

    // Create session
    const session = bluetoothService.createSession({
      ...sessionData,
      deviceId: teacherConnection.deviceId,
      connectionType: 'bluetooth'
    });

    // Start listening for student connections
    await bluetoothService.startListening((data) => {
      if (data.type === 'ATTENDANCE_REQUEST') {
        this.handleBluetoothAttendance(data.data);
      }
    });

    return {
      success: true,
      session: session.session,
      qr: {
        ...sessionData,
        connectionType: 'bluetooth',
        deviceId: teacherConnection.deviceId,
        instruction: 'Enable Bluetooth and scan to connect'
      }
    };
  }

  async handleBluetoothAttendance(attendanceData) {
    const result = await bluetoothService.markAttendance(attendanceData);
    
    if (result.success) {
      // Send confirmation back
      await bluetoothService.sendData({
        type: 'ATTENDANCE_CONFIRMED',
        data: result.record
      });
      
      // Notify UI
      this.notifyListeners({
        type: 'attendance_marked',
        data: result.record
      });
    }
  }

  // Student: Mark attendance with best available connection
  async markAttendance(qrData, studentData) {
    const connectionType = qrData.connectionType || 'online';

    switch (connectionType) {
      case 'online':
        return await this.markOnlineAttendance(qrData);
      
      case 'wifi':
        return await offlineManager.markAttendance({
          sessionId: qrData.sessionId,
          ...studentData
        });
      
      case 'bluetooth':
        return await this.markBluetoothAttendance(qrData, studentData);
      
      default:
        throw new Error('Unknown connection type');
    }
  }

  async markOnlineAttendance(qrData) {
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:5000/api/attendance/scan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        qrString: JSON.stringify(qrData)
      })
    });

    return await response.json();
  }

  async markBluetoothAttendance(qrData, studentData) {
    // Connect to teacher's device
    const connection = await bluetoothService.connectToTeacher();
    
    if (!connection.success) {
      throw new Error('Failed to connect to teacher via Bluetooth');
    }

    // Send attendance data
    const attendanceData = {
      sessionId: qrData.sessionId,
      studentId: studentData.studentId,
      studentName: studentData.studentName,
      rollNo: studentData.rollNo,
      timestamp: Date.now()
    };

    // Send via Bluetooth
    await bluetoothService.sendData({
      type: 'ATTENDANCE_REQUEST',
      data: attendanceData
    });

    // Wait for confirmation
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({
          success: false,
          message: 'Timeout waiting for confirmation'
        });
      }, 5000);

      bluetoothService.startListening((data) => {
        if (data.type === 'ATTENDANCE_CONFIRMED') {
          clearTimeout(timeout);
          resolve({
            success: true,
            message: 'Attendance marked via Bluetooth',
            data: data.data
          });
        }
      });
    });
  }

  // Get connection status for UI
  getConnectionStatus() {
    return {
      type: this.connectionType,
      online: this.connectionType === 'online',
      wifi: this.connectionType === 'wifi',
      bluetooth: this.connectionType === 'bluetooth',
      icon: this.getConnectionIcon(),
      color: this.getConnectionColor(),
      message: this.getConnectionMessage()
    };
  }

  getConnectionIcon() {
    switch (this.connectionType) {
      case 'online': return '🌐';
      case 'wifi': return '📡';
      case 'bluetooth': return '🔵';
      default: return '🔴';
    }
  }

  getConnectionColor() {
    switch (this.connectionType) {
      case 'online': return '#10b981';
      case 'wifi': return '#f59e0b';
      case 'bluetooth': return '#3b82f6';
      default: return '#ef4444';
    }
  }

  getConnectionMessage() {
    switch (this.connectionType) {
      case 'online': return 'Online (Internet)';
      case 'wifi': return 'Offline (WiFi Hotspot)';
      case 'bluetooth': return 'Offline (Bluetooth)';
      default: return 'No Connection';
    }
  }

  // Sync data when connection available
  async syncAllData() {
    // Sync WiFi offline data
    const wifiResult = await offlineManager.syncPendingSessions();
    
    // Sync Bluetooth data
    const bluetoothData = bluetoothService.getAllSessions();
    const bluetoothResult = await this.syncBluetoothData(bluetoothData);

    return {
      wifi: wifiResult,
      bluetooth: bluetoothResult
    };
  }

  async syncBluetoothData(data) {
    if (!data.sessions || data.sessions.length === 0) {
      return { success: true, synced: 0 };
    }

    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch('http://localhost:5000/api/offline/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sessions: data.sessions
        })
      });

      return await response.json();
    } catch (error) {
      console.error('Bluetooth sync error:', error);
      return { success: false, message: error.message };
    }
  }

  // Event listeners
  addListener(callback) {
    this.listeners.push(callback);
  }

  removeListener(callback) {
    this.listeners = this.listeners.filter(l => l !== callback);
  }

  notifyListeners(event) {
    this.listeners.forEach(callback => callback(event));
  }

  // Disconnect all
  async disconnectAll() {
    await bluetoothService.disconnect();
  }
}

// Export singleton
const connectionManager = new ConnectionManager();
export default connectionManager;
