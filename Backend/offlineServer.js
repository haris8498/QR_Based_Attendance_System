const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

/**
 * Local Offline Server for P2P Communication
 * Teacher runs this on their device with WiFi hotspot enabled
 * Students connect to teacher's hotspot and access this server
 */

class OfflineServer {
  constructor(port = 3030) {
    this.port = port;
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    // In-memory storage for offline sessions
    this.sessions = new Map();
    this.attendanceRecords = new Map();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketIO();
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
  }

  setupRoutes() {
    // Health check
    this.app.get('/api/offline/status', (req, res) => {
      res.json({ 
        status: 'online', 
        mode: 'offline-local',
        sessions: this.sessions.size,
        attendance: this.attendanceRecords.size
      });
    });

    // Create offline session (Teacher)
    this.app.post('/api/offline/session/create', (req, res) => {
      try {
        const { sessionId, courseId, courseName, teacherId, teacherName, expiry, timestamp } = req.body;
        
        const session = {
          sessionId,
          courseId,
          courseName,
          teacherId,
          teacherName,
          expiry,
          timestamp,
          active: true,
          attendance: []
        };

        this.sessions.set(sessionId, session);
        this.attendanceRecords.set(sessionId, []);

        // Broadcast to all connected clients
        this.io.emit('session-created', session);

        res.json({ 
          success: true, 
          session,
          message: 'Session created in offline mode'
        });
      } catch (err) {
        res.status(500).json({ message: err.message });
      }
    });

    // Get active sessions
    this.app.get('/api/offline/sessions/active', (req, res) => {
      const activeSessions = Array.from(this.sessions.values())
        .filter(s => s.active && Date.now() < s.expiry);
      res.json({ sessions: activeSessions });
    });

    // Mark attendance (Student)
    this.app.post('/api/offline/attendance/mark', (req, res) => {
      try {
        const { sessionId, studentId, studentName, rollNo, timestamp } = req.body;

        const session = this.sessions.get(sessionId);
        if (!session) {
          return res.status(404).json({ message: 'Session not found' });
        }

        if (!session.active || Date.now() > session.expiry) {
          return res.status(400).json({ message: 'Session expired or inactive' });
        }

        // Check if already marked
        const attendance = this.attendanceRecords.get(sessionId) || [];
        const existing = attendance.find(a => a.studentId === studentId);
        
        if (existing) {
          return res.status(400).json({ message: 'Attendance already marked' });
        }

        const record = {
          studentId,
          studentName,
          rollNo,
          timestamp,
          status: 'present'
        };

        attendance.push(record);
        this.attendanceRecords.set(sessionId, attendance);
        
        // Add to session
        session.attendance.push(record);

        // Broadcast to teacher
        this.io.emit('attendance-marked', {
          sessionId,
          student: record,
          totalAttendance: attendance.length
        });

        res.json({ 
          success: true, 
          message: 'Attendance marked successfully',
          record
        });
      } catch (err) {
        res.status(500).json({ message: err.message });
      }
    });

    // Get attendance for a session (Teacher)
    this.app.get('/api/offline/attendance/:sessionId', (req, res) => {
      const { sessionId } = req.params;
      const attendance = this.attendanceRecords.get(sessionId) || [];
      const session = this.sessions.get(sessionId);
      
      res.json({ 
        session,
        attendance,
        count: attendance.length 
      });
    });

    // Get all sessions for export (Teacher)
    this.app.get('/api/offline/export/all', (req, res) => {
      const allData = {
        sessions: Array.from(this.sessions.values()),
        timestamp: Date.now()
      };
      res.json(allData);
    });

    // Clear synced data
    this.app.post('/api/offline/clear', (req, res) => {
      const { sessionIds } = req.body;
      
      if (sessionIds && Array.isArray(sessionIds)) {
        sessionIds.forEach(id => {
          this.sessions.delete(id);
          this.attendanceRecords.delete(id);
        });
      }

      res.json({ 
        success: true, 
        message: 'Data cleared',
        remaining: this.sessions.size
      });
    });
  }

  setupSocketIO() {
    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      socket.on('join-session', (sessionId) => {
        socket.join(sessionId);
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });
  }

  start() {
    this.server.listen(this.port, '0.0.0.0', () => {
      console.log(`🔌 Offline Server running on port ${this.port}`);
      console.log(`📱 Students can connect to: http://<teacher-ip>:${this.port}`);
      console.log(`📡 Make sure WiFi Hotspot is enabled`);
    });
  }

  stop() {
    this.server.close();
  }
}

// Export for use in main server or standalone
module.exports = OfflineServer;

// If run directly
if (require.main === module) {
  const server = new OfflineServer(3030);
  server.start();
}
