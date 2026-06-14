import { useState, useRef } from 'react'
import { useNotebooks } from '../../hooks/useNotebooks.js'
import { useFolders } from '../../hooks/useFolders.js'
import NotebookCover from './NotebookCover.jsx'
import FolderCard from './FolderCard.jsx'
import NewNotebookModal from './NewNotebookModal.jsx'
import './Library.css'

// ── Modal de nova pasta ────────────────────────────────────────────────────────
function NewFolderModal({ onSubmit, onClose }) {
  const [name, setName] = useState('Nova pasta')

  function handleKey(e) {
    if (e.key === 'Enter') onSubmit(name.trim() || 'Nova pasta')
    if (e.key === 'Escape') onClose()
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card folder-modal" role="dialog" aria-modal="true">
        <header className="modal-header">
          <h2 className="modal-title">Nova pasta</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </header>
        <div className="modal-field" style={{ padding: '16px 24px 0' }}>
          <label className="modal-label" htmlFor="folder-name">Nome</label>
          <input
            id="folder-name"
            className="modal-input"
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKey}
            maxLength={60}
          />
        </div>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button
            className="btn-primary"
            onClick={() => onSubmit(name.trim() || 'Nova pasta')}
          >
            Criar pasta
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal mover para pasta ─────────────────────────────────────────────────────
function MoveModal({ folders, onMove, onClose }) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card folder-modal" role="dialog" aria-modal="true">
        <header className="modal-header">
          <h2 className="modal-title">Mover para</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </header>
        <div className="move-list">
          <button className="move-item" onClick={() => onMove(null)}>
            <span className="move-item-icon">📚</span>
            Biblioteca (raiz)
          </button>
          {folders.map((f) => (
            <button key={f.id} className="move-item" onClick={() => onMove(f.id)}>
              <span className="move-item-icon">📁</span>
              {f.name}
            </button>
          ))}
          {folders.length === 0 && (
            <p className="move-empty">Nenhuma pasta criada ainda.</p>
          )}
        </div>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}

// ── Estado vazio ───────────────────────────────────────────────────────────────
function EmptyState({ onCreateNotebook }) {
  return (
    <div className="library-empty">
      <svg className="library-empty-illo" viewBox="0 0 140 120" fill="none" aria-hidden="true">
        {/* página de fundo */}
        <rect x="32" y="28" width="76" height="84" rx="6" fill="#dce5f0"/>
        {/* capa do caderno */}
        <rect x="24" y="20" width="76" height="84" rx="6" fill="#4d94e0"/>
        {/* textura de linhas */}
        <line x1="36" y1="52" x2="88" y2="52" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round"/>
        <line x1="36" y1="63" x2="80" y2="63" stroke="rgba(255,255,255,0.28)" strokeWidth="2" strokeLinecap="round"/>
        <line x1="36" y1="74" x2="84" y2="74" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round"/>
        {/* espiral no topo */}
        {[34,46,58,70,82,94].map((cx) => (
          <ellipse key={cx} cx={cx} cy={22} rx={5} ry={6} fill="none" stroke="#7db3ec" strokeWidth="2"/>
        ))}
        {/* círculo de ação */}
        <circle cx="104" cy="86" r="20" fill="#7db3ec"/>
        <path d="M104 78v16M96 86h16" stroke="white" strokeWidth="3" strokeLinecap="round"/>
      </svg>
      <h3>Nenhum caderno ainda</h3>
      <p>Crie seu primeiro caderno para começar a escrever</p>
      <button className="btn-primary" onClick={onCreateNotebook}>
        + Novo caderno
      </button>
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function Library({ onOpenNotebook }) {
  const {
    notebooks, loading: nbLoading,
    createNotebook, createPdf, renameNotebook, removeNotebook, moveToFolder, refresh, updateNotebookThumb,
  } = useNotebooks()

  const {
    folders, loading: fdLoading,
    createFolder, renameFolder, removeFolder,
  } = useFolders()

  const [currentFolderId, setCurrentFolderId] = useState(null)
  const [modal, setModal] = useState(null) // null | 'notebook' | 'folder' | 'move'
  const [renamingId, setRenamingId] = useState(null)
  const [moveItem, setMoveItem] = useState(null) // { id, type }
  const pdfInputRef = useRef(null)

  const loading = nbLoading || fdLoading

  // Filtra itens da pasta atual
  const visibleFolders = folders
    .filter((f) => (f.parentId ?? null) === currentFolderId)
    .sort((a, b) => a.name.localeCompare(b.name))

  const visibleNotebooks = notebooks
    .filter((nb) => (nb.folderId ?? null) === currentFolderId)

  const currentFolder = folders.find((f) => f.id === currentFolderId) ?? null
  const isEmpty = visibleFolders.length === 0 && visibleNotebooks.length === 0

  // Contagem de itens por pasta (para o FolderCard)
  function folderItemCount(folderId) {
    return notebooks.filter((nb) => nb.folderId === folderId).length +
      folders.filter((f) => f.parentId === folderId).length
  }

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function handleCreateNotebook(data) {
    await createNotebook(data.title, data.coverColor, data.paperType, currentFolderId)
    setModal(null)
  }

  async function handleCreateFolder(name) {
    await createFolder(name)
    setModal(null)
  }

  async function handleImportPdf(e) {
    const file = e.target.files[0]
    if (!file) return
    await createPdf(file, currentFolderId)
    e.target.value = ''
  }

  async function handleRemoveFolder(id) {
    await removeFolder(id)
    await refresh() // cadernos da pasta voltam para a raiz
    if (currentFolderId === id) setCurrentFolderId(null)
  }

  async function handleMove(targetFolderId) {
    if (!moveItem) return
    await moveToFolder(moveItem.id, targetFolderId)
    setMoveItem(null)
    setModal(null)
  }

  function startMove(id) {
    setMoveItem({ id })
    setModal('move')
  }

  function startRename(id) {
    setRenamingId(id)
  }

  function submitRename(id, isFolder, newName) {
    if (isFolder) renameFolder(id, newName)
    else renameNotebook(id, newName)
    setRenamingId(null)
  }

  // Pastas disponíveis para "mover para" (exclui a atual)
  const moveableFolders = folders.filter((f) => f.id !== currentFolderId)

  return (
    <div className="library">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="library-header">
        <h1 className="library-logo">Notas</h1>

        {currentFolder && (
          <div className="library-breadcrumb">
            <button className="breadcrumb-back" onClick={() => setCurrentFolderId(null)}>
              ← Biblioteca
            </button>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">{currentFolder.name}</span>
          </div>
        )}

        <a
          className="lib-btn lib-btn-ghost"
          href="https://github.com/pimalerba/notas-app/"
          target="_blank"
          rel="noopener noreferrer"
          title="Ver no GitHub"
          aria-label="Ver no GitHub"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
          </svg>
          GitHub
        </a>

        <div className="library-actions">
          <button
            className="lib-btn lib-btn-ghost"
            title="Importar PDF"
            onClick={() => pdfInputRef.current?.click()}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="1" width="10" height="14" rx="1.5" />
              <path d="M6 1v4h6" />
              <path d="M5 9h6M5 12h4" />
            </svg>
            PDF
          </button>

          <button
            className="lib-btn lib-btn-ghost"
            title="Nova pasta"
            onClick={() => setModal('folder')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 4.5C1 3.67 1.67 3 2.5 3H6l1.5 1.5H13.5c.83 0 1.5.67 1.5 1.5V12c0 .83-.67 1.5-1.5 1.5h-11C1.67 13.5 1 12.83 1 12V4.5z" />
            </svg>
            Pasta
          </button>

          <button
            className="lib-btn lib-btn-primary"
            onClick={() => setModal('notebook')}
          >
            + Caderno
          </button>
        </div>
      </header>

      {/* ── Grid ───────────────────────────────────────────────────────────── */}
      <div className="library-scroll">
        {loading ? (
          <div className="library-loading">Carregando...</div>
        ) : isEmpty ? (
          <EmptyState onCreateNotebook={() => setModal('notebook')} />
        ) : (
          <div className="library-grid">
            {visibleFolders.map((folder) => (
              <FolderCard
                key={folder.id}
                folder={folder}
                itemCount={folderItemCount(folder.id)}
                isRenaming={renamingId === folder.id}
                onOpen={() => setCurrentFolderId(folder.id)}
                onRename={() => startRename(folder.id)}
                onDelete={() => handleRemoveFolder(folder.id)}
                onRenameSubmit={(name) => submitRename(folder.id, true, name)}
                onRenameCancel={() => setRenamingId(null)}
              />
            ))}

            {visibleNotebooks.map((nb) => (
              <NotebookCover
                key={nb.id}
                notebook={nb}
                isRenaming={renamingId === nb.id}
                onOpen={() => onOpenNotebook(nb.id)}
                onRename={() => startRename(nb.id)}
                onMoveToFolder={() => startMove(nb.id)}
                onDelete={() => removeNotebook(nb.id)}
                onRenameSubmit={(title) => submitRename(nb.id, false, title)}
                onRenameCancel={() => setRenamingId(null)}
                onThumbGenerated={(dataUrl) => updateNotebookThumb(nb.id, dataUrl)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Modais ─────────────────────────────────────────────────────────── */}
      {modal === 'notebook' && (
        <NewNotebookModal onSubmit={handleCreateNotebook} onClose={() => setModal(null)} />
      )}

      {modal === 'folder' && (
        <NewFolderModal onSubmit={handleCreateFolder} onClose={() => setModal(null)} />
      )}

      {modal === 'move' && (
        <MoveModal
          folders={moveableFolders}
          onMove={handleMove}
          onClose={() => { setModal(null); setMoveItem(null) }}
        />
      )}

      <input
        ref={pdfInputRef}
        type="file"
        accept=".pdf"
        style={{ display: 'none' }}
        onChange={handleImportPdf}
      />
    </div>
  )
}
