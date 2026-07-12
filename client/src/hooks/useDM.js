import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';

export function useDM(currentUser) {
  const { socket } = useSocket();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [dmMessages, setDmMessages] = useState([]);
  const [dmTypingUsers, setDmTypingUsers] = useState([]);

  // Keep a ref to activeConversation for use inside socket callbacks (avoids stale closure)
  const activeConvRef = useRef(null);
  useEffect(() => { activeConvRef.current = activeConversation; }, [activeConversation]);

  const typingTimer = useRef(null);

  // ── Load all conversations ────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    try {
      const { data } = await api.get('/api/conversations');
      setConversations(data.conversations);
    } catch (e) {
      console.error('loadConversations:', e);
    }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Join all DM rooms for typing indicators whenever conversations or socket change
  useEffect(() => {
    if (!socket || conversations.length === 0) return;
    conversations.forEach((conv) => {
      socket.emit('join-conversation', { conversationId: conv._id });
    });
  }, [socket, conversations]);

  // ── Open / start a conversation ──────────────────────────────────────────
  const openConversation = useCallback(async (participantId) => {
    try {
      const { data } = await api.post('/api/conversations', { participantId });
      const conv = data.conversation;

      // Leave previous DM room
      if (activeConvRef.current && socket) {
        socket.emit('leave-conversation', { conversationId: activeConvRef.current._id });
      }

      setActiveConversation(conv);
      setDmMessages([]);
      setDmTypingUsers([]);

      // Load history (also resets unread on server)
      const msgRes = await api.get(`/api/conversations/${conv._id}/messages`);
      setDmMessages(msgRes.data.messages);

      // Join socket room for typing indicators
      if (socket) socket.emit('join-conversation', { conversationId: conv._id });

      // Update or add conversation in sidebar list (reset unread)
      setConversations((prev) => {
        const exists = prev.find((c) => c._id === conv._id);
        if (exists) {
          return prev.map((c) => (c._id === conv._id ? { ...c, unreadCount: 0 } : c));
        }
        return [{ ...conv, unreadCount: 0 }, ...prev];
      });

      return conv;
    } catch (e) {
      console.error('openConversation:', e);
      throw e;
    }
  }, [socket]);

  // ── Send DM ───────────────────────────────────────────────────────────────
  const sendDM = useCallback((content) => {
    if (!socket || !activeConvRef.current || !content.trim()) return;
    socket.emit('send-dm', { conversationId: activeConvRef.current._id, content: content.trim() });
  }, [socket]);

  // ── Typing ────────────────────────────────────────────────────────────────
  const emitDMTyping = useCallback(() => {
    if (!socket || !activeConvRef.current) return;
    socket.emit('dm-typing', { conversationId: activeConvRef.current._id });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit('dm-stop-typing', { conversationId: activeConvRef.current._id });
    }, 2000);
  }, [socket]);

  // ── Clear active conversation (when switching to room) ────────────────────
  const clearConversation = useCallback(() => {
    if (activeConvRef.current && socket) {
      socket.emit('leave-conversation', { conversationId: activeConvRef.current._id });
    }
    setActiveConversation(null);
    setDmMessages([]);
    setDmTypingUsers([]);
  }, [socket]);

  // ── Socket event listeners ────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onNewDM = ({ conversationId, message }) => {
      const active = activeConvRef.current;
      const isActiveConv = active && String(active._id) === String(conversationId);
      const isOwnMessage = String(message.sender?._id) === String(currentUser?._id);

      if (isActiveConv) {
        // Add message to the current open conversation
        setDmMessages((prev) => [...prev, message]);
        // Reset unread on server silently
        api.put(`/api/conversations/${conversationId}/read`).catch(() => {});
      }

      // Update conversation list (last message preview + unread count)
      setConversations((prev) => {
        const exists = prev.find((c) => String(c._id) === String(conversationId));
        const updated = {
          lastMessage: message.content.substring(0, 80),
          lastSender: message.sender,
          updatedAt: message.createdAt,
          // Increment unread only if: not the active conv AND not our own message
          unreadCount: isActiveConv || isOwnMessage
            ? (exists?.unreadCount || 0)
            : (exists?.unreadCount || 0) + 1,
        };
        if (exists) {
          return prev.map((c) =>
            String(c._id) === String(conversationId) ? { ...c, ...updated } : c
          );
        }
        // New conversation arrived – reload the list to get full data
        api.get('/api/conversations')
          .then(({ data }) => setConversations(data.conversations))
          .catch(() => {});
        return prev;
      });
    };

    const onDMTyping = ({ conversationId, userId, username }) => {
      if (activeConvRef.current && String(activeConvRef.current._id) === String(conversationId)) {
        setDmTypingUsers((prev) =>
          prev.find((u) => String(u.userId) === String(userId))
            ? prev
            : [...prev, { userId, username }]
        );
      }
    };

    const onDMStopTyping = ({ conversationId, userId }) => {
      if (activeConvRef.current && String(activeConvRef.current._id) === String(conversationId)) {
        setDmTypingUsers((prev) => prev.filter((u) => String(u.userId) !== String(userId)));
      }
    };

    socket.on('new-dm', onNewDM);
    socket.on('dm-user-typing', onDMTyping);
    socket.on('dm-user-stop-typing', onDMStopTyping);

    return () => {
      socket.off('new-dm', onNewDM);
      socket.off('dm-user-typing', onDMTyping);
      socket.off('dm-user-stop-typing', onDMStopTyping);
    };
  }, [socket, currentUser]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getOtherUser = useCallback(
    (conv) => conv?.participants?.find((p) => String(p._id) !== String(currentUser?._id)),
    [currentUser]
  );

  return {
    conversations, activeConversation, dmMessages, dmTypingUsers,
    loadConversations, openConversation, sendDM, emitDMTyping,
    clearConversation, getOtherUser,
  };
}
