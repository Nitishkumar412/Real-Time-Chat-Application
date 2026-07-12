export default function TypingIndicator({ typingUsers }) {
  if (!typingUsers || typingUsers.length === 0) return <div className="typing-bar" />;

  const names =
    typingUsers.length === 1
      ? typingUsers[0].username
      : typingUsers.length === 2
      ? `${typingUsers[0].username} and ${typingUsers[1].username}`
      : `${typingUsers[0].username} and ${typingUsers.length - 1} others`;

  return (
    <div className="typing-bar">
      <div className="typing-dots">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
      <span>
        <strong>{names}</strong>{' '}
        {typingUsers.length === 1 ? 'is' : 'are'} typing…
      </span>
    </div>
  );
}
