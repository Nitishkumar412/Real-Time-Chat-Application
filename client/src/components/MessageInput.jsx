import { useState, useRef } from 'react';

export default function MessageInput({ onSend, onTyping, placeholder }) {
  const [text, setText] = useState('');
  const ref = useRef(null);

  const submit = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
    if (ref.current) ref.current.style.height = 'auto';
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  };

  const onChange = (e) => {
    setText(e.target.value);
    onTyping?.();
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  return (
    <div className="chat-input-area">
      <div className="chat-input-wrap">
        <textarea
          id="message-input"
          ref={ref}
          className="chat-input"
          placeholder={placeholder || 'Type a message…'}
          value={text}
          onChange={onChange}
          onKeyDown={onKeyDown}
          rows={1}
        />
        <button
          id="send-btn"
          className="send-btn"
          onClick={submit}
          disabled={!text.trim()}
          title="Send (Enter)"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
