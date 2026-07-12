import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export default function SearchUsers({ onClose, onToast, onStartDM }) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // userId of pending action

  const search = useCallback(async (q) => {
    if (!q.trim()) { setUsers([]); return; }
    setLoading(true);
    try {
      const { data } = await api.get(`/api/users/search?q=${encodeURIComponent(q.trim())}`);
      setUsers(data.users);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 350);
    return () => clearTimeout(t);
  }, [query, search]);

  const toggleBlock = async (userId, isBlocked, username) => {
    setActionLoading(`block-${userId}`);
    try {
      const { data } = await api.post(`/api/users/block/${userId}`);
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, isBlocked: data.blocked } : u))
      );
      onToast(
        data.blocked ? `${username} blocked` : `${username} unblocked`,
        data.blocked ? 'error' : 'success'
      );
    } catch {
      onToast('Action failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const startDM = (userId) => {
    onStartDM?.(userId);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" id="search-modal">
        <div className="modal-header">
          <span className="modal-title">🔍 Find People</span>
          <button id="close-search" className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Search input */}
        <div className="search-input-wrap">
          <span className="search-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            id="user-search-input"
            className="search-field"
            type="text"
            placeholder="Search by username or email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {query && (
            <button
              style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 16 }}
              onClick={() => setQuery('')}
            >✕</button>
          )}
        </div>

        <div className="search-results">
          {loading && <div className="search-empty">Searching…</div>}
          {!loading && query && users.length === 0 && (
            <div className="search-empty">No users found for "{query}"</div>
          )}
          {!loading && !query && (
            <div className="search-empty">Type a username or email to find people</div>
          )}

          {users.map((u) => (
            <div key={u._id} className="search-user-item">
              <div className="avatar avatar-md" style={{ background: u.avatarColor || '#7c3aed' }}>
                {u.username?.[0]?.toUpperCase()}
                {u.isOnline && <span className="online-dot" />}
              </div>

              <div className="search-user-info">
                <div className="search-user-name">{u.username}</div>
                <div className="search-user-email">{u.email}</div>
              </div>

              {/* Action buttons */}
              <div className="search-user-actions">
                {/* Message button */}
                {!u.isBlocked && (
                  <button
                    id={`msg-btn-${u._id}`}
                    className="action-btn msg"
                    onClick={() => startDM(u._id)}
                    title="Send a direct message"
                  >
                    💬 Message
                  </button>
                )}

                {/* Block/Unblock button */}
                <button
                  id={`block-btn-${u._id}`}
                  className={`action-btn ${u.isBlocked ? 'unblock' : 'block'}`}
                  onClick={() => toggleBlock(u._id, u.isBlocked, u.username)}
                  disabled={actionLoading === `block-${u._id}`}
                >
                  {actionLoading === `block-${u._id}`
                    ? '…'
                    : u.isBlocked ? '🚫 Unblock' : '🔒 Block'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
