export default function Sidebar({
  rooms, activeRoom, onRoomSelect,
  onlineUsers,
  conversations, activeConversation, onConversationSelect, getOtherUser,
  user, connected,
  onSettingsOpen, onSearchOpen, onCreateRoom,
}) {
  const onlineCount = onlineUsers.filter((u) => u.isOnline).length;
  const totalUnread = conversations.reduce((s, c) => s + (c.unreadCount || 0), 0);

  // Format last-message time
  const fmtTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diffH = (now - d) / 3600000;
    if (diffH < 24) return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <aside className="sidebar">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">💬</div>
          <span className="sidebar-logo-text">ChatFlow</span>
        </div>
        <div className="sidebar-header-actions">
          <button id="btn-search-users" className="icon-btn" title="Search / find users" onClick={onSearchOpen}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────── */}
      <div className="sidebar-body">

        {/* ── Channels section ──────────────────────────────────────── */}
        <div className="sidebar-section">
          <div className="sidebar-section-hdr">
            <span className="sidebar-section-title">Channels</span>
            <button id="btn-create-room" className="sidebar-section-add" title="Create channel" onClick={onCreateRoom}>+</button>
          </div>

          {rooms.map((room) => (
            <div
              key={room._id}
              id={`room-${room.name}`}
              className={`room-item ${activeRoom?._id === room._id ? 'active' : ''}`}
              onClick={() => onRoomSelect(room)}
            >
              <span className="room-emoji">{room.emoji || '💬'}</span>
              <span className="room-name">{room.name}</span>
            </div>
          ))}
        </div>

        {/* ── Direct Messages section ────────────────────────────────── */}
        <div className="sidebar-section">
          <div className="sidebar-section-hdr">
            <span className="sidebar-section-title">
              Direct Messages
              {totalUnread > 0 && (
                <span className="dm-unread-total">{totalUnread > 99 ? '99+' : totalUnread}</span>
              )}
            </span>
            <button
              id="btn-new-dm"
              className="sidebar-section-add"
              title="New direct message"
              onClick={onSearchOpen}
            >
              +
            </button>
          </div>

          {conversations.length === 0 && (
            <p className="sidebar-empty-hint">
              Click <strong>+</strong> to message someone
            </p>
          )}

          {conversations.map((conv) => {
            const other = getOtherUser(conv);
            if (!other) return null;
            const isActive = activeConversation?._id === conv._id;
            const isOnline = onlineUsers.some(
              (u) => String(u._id) === String(other._id) && u.isOnline
            );

            return (
              <div
                key={conv._id}
                id={`dm-${other._id}`}
                className={`dm-item ${isActive ? 'active' : ''}`}
                onClick={() => onConversationSelect(conv)}
              >
                <div className="avatar avatar-sm" style={{ background: other.avatarColor || '#7c3aed' }}>
                  {other.username?.[0]?.toUpperCase()}
                  <span className={`online-dot ${isOnline ? '' : 'offline'}`} />
                </div>

                <div className="dm-item-info">
                  <div className="dm-item-top">
                    <span className="dm-item-name">{other.username}</span>
                    {conv.updatedAt && (
                      <span className="dm-item-time">{fmtTime(conv.updatedAt)}</span>
                    )}
                  </div>
                  {conv.lastMessage && (
                    <div className="dm-item-preview">
                      {conv.lastMessage}
                    </div>
                  )}
                </div>

                {conv.unreadCount > 0 && (
                  <span className="dm-badge">{conv.unreadCount > 99 ? '99+' : conv.unreadCount}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Online users section ───────────────────────────────────── */}
        <div className="sidebar-section">
          <div className="sidebar-section-hdr">
            <span className="sidebar-section-title">Online — {onlineCount}</span>
          </div>

          {onlineUsers.filter((u) => u.isOnline).map((u) => (
            <div
              key={u._id}
              className="user-item"
              style={{ cursor: 'pointer' }}
              // onClick={() => onSearchOpen()}
              title={`Message ${u.username}`}
            >
              <div className="avatar avatar-sm" style={{ background: u.avatarColor || '#7c3aed' }}>
                {u.username?.[0]?.toUpperCase()}
                <span className="online-dot" />
              </div>
              <span className="user-name">{u.username}</span>
            </div>
          ))}

          {onlineUsers.filter((u) => u.isOnline).length === 0 && (
            <p style={{ padding: '6px 14px', fontSize: 12, color: 'var(--text-3)' }}>No one online yet</p>
          )}
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <div className="sidebar-footer">
        <div className="avatar avatar-md" style={{ background: user?.avatarColor || '#7c3aed' }}>
          {user?.username?.[0]?.toUpperCase()}
          <span className={`online-dot ${connected ? '' : 'offline'}`} />
        </div>
        <div className="sidebar-footer-info">
          <div className="sidebar-footer-name">{user?.username}</div>
          <div className="sidebar-footer-status">{connected ? '● Online' : '○ Connecting…'}</div>
        </div>
        <button id="btn-open-settings" className="icon-btn" title="Settings" onClick={onSettingsOpen}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </div>
    </aside>
  );
}
