import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';

export function useChat() {
  const { socket } = useSocket();
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const typingTimer = useRef(null);

  // ── Load rooms ──────────────────────────────────────────────────────────────
  const loadRooms = useCallback(async () => {
    try {
      const { data } = await api.get('/api/rooms');
      setRooms(data.rooms);
    } catch (e) {
      console.error('loadRooms:', e);
    }
  }, []);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  // ── Join room ───────────────────────────────────────────────────────────────
  const joinRoom = useCallback(async (room) => {
    if (!socket) return;
    if (activeRoom?._id === room._id) return;

    if (activeRoom) socket.emit('leave-room', { roomId: activeRoom._id });

    setActiveRoom(room);
    setMessages([]);
    setTypingUsers([]);

    // Load history
    try {
      const { data } = await api.get(`/api/rooms/${room._id}/messages`);
      setMessages(data.messages);
    } catch (e) { console.error('loadMessages:', e); }

    socket.emit('join-room', { roomId: room._id });
  }, [socket, activeRoom]);

  // ── Send message ────────────────────────────────────────────────────────────
  const sendMessage = useCallback((content) => {
    if (!socket || !activeRoom || !content.trim()) return;
    socket.emit('send-message', { roomId: activeRoom._id, content });
  }, [socket, activeRoom]);

  // ── Typing ──────────────────────────────────────────────────────────────────
  const emitTyping = useCallback(() => {
    if (!socket || !activeRoom) return;
    socket.emit('typing', { roomId: activeRoom._id });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit('stop-typing', { roomId: activeRoom._id });
    }, 2000);
  }, [socket, activeRoom]);

  // ── Socket event listeners ──────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onOnlineList = (users) => setOnlineUsers(users);

    const onStatusChange = ({ userId, isOnline, username, avatarColor, lastSeen }) => {
      setOnlineUsers((prev) => {
        if (isOnline) {
          if (prev.find((u) => String(u._id) === String(userId))) return prev;
          return [...prev, { _id: userId, username, avatarColor, isOnline: true }];
        }
        return prev.map((u) =>
          String(u._id) === String(userId) ? { ...u, isOnline: false, lastSeen } : u
        );
      });
    };

    const onNewMessage = (msg) => setMessages((prev) => [...prev, msg]);

    const onTyping = ({ userId, username }) => {
      setTypingUsers((prev) =>
        prev.find((u) => String(u.userId) === String(userId))
          ? prev
          : [...prev, { userId, username }]
      );
    };

    const onStopTyping = ({ userId }) => {
      setTypingUsers((prev) => prev.filter((u) => String(u.userId) !== String(userId)));
    };

    socket.on('online-users-list', onOnlineList);
    socket.on('user-status-change', onStatusChange);
    socket.on('new-message', onNewMessage);
    socket.on('user-typing', onTyping);
    socket.on('user-stop-typing', onStopTyping);

    return () => {
      socket.off('online-users-list', onOnlineList);
      socket.off('user-status-change', onStatusChange);
      socket.off('new-message', onNewMessage);
      socket.off('user-typing', onTyping);
      socket.off('user-stop-typing', onStopTyping);
    };
  }, [socket]);

  return {
    rooms, activeRoom, messages, typingUsers, onlineUsers,
    joinRoom, sendMessage, emitTyping, loadRooms,
  };
}
