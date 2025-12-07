const mongoose = require('mongoose');

// Model to store offline sessions created by teachers
const OfflineSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  courseId: { type: String, required: true },
  courseName: { type: String },
  teacherId: { type: String, required: true },
  teacherName: { type: String },
  timestamp: { type: Number, required: true }, // Session creation time
  expiry: { type: Number, required: true }, // Expiry time in ms
  active: { type: Boolean, default: true },
  synced: { type: Boolean, default: false }, // Whether synced to main DB
  createdOffline: { type: Boolean, default: true },
  attendance: [{ // Embedded attendance records
    studentId: String,
    studentName: String,
    rollNo: String,
    timestamp: Number,
    status: { type: String, default: 'present' }
  }]
}, { timestamps: true });

module.exports = mongoose.model('OfflineSession', OfflineSessionSchema);
