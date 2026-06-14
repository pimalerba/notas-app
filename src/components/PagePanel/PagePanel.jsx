import { useState, useEffect, useRef } from 'react'
import ConfirmDialog from '../ui/ConfirmDialog.jsx'
import './PagePanel.css'

export default function PagePanel({
  pages,
  activePageId,
  onSelectPage,
  onAddPage,
  onDuplicatePage,
  onDeletePage,
  onReorderPages,
}) {
  const [dragIndex, setDragIndex] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)
  const [menu, setMenu] = useState(null) // { pageId, x, y }
  const [confirmDeletePageId, setConfirmDeletePageId] = useState(null)
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 640)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menu) return
    function handler(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(null)
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [menu])

  function handleDragStart(e, i) {
    setDragIndex(i)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e, i) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverIndex !== i) setDragOverIndex(i)
  }

  function handleDrop(toIndex) {
    if (dragIndex === null || dragIndex === toIndex) return
    const reordered = [...pages]
    const [moved] = reordered.splice(dragIndex, 1)
    reordered.splice(toIndex, 0, moved)
    onReorderPages(reordered)
    setDragIndex(null)
    setDragOverIndex(null)
  }

  function handleDragEnd() {
    setDragIndex(null)
    setDragOverIndex(null)
  }

  function openMenu(e, pageId) {
    e.preventDefault()
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setMenu({ pageId, x: rect.right + 6, y: rect.top })
  }

  const canDelete = pages.length > 1

  const pageToDelete = confirmDeletePageId ? pages.find((p) => p.id === confirmDeletePageId) : null
  const pageToDeleteIndex = pageToDelete ? pages.indexOf(pageToDelete) + 1 : 0

  return (
    <aside className={`page-panel ${collapsed ? 'collapsed' : ''}`}>
      <button
        className="pp-toggle"
        onClick={() => setCollapsed((v) => !v)}
        title={collapsed ? 'Mostrar páginas' : 'Ocultar páginas'}
        aria-label={collapsed ? 'Mostrar painel de páginas' : 'Ocultar painel de páginas'}
        aria-expanded={!collapsed}
      >
        {collapsed ? '›' : '‹'}
      </button>
      <div className="pp-list">
        {pages.map((page, i) => {
          const isActive = page.id === activePageId
          const isDraggedOver = dragOverIndex === i && dragIndex !== i
          const isBeingDragged = dragIndex === i

          return (
            <div
              key={page.id}
              className={[
                'pp-item',
                isActive ? 'active' : '',
                isDraggedOver ? 'drag-over' : '',
                isBeingDragged ? 'dragging' : '',
              ].filter(Boolean).join(' ')}
              draggable
              onDragStart={(e) => handleDragStart(e, i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDrop={() => handleDrop(i)}
              onDragEnd={handleDragEnd}
              onClick={() => onSelectPage(page.id)}
            >
              <div className="pp-thumb">
                {page.thumbnail
                  ? <img src={page.thumbnail} alt="" draggable={false} />
                  : <span className="pp-blank" />
                }
                <button
                  className="pp-more"
                  onClick={(e) => openMenu(e, page.id)}
                  title="Opções da página"
                >
                  <DotsIcon />
                </button>
              </div>
              <span className="pp-num">{i + 1}</span>
            </div>
          )
        })}
      </div>

      <button className="pp-add" onClick={onAddPage} title="Nova página">
        <PlusIcon />
      </button>

      {confirmDeletePageId && (
        <ConfirmDialog
          title="Deletar página?"
          message={`A página ${pageToDeleteIndex} será excluída permanentemente.`}
          confirmLabel="Deletar"
          onConfirm={() => { onDeletePage(confirmDeletePageId); setConfirmDeletePageId(null) }}
          onCancel={() => setConfirmDeletePageId(null)}
        />
      )}

      {menu && (
        <div
          ref={menuRef}
          className="pp-menu"
          style={{ top: menu.y, left: menu.x }}
        >
          <button onClick={() => { onDuplicatePage(menu.pageId); setMenu(null) }}>
            Duplicar
          </button>
          <button
            className={canDelete ? 'danger' : 'disabled'}
            onClick={() => {
              if (!canDelete) return
              setConfirmDeletePageId(menu.pageId)
              setMenu(null)
            }}
          >
            Deletar
          </button>
        </div>
      )}
    </aside>
  )
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M8 3v10M3 8h10" />
    </svg>
  )
}

function DotsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <circle cx="7" cy="2.5" r="1.2" />
      <circle cx="7" cy="7" r="1.2" />
      <circle cx="7" cy="11.5" r="1.2" />
    </svg>
  )
}
