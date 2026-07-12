export default function MessageBubble({ message, isOwn }) {
  if (message.type === 'system') {
    return (
      <div className="msg-wrap system">
        <span className="system-msg">✦ {message.content}</span>
      </div>
    );
  }

  const time = new Date(message.createdAt).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className={`msg-wrap ${isOwn ? 'own' : ''}`}>
      {/* Avatar (only for others) */}
      {!isOwn ? (
        <div
          className="avatar avatar-sm"
          style={{ background: message.sender?.avatarColor || '#7c3aed' }}
        >
          {message.sender?.username?.[0]?.toUpperCase()}
        </div>
      ) : (
        <div className="msg-avatar-spacer" />
      )}

      <div className="msg-group">
        {!isOwn && (
          <div className="msg-sender">{message.sender?.username}</div>
        )}
        <div className={`msg-bubble ${isOwn ? 'own' : 'other'}`}>
          {message.content}
        </div>
        <div className="msg-time">{time}</div>
      </div>
    </div>
  );
}
