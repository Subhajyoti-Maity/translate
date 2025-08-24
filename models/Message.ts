import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiverId: {
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
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedFor: {
    type: [String], // Array of user IDs for whom the message is deleted
    default: []
  },
  // Add reactions field
  reactions: {
    type: Map,
    of: {
      type: String,
      enum: ['👍', '❤️', '😂', '😊', '😮', '😢', '😡', '🎉']
    },
    default: new Map()
  }
});

export default mongoose.models.Message || mongoose.model('Message', messageSchema);
