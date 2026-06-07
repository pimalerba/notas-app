import { useState, useEffect, useRef } from 'react'
import { COVER_COLORS } from '../../hooks/useNotebooks.js'
import './NewNotebookModal.css'

const PAPER_TYPES = [
  {
    value: 'blank',
    label: 'Em branco',
    preview: (
      <svg viewBox="0 0 40 40"><rect width="40" height="40" fill="white" /></svg>
    ),
  },
  {
    value: 'lines',
    label: 'Linhas',
    preview: (
      <svg viewBox="0 0 40 40">
        <rect width="40" height="40" fill="white" />
        {[8, 16, 24, 32].map((y) => (
          <line key={y} x1="3" y1={y} x2="37" y2={y} stroke="#c4cedc" strokeWidth="1" />
        ))}
      </svg>
    ),
  },
  {
    value: 'grid',
    label: 'Quadriculado',
    preview: (
      <svg viewBox="0 0 40 40">
        <rect width="40" height="40" fill="white" />
        {[8, 16, 24, 32].map((y) => (
          <line key={`h${y}`} x1="3" y1={y} x2="37" y2={y} stroke="#c4cedc" strokeWidth="1" />
        ))}
        {[8, 16, 24, 32].map((x) => (
          <line key={`v${x}`} x1={x} y1="3" x2={x} y2="37" stroke="#c4cedc" strokeWidth="1" />
        ))}
      </svg>
    ),
  },
  {
    value: 'dots',
    label: 'Pontilhado',
    preview: (
      <svg viewBox="0 0 40 40">
        <rect width="40" height="40" fill="white" />
        {[8, 16, 24, 32].flatMap((y) =>
          [8, 16, 24, 32].map((x) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="1.5" fill="#c4cedc" />
          ))
        )}
      </svg>
    ),
  },
]

export default function NewNotebookModal({ onSubmit, onClose }) {
  const [title, setTitle] = useState('Sem título')
  const [color, setColor] = useState(COVER_COLORS[0])
  const [paperType, setPaperType] = useState('blank')
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.select()
  }, [])

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit({ title: title.trim() || 'Sem título', coverColor: color, paperType })
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose()
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') onClose()
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick} onKeyDown={handleKeyDown}>
      <div className="modal-card" role="dialog" aria-modal="true" aria-label="Novo caderno">
        <header className="modal-header">
          <h2 className="modal-title">Novo caderno</h2>
          <button className="modal-close" onClick={onClose} aria-label="Fechar">✕</button>
        </header>

        <form onSubmit={handleSubmit}>
          {/* Preview da capa */}
          <div className="modal-preview-wrap">
            <div
              className="modal-cover-preview"
              style={{ background: color }}
            >
              <span>{title || 'Sem título'}</span>
            </div>
          </div>

          {/* Nome */}
          <div className="modal-field">
            <label className="modal-label" htmlFor="nb-title">Nome</label>
            <input
              ref={inputRef}
              id="nb-title"
              className="modal-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              placeholder="Sem título"
            />
          </div>

          {/* Cor da capa */}
          <div className="modal-field">
            <label className="modal-label">Cor da capa</label>
            <div className="color-swatches">
              {COVER_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`color-swatch ${c === color ? 'selected' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                  aria-label={c}
                />
              ))}
            </div>
          </div>

          {/* Tipo de papel */}
          <div className="modal-field">
            <label className="modal-label">Tipo de papel</label>
            <div className="paper-types">
              {PAPER_TYPES.map((pt) => (
                <button
                  key={pt.value}
                  type="button"
                  className={`paper-type-btn ${pt.value === paperType ? 'selected' : ''}`}
                  onClick={() => setPaperType(pt.value)}
                >
                  <div className="paper-preview">{pt.preview}</div>
                  <span>{pt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Ações */}
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              Criar caderno
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
