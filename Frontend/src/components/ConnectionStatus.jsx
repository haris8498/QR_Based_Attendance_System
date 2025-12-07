import React, { useState, useEffect } from 'react';
import connectionManager from '../lib/connectionManager';
import bluetoothService from '../lib/bluetoothService';
import offlineManager from '../lib/offlineManager';
import './ConnectionStatus.css';

const ConnectionStatus = () => {
  const [status, setStatus] = useState({
    type: 'checking',
    online: false,
    wifi: false,
    bluetooth: false,
    icon: '⏳',
    color: '#gray',
    message: 'Checking connection...'
  });

  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [teacherIP, setTeacherIP] = useState('');
  const [bluetoothDevices, setBluetoothDevices] = useState([]);

  useEffect(() => {
    initializeConnection();

    const handleConnectionChange = (event) => {
      updateStatus();
    };

    connectionManager.addListener(handleConnectionChange);

    const interval = setInterval(updateStatus, 10000);

    return () => {
      connectionManager.removeListener(handleConnectionChange);
      clearInterval(interval);
    };
  }, []);

  const initializeConnection = async () => {
    await connectionManager.initialize();
    updateStatus();
  };

  const updateStatus = () => {
    const currentStatus = connectionManager.getConnectionStatus();
    setStatus(currentStatus);
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage('Syncing all data...');

    try {
      const result = await connectionManager.syncAllData();
      
      const wifiSynced = result.wifi?.results?.synced || 0;
      const bluetoothSynced = result.bluetooth?.results?.synced || 0;
      const totalSynced = wifiSynced + bluetoothSynced;

      if (totalSynced > 0) {
        setSyncMessage(`✅ Synced ${totalSynced} sessions (WiFi: ${wifiSynced}, BT: ${bluetoothSynced})`);
      } else {
        setSyncMessage('ℹ️ No pending data to sync');
      }
    } catch (err) {
      setSyncMessage(`❌ Sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(''), 5000);
    }
  };

  const handleWiFiSetup = () => {
    if (teacherIP) {
      offlineManager.setLocalServerIP(teacherIP);
      setSyncMessage('✅ WiFi IP configured');
      setTimeout(() => setSyncMessage(''), 3000);
      setShowOptions(false);
      initializeConnection();
    }
  };

  const handleBluetoothSetup = async () => {
    if (!bluetoothService.isSupported()) {
      alert('❌ Bluetooth not supported in this browser. Use Chrome or Edge.');
      return;
    }

    try {
      setSyncMessage('🔵 Starting Bluetooth...');
      const result = await bluetoothService.startTeacherMode('Teacher');
      
      if (result.success) {
        setSyncMessage('✅ Bluetooth ready! Device: ' + result.deviceName);
        setShowOptions(false);
        initializeConnection();
      }
    } catch (err) {
      setSyncMessage(`❌ Bluetooth error: ${err.message}`);
    } finally {
      setTimeout(() => setSyncMessage(''), 5000);
    }
  };

  const handleConnectBluetooth = async () => {
    try {
      setSyncMessage('🔵 Scanning for teacher...');
      const result = await bluetoothService.connectToTeacher();
      
      if (result.success) {
        setSyncMessage('✅ Connected to: ' + result.teacherName);
        setShowOptions(false);
        initializeConnection();
      }
    } catch (err) {
      setSyncMessage(`❌ Connection failed: ${err.message}`);
    } finally {
      setTimeout(() => setSyncMessage(''), 5000);
    }
  };

  const canSync = status.online && (
    offlineManager.getPendingCount() > 0 || 
    bluetoothService.getAllSessions().sessions.length > 0
  );

  const pendingCount = offlineManager.getPendingCount() + 
    bluetoothService.getAllSessions().sessions.length;

  return (
    <div className="connection-status-container">
      <div 
        className="connection-status-bar" 
        style={{ backgroundColor: status.color }}
      >
        <div className="status-left">
          <span className="status-icon">{status.icon}</span>
          <span className="status-text">{status.message}</span>
          
          {pendingCount > 0 && (
            <span className="pending-badge">
              {pendingCount} pending
            </span>
          )}
        </div>

        <div className="status-right">
          {canSync && (
            <button 
              className="action-button sync-button"
              onClick={handleSync}
              disabled={syncing}
            >
              {syncing ? '⏳ Syncing...' : '📤 Sync Data'}
            </button>
          )}

          <button 
            className="action-button options-button"
            onClick={() => setShowOptions(!showOptions)}
          >
            ⚙️ Setup
          </button>
        </div>
      </div>

      {syncMessage && (
        <div className="sync-message">{syncMessage}</div>
      )}

      {showOptions && (
        <div className="connection-options">
          <h3>Connection Setup</h3>

          {/* WiFi Hotspot Setup */}
          <div className="option-section">
            <h4>📡 WiFi Hotspot Mode</h4>
            <p>For Teacher: Share your WiFi hotspot</p>
            <p>For Students: Enter teacher's IP address</p>
            <div className="input-group">
              <input
                type="text"
                value={teacherIP}
                onChange={(e) => setTeacherIP(e.target.value)}
                placeholder="192.168.x.x"
                className="ip-input"
              />
              <button onClick={handleWiFiSetup} className="setup-button">
                Set WiFi IP
              </button>
            </div>
            <small>Find IP: Run 'ipconfig' (Windows) or 'ifconfig' (Mac/Linux)</small>
          </div>

          {/* Bluetooth Setup */}
          <div className="option-section">
            <h4>🔵 Bluetooth Mode</h4>
            
            {!bluetoothService.isSupported() && (
              <p className="warning">
                ⚠️ Bluetooth not supported. Use Chrome, Edge, or Opera browser.
              </p>
            )}

            {bluetoothService.isSupported() && (
              <>
                <p>For Teacher: Start Bluetooth advertising</p>
                <button 
                  onClick={handleBluetoothSetup} 
                  className="setup-button bluetooth-button"
                >
                  🔵 Start Bluetooth (Teacher)
                </button>

                <hr />

                <p>For Students: Connect to teacher's device</p>
                <button 
                  onClick={handleConnectBluetooth} 
                  className="setup-button bluetooth-button"
                >
                  🔍 Connect to Teacher (Student)
                </button>

                <small>
                  Note: Bluetooth range is ~10-30 meters. Keep devices close.
                </small>
              </>
            )}
          </div>

          {/* Current Status */}
          <div className="option-section status-info">
            <h4>📊 Current Status</h4>
            <ul>
              <li>🌐 Online: {status.online ? '✅' : '❌'}</li>
              <li>📡 WiFi: {status.wifi ? '✅' : '❌'}</li>
              <li>🔵 Bluetooth: {status.bluetooth ? '✅' : '❌'}</li>
              <li>📦 Pending: {pendingCount} sessions</li>
            </ul>
          </div>

          <button 
            onClick={() => setShowOptions(false)} 
            className="close-button"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus;
