const express = require('express');
const router = express.Router();
const { authMiddleware, permit } = require('../middleware/auth');
const OfflineSession = require('../models/OfflineSession');
const ClassSession = require('../models/ClassSession');
const Attendance = require('../models/Attendance');
const Course = require('../models/Course');
const User = require('../models/User');

// POST /api/offline/sync - Sync offline data when internet returns
router.post('/sync', authMiddleware, permit('teacher'), async (req, res) => {
  try {
    const { sessions } = req.body;
    
    if (!sessions || !Array.isArray(sessions)) {
      return res.status(400).json({ message: 'Sessions array required' });
    }

    const results = {
      synced: 0,
      failed: 0,
      errors: []
    };

    for (const sessionData of sessions) {
      try {
        // Check if session already exists
        const existing = await OfflineSession.findOne({ sessionId: sessionData.sessionId });
        if (existing && existing.synced) {
          continue; // Already synced
        }

        // Create ClassSession
        const classSession = new ClassSession({
          courseId: sessionData.courseId,
          courseName: sessionData.courseName,
          teacherId: sessionData.teacherId,
          teacherName: sessionData.teacherName,
          timestamp: new Date(sessionData.timestamp),
          expiry: sessionData.expiry,
          active: false // Expired by now
        });
        await classSession.save();

        // Create Attendance records
        const date = new Date(sessionData.timestamp).toISOString().split('T')[0];
        
        for (const att of sessionData.attendance) {
          // Check if already exists
          const existingAtt = await Attendance.findOne({
            studentId: att.studentId,
            courseId: sessionData.courseId,
            sessionTimestamp: sessionData.timestamp
          });

          if (!existingAtt) {
            const attendance = new Attendance({
              studentId: att.studentId,
              studentName: att.studentName,
              rollNo: att.rollNo,
              courseId: sessionData.courseId,
              courseName: sessionData.courseName,
              teacherId: sessionData.teacherId,
              teacherName: sessionData.teacherName,
              date: date,
              timestamp: new Date(att.timestamp),
              sessionTimestamp: sessionData.timestamp,
              status: att.status || 'present'
            });
            await attendance.save();
          }
        }

        // Save or update OfflineSession as synced
        if (existing) {
          existing.synced = true;
          await existing.save();
        } else {
          const offlineSession = new OfflineSession({
            ...sessionData,
            synced: true
          });
          await offlineSession.save();
        }

        results.synced++;
      } catch (err) {
        console.error('Error syncing session:', err);
        results.failed++;
        results.errors.push({ sessionId: sessionData.sessionId, error: err.message });
      }
    }

    res.json({
      message: 'Sync completed',
      results
    });

  } catch (err) {
    console.error('Sync error:', err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/offline/pending - Get pending offline sessions for a teacher
router.get('/pending', authMiddleware, permit('teacher'), async (req, res) => {
  try {
    const teacherId = req.user.username;
    const pending = await OfflineSession.find({
      teacherId,
      synced: false
    }).lean();

    res.json({ sessions: pending });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
