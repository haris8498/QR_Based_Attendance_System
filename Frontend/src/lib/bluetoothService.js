/**
 * Bluetooth Service for Offline Attendance
 * Uses Web Bluetooth API for browser-based BLE communication
 */

class BluetoothAttendanceService {
  constructor() {
    this.device = null;
    this.server = null;
    this.serviceUuid = '0000180a-0000-1000-8000-00805f9b34fb'; // Custom service UUID
    this.characteristicUuid = '00002a29-0000-1000-8000-00805f9b34fb'; // Custom characteristic
    this.isTeacher = false;
    this.onDataReceived = null;
    this.sessions = new Map();
    this.attendanceRecords = new Map();
  }

  // Check if Web Bluetooth is supported
  isSupported() {
    return 'bluetooth' in navigator;
  }

  // Teacher: Start advertising (make device discoverable)
  async startTeacherMode(teacherName) {
    if (!this.isSupported()) {
      throw new Error('Bluetooth not supported in this browser');
    }

    this.isTeacher = true;

    try {
      // Request Bluetooth device (becomes discoverable)
      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [this.serviceUuid] }],
        optionalServices: [this.serviceUuid]
      });

      console.log('Teacher device connected:', this.device.name);
      
      // Connect to GATT server
      this.server = await this.device.gatt.connect();
      
      return {
        success: true,
        deviceId: this.device.id,
        deviceName: this.device.name || teacherName
      };
    } catch (error) {
      console.error('Bluetooth teacher mode error:', error);
      throw error;
    }
  }

  // Student: Scan and connect to teacher's device
  async connectToTeacher() {
    if (!this.isSupported()) {
      throw new Error('Bluetooth not supported in this browser');
    }

    try {
      // Scan for teacher's device
      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [this.serviceUuid] }],
        optionalServices: [this.serviceUuid]
      });

      console.log('Found teacher device:', this.device.name);

      // Connect to teacher
      this.server = await this.device.gatt.connect();
      
      // Get service
      const service = await this.server.getPrimaryService(this.serviceUuid);
      
      // Get characteristic for data transfer
      this.characteristic = await service.getCharacteristic(this.characteristicUuid);

      return {
        success: true,
        teacherId: this.device.id,
        teacherName: this.device.name
      };
    } catch (error) {
      console.error('Bluetooth connection error:', error);
      throw error;
    }
  }

  // Send data via Bluetooth
  async sendData(data) {
    if (!this.characteristic) {
      throw new Error('Not connected to any device');
    }

    try {
      const encoder = new TextEncoder();
      const dataString = JSON.stringify(data);
      const dataBuffer = encoder.encode(dataString);
      
      // BLE has 512 byte limit, split if needed
      const chunkSize = 512;
      for (let i = 0; i < dataBuffer.length; i += chunkSize) {
        const chunk = dataBuffer.slice(i, i + chunkSize);
        await this.characteristic.writeValue(chunk);
      }

      return { success: true };
    } catch (error) {
      console.error('Bluetooth send error:', error);
      throw error;
    }
  }

  // Listen for incoming data
  async startListening(callback) {
    if (!this.characteristic) {
      throw new Error('Not connected to any device');
    }

    try {
      // Enable notifications
      await this.characteristic.startNotifications();
      
      // Listen for data
      this.characteristic.addEventListener('characteristicvaluechanged', (event) => {
        const decoder = new TextDecoder();
        const value = decoder.decode(event.target.value);
        
        try {
          const data = JSON.parse(value);
          if (callback) callback(data);
        } catch (e) {
          console.error('Failed to parse received data:', e);
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Bluetooth listen error:', error);
      throw error;
    }
  }

  // Teacher: Create session via Bluetooth
  createSession(sessionData) {
    const sessionId = sessionData.sessionId || `BT-${Date.now()}`;
    this.sessions.set(sessionId, {
      ...sessionData,
      sessionId,
      connectionType: 'bluetooth',
      createdAt: Date.now()
    });

    return {
      success: true,
      sessionId,
      session: this.sessions.get(sessionId)
    };
  }

  // Student: Mark attendance via Bluetooth
  async markAttendance(attendanceData) {
    const sessionId = attendanceData.sessionId;
    
    if (!this.sessions.has(sessionId)) {
      // Send request to teacher for session validation
      await this.sendData({
        type: 'ATTENDANCE_REQUEST',
        data: attendanceData
      });
      
      return { success: true, pending: true };
    }

    // Process locally
    const records = this.attendanceRecords.get(sessionId) || [];
    
    // Check duplicate
    const existing = records.find(r => r.studentId === attendanceData.studentId);
    if (existing) {
      return { success: false, message: 'Already marked' };
    }

    records.push({
      ...attendanceData,
      timestamp: Date.now(),
      connectionType: 'bluetooth'
    });

    this.attendanceRecords.set(sessionId, records);

    return {
      success: true,
      record: attendanceData
    };
  }

  // Get all sessions for export
  getAllSessions() {
    return {
      sessions: Array.from(this.sessions.values()),
      attendance: Array.from(this.attendanceRecords.entries()).map(([sessionId, records]) => ({
        sessionId,
        records
      }))
    };
  }

  // Disconnect
  async disconnect() {
    if (this.device && this.device.gatt.connected) {
      await this.device.gatt.disconnect();
    }
    this.device = null;
    this.server = null;
    this.characteristic = null;
  }

  // Check connection status
  isConnected() {
    return this.device && this.device.gatt && this.device.gatt.connected;
  }
}

// Fallback: Bluetooth Serial for native apps
class BluetoothSerialService {
  constructor() {
    this.isNative = typeof cordova !== 'undefined' || typeof ReactNativeWebView !== 'undefined';
    this.sessions = new Map();
    this.attendanceRecords = new Map();
  }

  isSupported() {
    // Check for Cordova Bluetooth Serial plugin
    return this.isNative && typeof bluetoothSerial !== 'undefined';
  }

  async startTeacherMode(teacherName) {
    if (!this.isSupported()) {
      throw new Error('Bluetooth Serial not available');
    }

    return new Promise((resolve, reject) => {
      bluetoothSerial.enable(() => {
        bluetoothSerial.discoverUnpaired((devices) => {
          resolve({
            success: true,
            deviceName: teacherName,
            available: devices
          });
        }, reject);
      }, reject);
    });
  }

  async connectToTeacher(deviceAddress) {
    if (!this.isSupported()) {
      throw new Error('Bluetooth Serial not available');
    }

    return new Promise((resolve, reject) => {
      bluetoothSerial.connect(deviceAddress, () => {
        resolve({ success: true, connected: true });
      }, reject);
    });
  }

  async sendData(data) {
    if (!this.isSupported()) {
      throw new Error('Bluetooth Serial not available');
    }

    return new Promise((resolve, reject) => {
      const dataString = JSON.stringify(data);
      bluetoothSerial.write(dataString, () => {
        resolve({ success: true });
      }, reject);
    });
  }

  startListening(callback) {
    if (!this.isSupported()) {
      throw new Error('Bluetooth Serial not available');
    }

    bluetoothSerial.subscribe('\n', (data) => {
      try {
        const parsed = JSON.parse(data);
        callback(parsed);
      } catch (e) {
        console.error('Failed to parse serial data:', e);
      }
    });
  }
}

// Export singleton instances
const bluetoothService = new BluetoothAttendanceService();
const bluetoothSerialService = new BluetoothSerialService();

export { bluetoothService, bluetoothSerialService };
export default bluetoothService;
