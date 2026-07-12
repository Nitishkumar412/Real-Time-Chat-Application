import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const VIEWS = { MAIN: 'main', EDIT_NAME: 'edit_name', DELETE: 'delete' };

export default function SettingsModal({ onClose, onToast }) {
  const { user, updateUser, logout } = useAuth();
  const [view, setView] = useState(VIEWS.MAIN);
  const [newName, setNewName] = useState(user?.username || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /* ── Edit name ─────────────────────────────────────────────────────────── */
  const handleEditName = async (e) => {
    e.preventDefault();
    if (newName.trim() === user?.username) return onClose();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.put('/api/users/profile', { username: newName.trim() });
      updateUser({ username: data.user.username });
      onToast('Username updated!', 'success');
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update username');
    } finally {
      setLoading(false);
    }
  };

  /* ── Delete account ────────────────────────────────────────────────────── */
  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      await api.delete('/api/users/account');
      logout();
    } catch {
      onToast('Failed to delete account', 'error');
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" id="settings-modal">

        {/* ── Main view ─────────────────────────────────────────────────── */}
        {view === VIEWS.MAIN && (
          <>
            <div className="modal-header">
              <span className="modal-title">⚙️ Settings</span>
              <button id="close-settings" className="modal-close" onClick={onClose}>✕</button>
            </div>

            {/* User card */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14,
              background: 'var(--bg-3)', border: '1px solid var(--border)',
              borderRadius: 'var(--r-l)', padding: '16px',
              marginBottom: 22,
            }}>
              <div className="avatar avatar-xl" style={{ background: user?.avatarColor || '#7c3aed' }}>
                {user?.username?.[0]?.toUpperCase()}
                <span className="online-dot" />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{user?.username}</div>
                <div style={{ color: 'var(--text-2)', fontSize: 13 }}>{user?.email}</div>
              </div>
            </div>

            {/* Account section */}
            <div className="settings-section">
              <div className="settings-section-title">Account</div>

              <div
                id="settings-edit-name"
                className="settings-item"
                onClick={() => { setError(''); setView(VIEWS.EDIT_NAME); }}
              >
                <div className="settings-icon-wrap purple">✏️</div>
                <div className="settings-item-info">
                  <div className="settings-item-name">Edit Username</div>
                  <div className="settings-item-desc">Change your display name</div>
                </div>
                <span className="settings-chevron">›</span>
              </div>
            </div>

            <div className="settings-divider" />

            {/* Danger zone */}
            <div className="settings-section">
              <div className="settings-section-title">Danger Zone</div>

              <div
                id="settings-delete-account"
                className="settings-item danger"
                onClick={() => setView(VIEWS.DELETE)}
              >
                <div className="settings-icon-wrap red">🗑️</div>
                <div className="settings-item-info">
                  <div className="settings-item-name">Delete Account</div>
                  <div className="settings-item-desc">Permanently remove your account and all messages</div>
                </div>
                <span className="settings-chevron">›</span>
              </div>
            </div>

            <div className="settings-divider" />

            <div
              id="settings-logout"
              className="settings-item"
              onClick={logout}
              style={{ cursor: 'pointer' }}
            >
              <div className="settings-icon-wrap orange">🚪</div>
              <div className="settings-item-info">
                <div className="settings-item-name">Sign Out</div>
                <div className="settings-item-desc">Sign out of your account</div>
              </div>
            </div>
          </>
        )}

        {/* ── Edit name view ─────────────────────────────────────────────── */}
        {view === VIEWS.EDIT_NAME && (
          <>
            <div className="modal-header">
              <span className="modal-title">✏️ Edit Username</span>
              <button className="modal-close" onClick={() => setView(VIEWS.MAIN)}>‹</button>
            </div>

            <form className="edit-name-form" onSubmit={handleEditName}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="new-username">New Username</label>
                <input
                  id="new-username"
                  className="form-input"
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Enter new username"
                  minLength={2}
                  maxLength={30}
                  required
                  autoFocus
                />
              </div>
              {error && <div className="form-error">⚠️ {error}</div>}
              <div className="edit-name-actions">
                <button type="button" className="btn-cancel" onClick={() => setView(VIEWS.MAIN)}>
                  Cancel
                </button>
                <button
                  id="save-username"
                  type="submit"
                  className="btn-submit"
                  disabled={loading || !newName.trim()}
                >
                  {loading ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </>
        )}

        {/* ── Delete confirm view ────────────────────────────────────────── */}
        {view === VIEWS.DELETE && (
          <>
            <div className="modal-header">
              <span className="modal-title">Delete Account</span>
              <button className="modal-close" onClick={() => setView(VIEWS.MAIN)}>✕</button>
            </div>

            <div className="confirm-body">
              <div className="confirm-icon">⚠️</div>
              <div className="confirm-title">Are you absolutely sure?</div>
              <div className="confirm-desc">
                This will permanently delete your account, all your messages, and cannot be undone.
                This action is <strong>irreversible</strong>.
              </div>
              <div className="confirm-actions">
                <button className="btn-cancel" onClick={() => setView(VIEWS.MAIN)}>
                  Cancel
                </button>
                <button
                  id="confirm-delete-account"
                  className="btn-danger"
                  onClick={handleDeleteAccount}
                  disabled={loading}
                >
                  {loading ? 'Deleting…' : 'Delete Account'}
                </button>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
