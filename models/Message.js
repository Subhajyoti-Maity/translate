const mongoose = require('mongoose');

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
  isRead: {
    type: Boolean,
    default: false
  },
  // WhatsApp-style deletion fields
  deletedFor: {
    type: [String], // Array of user IDs for whom the message is deleted
    default: []
  },
  deletedForEveryone: {
    type: Boolean,
    default: false
  },
  // Add reactions field - Simplified to popular, user-friendly emojis
  reactions: {
    type: Map,
    of: {
      type: String,
      enum: ['👍', '❤️', '😂', '😊', '😢', '😡', '🎉', '👏']
    },
    default: new Map()
  }
});

// Add a virtual for 'id' that maps to '_id'
messageSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

// Ensure virtual fields are serialized
messageSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

// Index for better query performance on deletion fields
messageSchema.index({ deletedFor: 1 });
messageSchema.index({ deletedForEveryone: 1 });
messageSchema.index({ senderId: 1, receiverId: 1 });

module.exports = mongoose.models.Message || mongoose.model('Message', messageSchema);
