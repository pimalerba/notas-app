import { useState, useEffect, useRef } from 'react'
import ConfirmDialog from '../ui/ConfirmDialog.jsx'
import './NotebookCover.css'

const RING_COUNT = 8

function Spiral() {
  return (
    <svg
      className="nb-spiral"
      viewBox={`0 0 ${RING_COUNT * 20} 24`}
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      {Array.from({ length: RING_COUNT }).map((_, i) => (
        <ellipse
          key={i}
          cx={10 + i * 20}
          cy={12}
          rx={7}
          ry={9}
          fill="none"
          stroke="#9aa5b4"
          strokeWidth={2.5}
        />
      ))}
    </svg>
  )
}

export default function NotebookCover({
  notebook,
  isRenaming,
  onOpen,
  onRename,
  onMoveToFolder,
  onDelete,
  onRenameSubmit,
  onRenameCancel,
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [draft, setDraft] = useState(notebook.title)
  const inputRef = useRef(null)

  useEffect(() => {
    if (isRenaming) {
      setDraft(notebook.title)
      requestAnimationFrame(() => {
        inputRef.current?.select()
      })
    }
  }, [isRenaming, notebook.title])

  useEffect(() => {
    if (!menuOpen) return
    const close = () => setMenuOpen(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [menuOpen])

  function handleMenuClick(e) {
    e.stopPropagation()
    setMenuOpen((v) => !v)
  }

  function handleRenameKeyDown(e) {
    if (e.key === 'Enter') onRenameSubmit(draft.trim() || notebook.title)
    if (e.key === 'Escape') onRenameCancel()
  }

  const isPdf = notebook.type === 'pdf'

  return (
    <>
    <div className="nb-card" onClick={onOpen}>
      <div className="nb-spiral-wrap">
        <Spiral />
      </div>

      <div
        className="nb-cover"
        style={{ background: notebook.coverColor }}
        title={notebook.title}
      >
        {isPdf && (
          <div className="nb-pdf-badge">PDF</div>
        )}

        <div className="nb-pages-stack" />

        <div className="nb-title-area">
          {isRenaming ? (
            <input
              ref={inputRef}
              className="nb-rename-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleRenameKeyDown}
              onBlur={() => onRenameSubmit(draft.trim() || notebook.title)}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="nb-title">{notebook.title}</span>
          )}
        </div>
      </div>

      <button
        className="nb-menu-btn"
        aria-label="Opções"
        onClick={handleMenuClick}
      >
        ···
      </button>

      {menuOpen && (
        <div className="nb-dropdown" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => { setMenuOpen(false); onRename() }}>
            Renomear
          </button>
          <button onClick={() => { setMenuOpen(false); onMoveToFolder() }}>
            Mover para pasta
          </button>
          <button
            className="nb-dropdown-danger"
            onClick={() => { setMenuOpen(false); setConfirmDelete(true) }}
          >
            Excluir
          </button>
        </div>
      )}
    </div>

    {confirmDelete && (
      <ConfirmDialog
        title="Excluir caderno?"
        message={`"${notebook.title}" e todas as suas páginas serão excluídos permanentemente.`}
        confirmLabel="Excluir"
        onConfirm={() => { setConfirmDelete(false); onDelete() }}
        onCancel={() => setConfirmDelete(false)}
      />
    )}
    </>
  )
}
