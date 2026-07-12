import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useChat } from '../hooks/useChat';
import { useDM } from '../hooks/useDM';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import SettingsModal from '../components/SettingsModal';
import SearchUsers from '../components/SearchUsers';
import CreateRoomModal from '../components/CreateRoomModal';
import Toast from '../components/Toast';

export default function ChatPage() {
  const { user } = useAuth();
  const { connected } = useSocket();

  // ── Group chat ─────────────────────────────────────────────────────────────
  const {
    rooms, activeRoom, messages, typingUsers, onlineUsers,
    joinRoom, sendMessage, emitTyping, loadRooms,
  } = useChat();

  // ── Direct messages ─────────────────────────────────────────────────────────
  const {
    conversations, activeConversation, dmMessages, dmTypingUsers,
    openConversation, sendDM, emitDMTyping, clearConversation, getOtherUser,
  } = useDM(user);

  // ── Chat mode: 'room' | 'dm' | null ────────────────────────────────────────
  const [chatMode, setChatMode] = useState(null);

  // ── Modals & toasts ─────────────────────────────────────────────────────────
  const [showSettings, setShowSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  };

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleRoomSelect = (room) => {
    clearConversation();
    setChatMode('room');
    joinRoom(room);
  };

  const handleOpenDM = async (participantId) => {
    try {
      await openConversation(participantId);
      setChatMode('dm');
    } catch (err) {
      addToast(err?.response?.data?.message || 'Could not open conversation', 'error');
    }
  };

  const handleConversationSelect = (conv) => {
    const otherUser = getOtherUser(conv);
    if (otherUser) handleOpenDM(otherUser._id);
  };

  // ── Derive current chat data based on mode ────────────────────────────────
  const currentMessages   = chatMode === 'dm' ? dmMessages   : messages;
  const currentTyping     = chatMode === 'dm' ? dmTypingUsers : typingUsers;
  const currentSend       = chatMode === 'dm' ? sendDM       : sendMessage;
  const currentEmitTyping = chatMode === 'dm' ? emitDMTyping : emitTyping;

  // Other user in DM (for header)
  const dmOtherUser = chatMode === 'dm' && activeConversation
    ? getOtherUser(activeConversation)
    : null;
  const dmOtherOnline = dmOtherUser
    ? onlineUsers.some((u) => String(u._id) === String(dmOtherUser._id) && u.isOnline)
    : false;

  return (
    <div className="chat-layout">
      <Sidebar
        rooms={rooms}
        activeRoom={chatMode === 'room' ? activeRoom : null}
        onRoomSelect={handleRoomSelect}
        onlineUsers={onlineUsers}
        conversations={conversations}
        activeConversation={chatMode === 'dm' ? activeConversation : null}
        onConversationSelect={handleConversationSelect}
        getOtherUser={getOtherUser}
        user={user}
        connected={connected}
        onSettingsOpen={() => setShowSettings(true)}
        onSearchOpen={() => setShowSearch(true)}
        onCreateRoom={() => setShowCreate(true)}
      />

      <ChatWindow
        mode={chatMode}
        // Room mode props
        activeRoom={chatMode === 'room' ? activeRoom : null}
        // DM mode props
        otherUser={dmOtherUser}
        isOtherOnline={dmOtherOnline}
        // Common props
        messages={currentMessages}
        typingUsers={currentTyping}
        user={user}
        onSend={currentSend}
        onTyping={currentEmitTyping}
      />

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} onToast={addToast} />
      )}
      {showSearch && (
        <SearchUsers
          onClose={() => setShowSearch(false)}
          onToast={addToast}
          onStartDM={(uid) => { setShowSearch(false); handleOpenDM(uid); }}
        />
      )}
      {showCreate && (
        <CreateRoomModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { loadRooms(); setShowCreate(false); }}
          onToast={addToast}
        />
      )}

      <Toast toasts={toasts} />
    </div>
  );
}
