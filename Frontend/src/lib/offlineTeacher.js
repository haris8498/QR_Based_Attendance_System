// Offline-enabled Teacher QR Generation
// Add this to Teacher.jsx

import offlineManager from '../lib/offlineManager';

// Modified generateQR function for offline support
const generateQROffline = async () => {
  if (!selectedCourse) {
    alert('Please select a course');
    return;
  }

  // Get course details
  const course = courses.find(c => c.code === selectedCourse);
  const durationMinutes = 15; // default duration
  const timestamp = Date.now();
  const expiry = timestamp + durationMinutes * 60 * 1000;

  const sessionData = {
    sessionId: `${selectedCourse}-${timestamp}`,
    courseId: selectedCourse,
    courseName: course ? course.name : selectedCourse,
    teacherId: currentUser.username,
    teacherName: currentUser.name,
    timestamp: timestamp,
    expiry: expiry,
    duration: durationMinutes,
    attendance: []
  };

  try {
    // Check connection mode
    const status = offlineManager.getStatus();
    
    if (status.isOfflineMode && status.serverUrl) {
      // Create session on local offline server
      const result = await offlineManager.createSession(sessionData);
      
      if (result.success) {
        // Generate QR data
        const qrData = {
          sessionId: sessionData.sessionId,
          courseId: sessionData.courseId,
          courseName: sessionData.courseName,
          teacherId: sessionData.teacherId,
          teacherName: sessionData.teacherName,
          timestamp: sessionData.timestamp,
          expiry: sessionData.expiry,
          offlineMode: true,
          serverUrl: status.serverUrl
        };

        setCurrentQR(qrData);
        startQRTimer(expiry);
        
        alert('✅ QR Code generated in OFFLINE mode');
      } else {
        alert('Failed to create offline session');
      }
    } else if (!status.isOfflineMode) {
      // Use existing online generateQR logic
      const token = system.getToken();
      const response = await fetch('http://localhost:5000/api/teacher/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          courseId: selectedCourse,
          durationMinutes: durationMinutes
        })
      });

      const data = await response.json();
      if (response.ok && data.qr) {
        setCurrentQR(data.qr);
        startQRTimer(data.qr.expiry);
        alert('✅ QR Code generated (ONLINE mode)');
      }
    } else {
      alert('❌ No connection available. Please configure offline server IP.');
    }
  } catch (err) {
    console.error('QR Generation error:', err);
    alert('Error generating QR code: ' + err.message);
  }
};

// Export for use in Teacher.jsx
export { generateQROffline };
