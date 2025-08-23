import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  isRead: {
    type: Boolean,
    default: false
  },
  // Track which users have deleted this message (for "Delete for Me")
  deletedFor: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Track if message is deleted for everyone (for "Delete for Everyone")
  deletedForEveryone: {
    type: Boolean,
    default: false
  }
});

export default mongoose.models.Message || mongoose.model('Message', messageSchema);
