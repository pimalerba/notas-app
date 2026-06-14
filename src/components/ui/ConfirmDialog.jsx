import './ConfirmDialog.css'

export default function ConfirmDialog({ title, message, confirmLabel = 'Excluir', onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="confirm-card modal-card" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
        <div className="confirm-body">
          <div className="confirm-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="13" stroke="#dc2626" strokeWidth="2"/>
              <path d="M14 8v7" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="14" cy="19.5" r="1.5" fill="#dc2626"/>
            </svg>
          </div>
          <h3 id="confirm-title" className="confirm-title">{title}</h3>
          {message && <p className="confirm-message">{message}</p>}
        </div>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onCancel}>Cancelar</button>
          <button className="btn-danger" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
