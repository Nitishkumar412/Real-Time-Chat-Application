const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const Room = require('../models/Room');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const DirectMessage = require('../models/DirectMessage');

// In-memory map: userId (string) → { _id, username, avatarColor, isOnline }
const connectedUsers = new Map();

module.exports = (io) => {
  // ─── Auth middleware ────────────────────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('No token'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      const user = await User.findById(decoded.userId).select('-password');
      if (!user) return next(new Error('User not found'));

      socket.user = user;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const u = socket.user;
    console.log(`🔌 Connected: ${u.username}`);

    // ── Personal notification room (always joined) ───────────────────────────
    socket.join(`user_${u._id}`);

    // ── Mark online ──────────────────────────────────────────────────────────
    await User.findByIdAndUpdate(u._id, { isOnline: true });

    connectedUsers.set(String(u._id), {
      _id: u._id,
      username: u.username,
      avatarColor: u.avatarColor,
      isOnline: true,
    });

    socket.emit('online-users-list', Array.from(connectedUsers.values()));

    socket.broadcast.emit('user-status-change', {
      userId: u._id,
      username: u.username,
      avatarColor: u.avatarColor,
      isOnline: true,
    });

    // ════════════════════════════════════════════════
    //  GROUP CHAT EVENTS
    // ════════════════════════════════════════════════

    socket.on('join-room', async ({ roomId }) => {
      socket.join(roomId);
      await Room.findByIdAndUpdate(roomId, { $addToSet: { members: u._id } });

      const sysMsg = await Message.create({
        sender: u._id, room: roomId,
        content: `${u.username} joined the room`, type: 'system',
      });
      const pop = await sysMsg.populate('sender', '-password');
      io.to(roomId).emit('new-message', pop);
    });

    socket.on('leave-room', async ({ roomId }) => {
      socket.leave(roomId);
      const sysMsg = await Message.create({
        sender: u._id, room: roomId,
        content: `${u.username} left the room`, type: 'system',
      });
      const pop = await sysMsg.populate('sender', '-password');
      io.to(roomId).emit('new-message', pop);
    });

    socket.on('send-message', async ({ roomId, content }) => {
      try {
        if (!content?.trim()) return;
        const msg = await Message.create({ sender: u._id, room: roomId, content: content.trim() });
        const pop = await msg.populate('sender', '-password');
        io.to(roomId).emit('new-message', pop);
      } catch {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('typing', ({ roomId }) => {
      socket.to(roomId).emit('user-typing', { userId: u._id, username: u.username });
    });
    socket.on('stop-typing', ({ roomId }) => {
      socket.to(roomId).emit('user-stop-typing', { userId: u._id });
    });

    // ════════════════════════════════════════════════
    //  DIRECT MESSAGE EVENTS
    // ════════════════════════════════════════════════

    // Join a DM conversation room (needed for typing indicators)
    socket.on('join-conversation', ({ conversationId }) => {
      socket.join(`dm_${conversationId}`);
    });

    socket.on('leave-conversation', ({ conversationId }) => {
      socket.leave(`dm_${conversationId}`);
    });

    // Send a direct message
    socket.on('send-dm', async ({ conversationId, content }) => {
      try {
        if (!content?.trim()) return;

        // Verify the sender is a participant
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: u._id,
        });
        if (!conversation) return;

        // Find the other participant
        const otherParticipantId = conversation.participants.find(
          (p) => String(p) !== String(u._id)
        );

        // Save message
        const msg = await DirectMessage.create({
          conversation: conversationId,
          sender: u._id,
          content: content.trim(),
        });
        const populated = await msg.populate('sender', '-password');

        // Update conversation metadata + increment other user's unread count
        const prevUnread = conversation.unreadCounts?.get(String(otherParticipantId)) || 0;
        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: content.trim().substring(0, 80),
          lastSender: u._id,
          [`unreadCounts.${otherParticipantId}`]: prevUnread + 1,
        });

        // Emit new DM to BOTH participants' personal rooms
        // (allows real-time updates even if receiver is in a different room/chat)
        const payload = { conversationId, message: populated };
        io.to(`user_${u._id}`).emit('new-dm', payload);
        io.to(`user_${otherParticipantId}`).emit('new-dm', payload);

      } catch (err) {
        console.error('send-dm error:', err);
        socket.emit('error', { message: 'Failed to send direct message' });
      }
    });

    // DM typing indicators
    socket.on('dm-typing', ({ conversationId }) => {
      socket.to(`dm_${conversationId}`).emit('dm-user-typing', {
        conversationId, userId: u._id, username: u.username,
      });
    });
    socket.on('dm-stop-typing', ({ conversationId }) => {
      socket.to(`dm_${conversationId}`).emit('dm-user-stop-typing', {
        conversationId, userId: u._id,
      });
    });

    // ════════════════════════════════════════════════
    //  DISCONNECT
    // ════════════════════════════════════════════════

    socket.on('disconnect', async () => {
      console.log(`🔌 Disconnected: ${u.username}`);
      await User.findByIdAndUpdate(u._id, { isOnline: false, lastSeen: new Date() });
      connectedUsers.delete(String(u._id));
      socket.broadcast.emit('user-status-change', {
        userId: u._id, username: u.username,
        isOnline: false, lastSeen: new Date(),
      });
    });
  });
};
