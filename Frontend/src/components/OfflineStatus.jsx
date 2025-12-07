import React, { useState, useEffect } from 'react';
import offlineManager from '../lib/offlineManager';
import './OfflineStatus.css';

const OfflineStatus = () => {
  const [status, setStatus] = useState({
    isOfflineMode: false,
    serverUrl: '',
    pendingCount: 0,
    canSync: false
  });
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [teacherIP, setTeacherIP] = useState('');
  const [showIPInput, setShowIPInput] = useState(false);

  useEffect(() => {
    // Initial status
    updateStatus();

    // Listen for status changes
    const handleStatusChange = (newStatus) => {
      console.log('Connection status changed:', newStatus);
      updateStatus();
    };

    offlineManager.addListener(handleStatusChange);

    // Check status every 10 seconds
    const interval = setInterval(() => {
      offlineManager.checkConnectionStatus();
    }, 10000);

    return () => {
      offlineManager.removeListener(handleStatusChange);
      clearInterval(interval);
    };
  }, []);

  const updateStatus = () => {
    setStatus(offlineManager.getStatus());
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage('Syncing...');
    
    try {
      const result = await offlineManager.syncPendingSessions();
      
      if (result.success !== false) {
        setSyncMessage(`✅ Synced ${result.results?.synced || 0} sessions successfully`);
        updateStatus();
      } else {
        setSyncMessage(`❌ Sync failed: ${result.message}`);
      }
    } catch (err) {
      setSyncMessage(`❌ Error: ${err.message}`);
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(''), 5000);
    }
  };

  const handleSetIP = () => {
    if (teacherIP) {
      offlineManager.setLocalServerIP(teacherIP);
      setShowIPInput(false);
      setSyncMessage('✅ Teacher IP saved');
      setTimeout(() => setSyncMessage(''), 3000);
      offlineManager.checkConnectionStatus();
    }
  };

  const getStatusColor = () => {
    if (!status.isOfflineMode) return '#10b981'; // green
    if (status.serverUrl?.includes('3030')) return '#f59e0b'; // orange (local)
    return '#ef4444'; // red (offline)
  };

  const getStatusText = () => {
    if (!status.isOfflineMode) return '🟢 Online';
    if (status.serverUrl?.includes('3030')) return '🟠 Offline Mode (Local)';
    return '🔴 Offline';
  };

  return (
    <div className="offline-status-container">
      <div className="offline-status-bar" style={{ backgroundColor: getStatusColor() }}>
        <div className="status-left">
          <span className="status-indicator">{getStatusText()}</span>
          {status.pendingCount > 0 && (
            <span className="pending-badge">
              {status.pendingCount} sessions pending
            </span>
          )}
        </div>
        
        <div className="status-right">
          {status.canSync && (
            <button 
              className="sync-button"
              onClick={handleSync}
              disabled={syncing}
            >
              {syncing ? '⏳ Syncing...' : '📤 Upload Data'}
            </button>
          )}
          
          {status.isOfflineMode && !status.serverUrl && (
            <button 
              className="config-button"
              onClick={() => setShowIPInput(!showIPInput)}
            >
              ⚙️ Configure
            </button>
          )}
        </div>
      </div>

      {syncMessage && (
        <div className="sync-message">{syncMessage}</div>
      )}

      {showIPInput && (
        <div className="ip-input-container">
          <label>
            Teacher's IP Address (for students):
            <input
              type="text"
              value={teacherIP}
              onChange={(e) => setTeacherIP(e.target.value)}
              placeholder="192.168.x.x"
              className="ip-input"
            />
          </label>
          <button onClick={handleSetIP} className="set-ip-button">
            Set IP
          </button>
          <button onClick={() => setShowIPInput(false)} className="cancel-button">
            Cancel
          </button>
        </div>
      )}

      <div className="status-info">
        <small>Server: {status.serverUrl || 'Not connected'}</small>
      </div>
    </div>
  );
};

export default OfflineStatus;
