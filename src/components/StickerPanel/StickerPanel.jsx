import { useRef, useEffect } from 'react'
import './StickerPanel.css'

export default function StickerPanel({ stickers, onImport, onSelect, onRemove, onClose }) {
  const fileRef = useRef(null)
  const panelRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose()
    }
    // Delay so the toggle click itself doesn't immediately close the panel
    const t = setTimeout(() => window.addEventListener('mousedown', handler), 50)
    return () => { clearTimeout(t); window.removeEventListener('mousedown', handler) }
  }, [onClose])

  function handleFileChange(e) {
    const files = Array.from(e.target.files ?? [])
    files.forEach(onImport)
    e.target.value = ''
  }

  return (
    <div ref={panelRef} className="sticker-panel">
      <div className="sp-header">
        <span className="sp-title">Adesivos</span>
        <button className="sp-import" onClick={() => fileRef.current?.click()} title="Importar PNG">
          <ImportIcon /> Importar
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>

      {stickers.length === 0 ? (
        <div className="sp-empty">
          <p>Nenhum adesivo ainda.</p>
          <p>Importe um PNG para começar.</p>
        </div>
      ) : (
        <div className="sp-grid">
          {stickers.map((s) => (
            <div key={s.id} className="sp-item" title={s.name}>
              <img
                src={s.dataUrl}
                alt={s.name}
                draggable={false}
                onClick={() => { onSelect(s); onClose() }}
              />
              <button
                className="sp-remove"
                onClick={(e) => { e.stopPropagation(); onRemove(s.id) }}
                title="Remover da biblioteca"
              >×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ImportIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 1v7M3.5 5l3 3 3-3" />
      <path d="M1 10h11" />
    </svg>
  )
}
