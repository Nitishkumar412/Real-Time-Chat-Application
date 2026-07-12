import { useState } from 'react';
import api from '../services/api';

const EMOJIS = ['💬', '🎲', '💻', '🎨', '🎮', '📚', '🎵', '🚀', '🌍', '⚡'];

export default function CreateRoomModal({ onClose, onCreated, onToast }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [emoji, setEmoji] = useState('💬');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) return setError('Room name is required');
    setLoading(true);
    try {
      await api.post('/api/rooms', { name: name.trim(), description: description.trim(), emoji });
      onToast(`#${name.trim()} created!`, 'success');
      onCreated();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" id="create-room-modal">
        <div className="modal-header">
          <span className="modal-title">➕ Create Channel</span>
          <button id="close-create-room" className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form className="create-room-form" onSubmit={handleSubmit}>
          {/* Emoji picker */}
          <div className="form-group" style={{ marginBottom: 4 }}>
            <label className="form-label">Channel Icon</label>
            <div className="emoji-options">
              {EMOJIS.map((e) => (
                <div
                  key={e}
                  id={`emoji-${e}`}
                  className={`emoji-opt ${emoji === e ? 'selected' : ''}`}
                  onClick={() => setEmoji(e)}
                  role="button"
                >
                  {e}
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="room-name">Channel Name</label>
            <input
              id="room-name"
              className="form-input"
              type="text"
              placeholder="e.g. gaming"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              required
              autoFocus
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="room-desc">Description (optional)</label>
            <input
              id="room-desc"
              className="form-input"
              type="text"
              placeholder="What's this channel about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
            />
          </div>

          {error && <div className="form-error">⚠️ {error}</div>}

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button
              id="create-room-submit"
              type="submit"
              className="btn-submit"
              disabled={loading || !name.trim()}
            >
              {loading ? 'Creating…' : 'Create Channel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
