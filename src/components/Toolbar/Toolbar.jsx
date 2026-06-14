import { useState, useRef, useLayoutEffect, useEffect } from 'react'
import './Toolbar.css'

const STORAGE_KEY = 'notas-toolbar'

function readStorage() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || {} }
  catch { return {} }
}

function writeStorage(x, y, vertical) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ x, y, vertical })) }
  catch { /* quota exceeded or private mode */ }
}

const PEN_COLORS = [
  '#111827', '#2563eb', '#dc2626', '#16a34a',
  '#ea580c', '#7c3aed', '#0891b2', '#6b7280',
]

const HIGHLIGHT_COLORS = [
  '#FFE500', '#72F272', '#5DD5FF', '#FFB0E0', '#FFAA22',
]

const TEXT_COLORS = [
  '#111827', '#2563eb', '#dc2626', '#16a34a', '#ea580c', '#7c3aed',
]

const PEN_SIZES = [
  { label: 'Fina',   visual: 6,  value: 2 },
  { label: 'Média',  visual: 11, value: 6 },
  { label: 'Grossa', visual: 17, value: 14 },
]

const HIGHLIGHT_SIZES = [
  { label: 'Fina',   visual: 8,  value: 12 },
  { label: 'Média',  visual: 14, value: 20 },
  { label: 'Grossa', visual: 20, value: 32 },
]

const FONT_SIZES = [12, 14, 16, 18, 24, 32]
const FONT_FAMILIES = [
  { value: 'sans',  label: 'Sans' },
  { value: 'serif', label: 'Serif' },
  { value: 'mono',  label: 'Mono' },
]

// ── Ícones ────────────────────────────────────────────────────────────────────

function RotateIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 7A4.5 4.5 0 1 0 4 3.2" />
      <path d="M4 1v3H1" />
    </svg>
  )
}

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 3L5 8l5 5" />
    </svg>
  )
}

function PenIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11.5 2.5l2 2-7.5 7.5H4v-2l7.5-7.5z" />
      <path d="M10 4l2 2" />
    </svg>
  )
}

function BrushIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.5 2L10 4.5 5 9.5c-.6.6-.8 1.8-.3 2.5.5.7 1.7.7 2.4.1L12.5 7l1.5-1.5-1.5-3.5z" />
      <path d="M3.5 13.5C3 14.5 2 14.5 2 14.5s.5-1 1-1.5 1.5-.5 1.5-.5-.5 0-1 .5z" fill="currentColor" stroke="none" />
    </svg>
  )
}

function HighlightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2.5L13.5 6.5 7.5 12.5H4.5V9.5L9.5 2.5Z" />
      <path d="M2 14.5H14" />
    </svg>
  )
}

function EraserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11.5l5.5-5.5 3.5 3.5-3.5 3.5H3v-1.5z" />
      <path d="M2.5 14h11" />
    </svg>
  )
}

function LassoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2.5 2">
      <ellipse cx="8" cy="7" rx="5.5" ry="4" />
      <path d="M8 11v3M6 12.5h4" strokeDasharray="none" />
    </svg>
  )
}

function TextIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 4h10M8 4v9" />
      <path d="M5.5 13h5" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3.5h10M5 3.5V2.5h4v1M5.5 6v4.5M8.5 6v4.5M3 3.5l.8 8h6.4l.8-8" />
    </svg>
  )
}

function UndoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7a5 5 0 1 0 1.5-3.5L2 1"/>
      <path d="M2 1v4h4"/>
    </svg>
  )
}

function RedoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 7a5 5 0 1 1-1.5-3.5L14 1"/>
      <path d="M14 1v4h-4"/>
    </svg>
  )
}

function ExportIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2v8M5 7l3 3 3-3" />
      <path d="M3 11v2h10v-2" />
    </svg>
  )
}

function StickerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2a6 6 0 1 1 0 12" />
      <path d="M8 8a6 6 0 0 0 6 6" />
      <circle cx="5.5" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="8" cy="5" r="1" fill="currentColor" stroke="none" />
      <path d="M5 10c.5 1 1.5 1.5 3 1.5" />
    </svg>
  )
}

function HandIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8V3.5a1 1 0 0 1 2 0V8" />
      <path d="M8 7V3a1 1 0 0 1 2 0v4" />
      <path d="M10 5.5a1 1 0 0 1 2 0v3.5a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8a1 1 0 0 1 2 0" />
      <path d="M4 8V6.5a1 1 0 0 1 2 0V8" />
    </svg>
  )
}

function PencilOnlyIcon({ active }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11.5 2.5l2 2-7.5 7.5H4v-2l7.5-7.5z" />
      <path d="M10 4l2 2" />
      {active
        ? <path d="M1 13h6" strokeWidth="2" />
        : <>
            <path d="M4 10.5c1 1 2.5 1.5 4.5 0" />
            <path d="M3 13c.5-1 1.5-1.5 2.5-1.5S7.5 12 8 13" />
          </>
      }
    </svg>
  )
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function Toolbar({
  tool, color, strokeSize, eraserMode,
  onSetTool, onSetColor, onSetStrokeSize, onSetEraserMode,
  onBack,
  // Lasso
  lassoHasSelection,
  onDeleteLassoSelection,
  // Text element
  selectedText,
  onUpdateText,
  onDeleteSelectedText,
  // Sticker panel toggle
  stickerPanelOpen,
  onToggleStickerPanel,
  // Selected sticker instance
  selectedSticker,
  onDeleteSelectedSticker,
  // Export
  onExportPng,
  onExportPdf,
  // Undo / Redo
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  // Palm rejection
  pencilOnly,
  onTogglePencilOnly,
}) {
  const toolbarRef = useRef(null)
  const [pos, setPos] = useState(() => {
    const s = readStorage()
    return s.x != null ? { x: s.x, y: s.y } : { x: 0, y: 20 }
  })
  const [vertical, setVertical] = useState(() => readStorage().vertical ?? false)
  const isDragging = useRef(false)
  const drag = useRef({ mx: 0, my: 0, tx: 0, ty: 0 })

  // Persist state whenever pos or orientation changes
  useEffect(() => {
    writeStorage(pos.x, pos.y, vertical)
  }, [pos, vertical])

  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportBtnRef = useRef(null)
  const exportMenuRef = useRef(null)
  const [exportMenuPos, setExportMenuPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (!showExportMenu) return
    function handleOutside(e) {
      if (
        !exportBtnRef.current?.contains(e.target) &&
        !exportMenuRef.current?.contains(e.target)
      ) {
        setShowExportMenu(false)
      }
    }
    // Listener attaches after the state change, so the click that opened the
    // menu is already past and won't immediately close it.
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [showExportMenu])

  function toggleExportMenu() {
    if (!showExportMenu && exportBtnRef.current) {
      const r = exportBtnRef.current.getBoundingClientRect()
      setExportMenuPos({ top: r.bottom + 6, left: r.left })
    }
    setShowExportMenu((v) => !v)
  }

  useLayoutEffect(() => {
    // Only auto-center when no saved position
    if (readStorage().x != null) return
    const el = toolbarRef.current
    if (!el) return
    setPos({ x: Math.max(16, (window.innerWidth - el.offsetWidth) / 2), y: 20 })
  }, [])

  function onDragStart(e) {
    e.stopPropagation()
    isDragging.current = true
    const rect = toolbarRef.current.getBoundingClientRect()
    drag.current = { mx: e.clientX, my: e.clientY, tx: rect.left, ty: rect.top }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onDragMove(e) {
    if (!isDragging.current) return
    const dx = e.clientX - drag.current.mx
    const dy = e.clientY - drag.current.my
    const el = toolbarRef.current
    const maxX = window.innerWidth  - (el?.offsetWidth  ?? 500)
    const maxY = window.innerHeight - (el?.offsetHeight ?? 56)
    setPos({
      x: Math.max(0, Math.min(drag.current.tx + dx, maxX)),
      y: Math.max(0, Math.min(drag.current.ty + dy, maxY)),
    })
  }

  function onDragEnd() { isDragging.current = false }

  function toggleVertical() {
    setVertical((v) => {
      // After the DOM updates with the new orientation, clamp position to viewport
      requestAnimationFrame(() => {
        const el = toolbarRef.current
        if (!el) return
        setPos((p) => ({
          x: Math.max(0, Math.min(p.x, window.innerWidth  - el.offsetWidth)),
          y: Math.max(0, Math.min(p.y, window.innerHeight - el.offsetHeight)),
        }))
      })
      return !v
    })
  }

  function pickTool(t, defaultSize) {
    onSetTool(t)
    if (defaultSize !== undefined) onSetStrokeSize(defaultSize)
  }

  const isHighlight = tool === 'highlight'
  const isEraser    = tool === 'eraser'
  const isLasso     = tool === 'lasso'
  const isText      = tool === 'text'
  const isHand      = tool === 'hand'
  const colors      = isHighlight ? HIGHLIGHT_COLORS : PEN_COLORS
  const sizes       = isHighlight ? HIGHLIGHT_SIZES  : PEN_SIZES

  // Text formatting section
  const showTextFormat = isText && selectedText
  // Show minimal delete bar when text selected but another tool is active
  const showTextDeleteOnly = selectedText && !isText
  const showStickerDelete = !!selectedSticker
  const showLassoSection = isLasso
  const showEraserModes = isEraser
  const showColors = !isEraser && !isLasso && !isText && !isHand && !showTextFormat
  const showSizes = !isEraser && !isLasso && !isText && !isHand

  return (
    <>
    <div
      ref={toolbarRef}
      className={`toolbar${vertical ? ' vertical' : ''}`}
      style={{ left: pos.x, top: pos.y }}
    >
      {/* Rotate orientation — always first */}
      <button
        className="tb-btn tb-rotate"
        onClick={toggleVertical}
        title={vertical ? 'Modo horizontal' : 'Modo vertical'}
        aria-label={vertical ? 'Modo horizontal' : 'Modo vertical'}
      >
        <RotateIcon />
      </button>

      {/* Drag handle — second */}
      <div
        className="tb-handle"
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
      >⠿</div>

      {/* Back */}
      <button className="tb-btn" onClick={onBack} title="Voltar à biblioteca">
        <BackIcon />
      </button>

      {/* Undo / Redo */}
      <button
        className="tb-btn"
        onClick={onUndo}
        disabled={!canUndo}
        title="Desfazer (⌘Z)"
        aria-label="Desfazer"
      >
        <UndoIcon />
      </button>
      <button
        className="tb-btn"
        onClick={onRedo}
        disabled={!canRedo}
        title="Refazer (⌘⇧Z)"
        aria-label="Refazer"
      >
        <RedoIcon />
      </button>

      {/* Export */}
      <button
        ref={exportBtnRef}
        className={`tb-btn ${showExportMenu ? 'active' : ''}`}
        onClick={toggleExportMenu}
        title="Exportar"
      >
        <ExportIcon />
      </button>

      <div className="tb-sep" />

      {/* Tools */}
      <button className={`tb-btn ${tool === 'pen'       ? 'active' : ''}`} onClick={() => pickTool('pen', 6)}        title="Caneta">              <PenIcon />       </button>
      <button className={`tb-btn ${tool === 'brush'     ? 'active' : ''}`} onClick={() => pickTool('brush', 6)}      title="Pincel caligráfico">  <BrushIcon />     </button>
      <button className={`tb-btn ${tool === 'highlight' ? 'active' : ''}`} onClick={() => pickTool('highlight', 20)} title="Marcador">            <HighlightIcon /> </button>
      <button className={`tb-btn ${tool === 'eraser'    ? 'active' : ''}`} onClick={() => pickTool('eraser', 20)}    title="Borracha">            <EraserIcon />    </button>
      <button className={`tb-btn ${tool === 'lasso'     ? 'active' : ''}`} onClick={() => pickTool('lasso')}         title="Lasso">               <LassoIcon />     </button>
      <button className={`tb-btn ${tool === 'text'      ? 'active' : ''}`} onClick={() => pickTool('text')}          title="Caixa de texto">      <TextIcon />      </button>
      <button className={`tb-btn ${stickerPanelOpen || tool === 'sticker' ? 'active' : ''}`} onClick={onToggleStickerPanel} title="Adesivos"><StickerIcon /></button>
      <button className={`tb-btn ${tool === 'hand'      ? 'active' : ''}`} onClick={() => pickTool('hand')}          title="Modo dedo — rolar e clicar links do PDF"><HandIcon /></button>

      <div className="tb-sep" />

      {/* Palm rejection toggle */}
      <button
        className={`tb-btn ${pencilOnly ? 'active' : ''}`}
        onClick={onTogglePencilOnly}
        title={pencilOnly ? 'Modo: só Apple Pencil (toque ignorado)' : 'Modo: dedo + Pencil'}
        aria-label={pencilOnly ? 'Só Pencil' : 'Dedo + Pencil'}
      >
        <PencilOnlyIcon active={pencilOnly} />
      </button>

      <div className="tb-sep" />

      {/* ── Adaptive section ── */}

      {showEraserModes && (
        <div className="tb-eraser-modes">
          <button
            className={`tb-emode ${eraserMode === 'stroke' ? 'active' : ''}`}
            onClick={() => onSetEraserMode('stroke')}
            title="Apagar traço inteiro"
          >Tudo</button>
          <button
            className={`tb-emode ${eraserMode === 'highlight' ? 'active' : ''}`}
            onClick={() => onSetEraserMode('highlight')}
            title="Apagar só marcador"
          >Marcador</button>
        </div>
      )}

      {showLassoSection && (
        <div className="tb-lasso-section">
          <button
            className={`tb-action-btn ${!lassoHasSelection ? 'disabled' : ''}`}
            onClick={lassoHasSelection ? onDeleteLassoSelection : undefined}
            title="Deletar seleção"
          >
            <TrashIcon />
            <span>Deletar</span>
          </button>
        </div>
      )}

      {showTextDeleteOnly && (
        <div className="tb-lasso-section">
          <button
            className="tb-action-btn"
            onClick={onDeleteSelectedText}
            title="Deletar caixa de texto"
          >
            <TrashIcon />
            <span>Deletar texto</span>
          </button>
        </div>
      )}

      {showStickerDelete && (
        <div className="tb-lasso-section">
          <button
            className="tb-action-btn"
            onClick={onDeleteSelectedSticker}
            title="Deletar adesivo"
          >
            <TrashIcon />
            <span>Deletar adesivo</span>
          </button>
        </div>
      )}

      {showTextFormat && selectedText && (
        <div className="tb-text-format">
          {/* Font family */}
          <select
            className="tb-select"
            value={selectedText.fontFamily}
            onChange={(e) => onUpdateText(selectedText.id, { fontFamily: e.target.value })}
          >
            {FONT_FAMILIES.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>

          {/* Font size */}
          <select
            className="tb-select tb-select-sm"
            value={selectedText.fontSize}
            onChange={(e) => onUpdateText(selectedText.id, { fontSize: Number(e.target.value) })}
          >
            {FONT_SIZES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Bold */}
          <button
            className={`tb-fmt-btn ${selectedText.bold ? 'active' : ''}`}
            onClick={() => onUpdateText(selectedText.id, { bold: !selectedText.bold })}
            title="Negrito"
          ><strong>B</strong></button>

          {/* Italic */}
          <button
            className={`tb-fmt-btn ${selectedText.italic ? 'active' : ''}`}
            onClick={() => onUpdateText(selectedText.id, { italic: !selectedText.italic })}
            title="Itálico"
          ><em>I</em></button>

          <div className="tb-sep" style={{ height: 18 }} />

          {/* Color swatches */}
          <div className="tb-colors">
            {TEXT_COLORS.map((c) => (
              <button
                key={c}
                className={`tb-color ${c === selectedText.color ? 'active' : ''}`}
                style={{ background: c }}
                onClick={() => onUpdateText(selectedText.id, { color: c })}
                title={c}
              />
            ))}
          </div>

          <div className="tb-sep" style={{ height: 18 }} />

          {/* Delete */}
          <button
            className="tb-action-btn"
            onClick={onDeleteSelectedText}
            title="Deletar caixa de texto"
          >
            <TrashIcon />
          </button>
        </div>
      )}

      {showColors && (
        <div className="tb-colors">
          {colors.map((c) => (
            <button
              key={c}
              className={`tb-color ${isHighlight ? 'tb-color--hl' : ''} ${c === color ? 'active' : ''}`}
              style={{ background: c }}
              onClick={() => { onSetColor(c); if (!isHighlight) onSetTool('pen') }}
              title={c}
            />
          ))}
        </div>
      )}

      {/* Size selector — hidden for eraser/lasso/text */}
      {showSizes && (
        <>
          <div className="tb-sep" />
          <div className="tb-sizes">
            {sizes.map((s) => (
              <button
                key={s.value}
                className={`tb-size-btn ${s.value === strokeSize ? 'active' : ''}`}
                onClick={() => onSetStrokeSize(s.value)}
                title={s.label}
              >
                <span
                  className="tb-size-dot"
                  style={{
                    width: s.visual,
                    height: s.visual,
                    background: isHighlight ? `${color}99` : color,
                  }}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </div>

    {showExportMenu && (
      <div
        ref={exportMenuRef}
        className="tb-export-menu"
        style={{ top: exportMenuPos.top, left: exportMenuPos.left }}
      >
        <button
          className="tb-export-item"
          onClick={() => { setShowExportMenu(false); onExportPng?.() }}
        >
          <ExportIcon />
          <span>Página como PNG</span>
        </button>
        <button
          className="tb-export-item"
          onClick={() => { setShowExportMenu(false); onExportPdf?.() }}
        >
          <ExportIcon />
          <span>Caderno inteiro como PDF</span>
        </button>
      </div>
    )}
    </>
  )
}
