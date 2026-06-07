import { useState, useEffect, useRef } from 'react'
import './FolderCard.css'

export default function FolderCard({
  folder,
  itemCount,
  isRenaming,
  onOpen,
  onRename,
  onDelete,
  onRenameSubmit,
  onRenameCancel,
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [draft, setDraft] = useState(folder.name)
  const inputRef = useRef(null)

  useEffect(() => {
    if (isRenaming) {
      setDraft(folder.name)
      requestAnimationFrame(() => inputRef.current?.select())
    }
  }, [isRenaming, folder.name])

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

  function handleKeyDown(e) {
    if (e.key === 'Enter') onRenameSubmit(draft.trim() || folder.name)
    if (e.key === 'Escape') onRenameCancel()
  }

  return (
    <div className="folder-card" onClick={onOpen}>
      <div className="folder-tab" />

      <div className="folder-body">
        <svg className="folder-icon" viewBox="0 0 32 28" aria-hidden="true">
          <path
            d="M2 6 C2 4 3.5 2 6 2 L12 2 L15 5 L28 5 C29.5 5 30 6.5 30 8 L30 24 C30 25.5 28.5 26 27 26 L5 26 C3.5 26 2 25.5 2 24 Z"
            fill="rgba(255,255,255,0.35)"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="1"
          />
        </svg>

        <div className="folder-info">
          {isRenaming ? (
            <input
              ref={inputRef}
              className="folder-rename-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => onRenameSubmit(draft.trim() || folder.name)}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="folder-name">{folder.name}</span>
          )}
          <span className="folder-count">
            {itemCount} {itemCount === 1 ? 'item' : 'itens'}
          </span>
        </div>
      </div>

      <button
        className="folder-menu-btn"
        aria-label="Opções da pasta"
        onClick={handleMenuClick}
      >
        ···
      </button>

      {menuOpen && (
        <div className="folder-dropdown" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => { setMenuOpen(false); onRename() }}>
            Renomear
          </button>
          <button
            className="folder-dropdown-danger"
            onClick={() => { setMenuOpen(false); onDelete() }}
          >
            Excluir pasta
          </button>
        </div>
      )}
    </div>
  )
}
