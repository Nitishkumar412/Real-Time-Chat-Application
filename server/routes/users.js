const express = require('express');
const User = require('../models/User');
const Message = require('../models/Message');
const auth = require('../middleware/auth');

const router = express.Router();

// ─── Search users ─────────────────────────────────────────────────────────────
router.get('/search', auth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 1) return res.json({ users: [] });

    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [
        { username: { $regex: q.trim(), $options: 'i' } },
        { email: { $regex: q.trim(), $options: 'i' } },
      ],
    })
      .select('-password')
      .limit(20);

    // Mark which users are blocked by the current user
    const result = users.map((u) => ({
      ...u.toJSON(),
      isBlocked: req.user.blockedUsers.map(String).includes(String(u._id)),
    }));

    res.json({ users: result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Get all users (contacts) ────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } })
      .select('-password')
      .limit(100);
    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Update username ──────────────────────────────────────────────────────────
router.put('/profile', auth, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username || username.trim().length < 2) {
      return res.status(400).json({ message: 'Username must be at least 2 characters' });
    }

    const taken = await User.findOne({
      username: username.trim(),
      _id: { $ne: req.user._id },
    });
    if (taken) return res.status(400).json({ message: 'Username already taken' });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { username: username.trim() },
      { new: true }
    ).select('-password');

    res.json({ user, message: 'Username updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Block / Unblock user ─────────────────────────────────────────────────────
router.post('/block/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    if (userId === String(req.user._id)) {
      return res.status(400).json({ message: 'You cannot block yourself' });
    }

    const target = await User.findById(userId);
    if (!target) return res.status(404).json({ message: 'User not found' });

    const isBlocked = req.user.blockedUsers.map(String).includes(userId);

    if (isBlocked) {
      await User.findByIdAndUpdate(req.user._id, { $pull: { blockedUsers: userId } });
      res.json({ message: `${target.username} unblocked`, blocked: false });
    } else {
      await User.findByIdAndUpdate(req.user._id, { $addToSet: { blockedUsers: userId } });
      res.json({ message: `${target.username} blocked`, blocked: true });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Delete account ───────────────────────────────────────────────────────────
router.delete('/account', auth, async (req, res) => {
  try {
    // Delete user's messages
    await Message.deleteMany({ sender: req.user._id });
    // Delete user
    await User.findByIdAndDelete(req.user._id);
    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
