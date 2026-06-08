import { useState, useRef, useLayoutEffect } from 'react'
import './Toolbar.css'

const PEN_COLORS = [
  '#111827', '#2563eb', '#dc2626', '#16a34a',
  '#ea580c', '#7c3aed', '#0891b2', '#6b7280',
]

const HIGHLIGHT_COLORS = [
  '#FFE500', '#72F272', '#5DD5FF', '#FFB0E0', '#FFAA22',
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

// ── Ícones ────────────────────────────────────────────────────────────────────

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

// ── Componente principal ───────────────────────────────────────────────────────

export default function Toolbar({
  tool, color, strokeSize, eraserMode,
  onSetTool, onSetColor, onSetStrokeSize, onSetEraserMode,
  onBack,
}) {
  const toolbarRef = useRef(null)
  const [pos, setPos] = useState({ x: 0, y: 20 })
  const isDragging = useRef(false)
  const drag = useRef({ mx: 0, my: 0, tx: 0, ty: 0 })

  useLayoutEffect(() => {
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

  function pickTool(t, defaultSize) {
    onSetTool(t)
    if (defaultSize !== undefined) onSetStrokeSize(defaultSize)
  }

  const isHighlight = tool === 'highlight'
  const isEraser    = tool === 'eraser'
  const colors      = isHighlight ? HIGHLIGHT_COLORS : PEN_COLORS
  const sizes       = isHighlight ? HIGHLIGHT_SIZES  : PEN_SIZES

  return (
    <div
      ref={toolbarRef}
      className="toolbar"
      style={{ left: pos.x, top: pos.y }}
    >
      {/* Alça de arraste */}
      <div
        className="tb-handle"
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
      >⠿</div>

      {/* Voltar */}
      <button className="tb-btn" onClick={onBack} title="Voltar à biblioteca">
        <BackIcon />
      </button>

      <div className="tb-sep" />

      {/* Ferramentas */}
      <button className={`tb-btn ${tool === 'pen'       ? 'active' : ''}`} onClick={() => pickTool('pen', 6)}        title="Caneta">        <PenIcon />       </button>
      <button className={`tb-btn ${tool === 'brush'     ? 'active' : ''}`} onClick={() => pickTool('brush', 6)}      title="Pincel caligráfico"><BrushIcon />     </button>
      <button className={`tb-btn ${tool === 'highlight' ? 'active' : ''}`} onClick={() => pickTool('highlight', 20)} title="Marcador">      <HighlightIcon /> </button>
      <button className={`tb-btn ${tool === 'eraser'    ? 'active' : ''}`} onClick={() => pickTool('eraser', 20)}    title="Borracha">      <EraserIcon />    </button>

      <div className="tb-sep" />

      {/* Seção adaptativa: cores ou modo borracha */}
      {isEraser ? (
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
      ) : (
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

      {/* Espessura — oculta quando borracha está em modo destaque */}
      {!isEraser && (
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
                    background: isHighlight
                      ? `${color}99`
                      : tool === 'eraser' ? '#9aa5b4' : color,
                  }}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
