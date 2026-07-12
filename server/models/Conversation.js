const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    // Exactly 2 participants for 1-to-1 DM
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    lastMessage: { type: String, default: '' },
    lastSender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // Per-user unread counts stored as { "userId": count }
    unreadCounts: { type: Map, of: Number, default: {} },
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);
