const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const DirectMessage = require('../models/DirectMessage');
const User = require('../models/User');
const auth = require('../middleware/auth');

// ─── Get all conversations for current user ───────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .populate('participants', '-password')
      .populate('lastSender', '-password')
      .sort({ updatedAt: -1 });

    const result = conversations.map((conv) => {
      const c = conv.toObject();
      c.unreadCount = conv.unreadCounts?.get(String(req.user._id)) || 0;
      return c;
    });

    res.json({ conversations: result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Start or get existing conversation ──────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { participantId } = req.body;
    if (!participantId) return res.status(400).json({ message: 'participantId is required' });
    if (String(participantId) === String(req.user._id)) {
      return res.status(400).json({ message: 'Cannot start a conversation with yourself' });
    }

    const otherUser = await User.findById(participantId).select('-password');
    if (!otherUser) return res.status(404).json({ message: 'User not found' });

    if (req.user.blockedUsers.map(String).includes(String(participantId))) {
      return res.status(403).json({ message: 'You have blocked this user' });
    }

    // Find existing conversation between the two users
    let conversation = await Conversation.findOne({
      $and: [
        { participants: req.user._id },
        { participants: participantId },
        { $expr: { $eq: [{ $size: '$participants' }, 2] } },
      ],
    }).populate('participants', '-password');

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user._id, participantId],
      });
      conversation = await Conversation.findById(conversation._id).populate(
        'participants',
        '-password'
      );
    }

    const c = conversation.toObject();
    c.unreadCount = conversation.unreadCounts?.get(String(req.user._id)) || 0;

    res.json({ conversation: c });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Get messages for a conversation (paginated) ─────────────────────────────
router.get('/:id/messages', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      participants: req.user._id,
    });
    if (!conversation) return res.status(403).json({ message: 'Access denied' });

    const { page = 1, limit = 60 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const messages = await DirectMessage.find({ conversation: req.params.id })
      .populate('sender', '-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Reset unread count for this user
    await Conversation.findByIdAndUpdate(req.params.id, {
      [`unreadCounts.${req.user._id}`]: 0,
    });

    res.json({ messages: messages.reverse() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Mark conversation as read ────────────────────────────────────────────────
router.put('/:id/read', auth, async (req, res) => {
  try {
    await Conversation.findOneAndUpdate(
      { _id: req.params.id, participants: req.user._id },
      { [`unreadCounts.${req.user._id}`]: 0 }
    );
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
