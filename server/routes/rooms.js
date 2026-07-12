const express = require('express');
const Room = require('../models/Room');
const Message = require('../models/Message');
const auth = require('../middleware/auth');

const router = express.Router();

// ─── List all public rooms ────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const rooms = await Room.find({ isPrivate: false }).sort({ createdAt: 1 });
    res.json({ rooms });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Create room ──────────────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, emoji = '💬' } = req.body;

    if (!name) return res.status(400).json({ message: 'Room name is required' });

    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const existing = await Room.findOne({ name: slug });
    if (existing) return res.status(400).json({ message: 'Room already exists' });

    const room = await Room.create({
      name: slug,
      description,
      emoji,
      createdBy: req.user._id,
      members: [req.user._id],
    });

    res.status(201).json({ room });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Get messages for a room (paginated) ────────────────────────────────────
router.get('/:id/messages', auth, async (req, res) => {
  try {
    const { page = 1, limit = 60 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const messages = await Message.find({ room: req.params.id })
      .populate('sender', '-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.json({ messages: messages.reverse() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
