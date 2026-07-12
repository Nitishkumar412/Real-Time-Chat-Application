import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';

function groupByDate(messages) {
  const items = [];
  let lastLabel = null;
  for (const msg of messages) {
    const label = new Date(msg.createdAt).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
    });
    if (label !== lastLabel) { items.push({ type: 'date', label }); lastLabel = label; }
    items.push({ type: 'message', data: msg });
  }
  return items;
}

// ─── Empty / welcome screen ─────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="chat-main">
      <div className="chat-empty">
        <div className="chat-empty-icon">💬</div>
        <h2 className="chat-empty-title">Welcome to ChatFlow</h2>
        <p className="chat-empty-desc">
          Pick a channel on the left to group-chat, or click <strong>+</strong> next to Direct Messages to start a private conversation.
        </p>
      </div>
    </div>
  );
}

// ─── Room header ──────────────────────────────────────────────────────────────
function RoomHeader({ room, messageCount }) {
  return (
    <div className="chat-header">
      <span className="chat-header-emoji">{room.emoji || '💬'}</span>
      <div className="chat-header-info">
        <div className="chat-header-name">{room.name}</div>
        {room.description && <div className="chat-header-desc">{room.description}</div>}
      </div>
      <div className="chat-header-right">
        <div className="members-chip">
          <span className="members-dot" />
          {messageCount} messages
        </div>
      </div>
    </div>
  );
}

// ─── DM header ────────────────────────────────────────────────────────────────
function DMHeader({ otherUser, isOtherOnline }) {
  return (
    <div className="chat-header">
      <div className="dm-header-avatar">
        <div
          className="avatar avatar-md"
          style={{ background: otherUser?.avatarColor || '#7c3aed' }}
        >
          {otherUser?.username?.[0]?.toUpperCase()}
          <span className={`online-dot ${isOtherOnline ? '' : 'offline'}`} />
        </div>
      </div>
      <div className="chat-header-info">
        <div className="chat-header-name">{otherUser?.username}</div>
        <div className="chat-header-desc" style={{ color: isOtherOnline ? 'var(--online)' : 'var(--text-3)' }}>
          {isOtherOnline ? '● Online' : '○ Offline'}
        </div>
      </div>
      <div className="chat-header-right">
        <div className="members-chip dm-chip">
          <span style={{ fontSize: 12 }}>🔒</span>
          Private chat
        </div>
      </div>
    </div>
  );
}

// ─── Main ChatWindow ──────────────────────────────────────────────────────────
export default function ChatWindow({
  mode,
  activeRoom, otherUser, isOtherOnline,
  messages, typingUsers, user,
  onSend, onTyping,
}) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  // No chat selected
  if (!mode || (mode === 'room' && !activeRoom) || (mode === 'dm' && !otherUser)) {
    return <EmptyState />;
  }

  const items = groupByDate(messages);
  const placeholder = mode === 'dm'
    ? `Message ${otherUser?.username}…`
    : `Message #${activeRoom?.name}…`;

  return (
    <div className="chat-main">
      {/* Header */}
      {mode === 'room' ? (
        <RoomHeader room={activeRoom} messageCount={messages.length} />
      ) : (
        <DMHeader otherUser={otherUser} isOtherOnline={isOtherOnline} />
      )}

      {/* Messages */}
      <div className="messages-area" id="messages-area">
        {items.length === 0 && (
          <div className="messages-empty">
            {mode === 'dm' ? (
              <>
                <div style={{ fontSize: 48, marginBottom: 12 }}>👋</div>
                <p>Say hi to <strong>{otherUser?.username}</strong>! This is the start of your private conversation.</p>
              </>
            ) : (
              <p>No messages yet. Be the first to say something! 👋</p>
            )}
          </div>
        )}

        {items.map((item, i) =>
          item.type === 'date' ? (
            <div key={`d-${i}`} className="date-divider">
              <span className="date-divider-text">{item.label}</span>
            </div>
          ) : (
            <MessageBubble
              key={item.data._id}
              message={item.data}
              isOwn={String(item.data.sender?._id) === String(user?._id)}
            />
          )
        )}

        <TypingIndicator typingUsers={typingUsers} />
        <div ref={endRef} />
      </div>

      {/* Input */}
      <MessageInput onSend={onSend} onTyping={onTyping} placeholder={placeholder} />
    </div>
  );
}
