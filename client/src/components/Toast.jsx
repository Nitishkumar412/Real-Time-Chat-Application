export default function Toast({ toasts }) {
  const icons = { success: '✅', error: '❌', info: '💡' };

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span className="toast-icon">{icons[t.type] || '💡'}</span>
          {t.message}
        </div>
      ))}
    </div>
  );
}
