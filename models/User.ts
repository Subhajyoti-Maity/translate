import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },

  createdAt: {
    type: Date,
    default: Date.now
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  // Support multiple sessions
  activeSessions: [{
    sessionId: String,
    deviceInfo: String,
    lastActivity: Date,
    createdAt: Date
  }],
  // Allow multiple logins
  allowMultipleLogins: {
    type: Boolean,
    default: true
  }
});

export default mongoose.models.User || mongoose.model('User', userSchema);
