import { useState, useRef, useLayoutEffect } from 'react'
import './Toolbar.css'

const COLORS = [
  '#111827', // Preto
  '#2563eb', // Azul
  '#dc2626', // Vermelho
  '#16a34a', // Verde
  '#ea580c', // Laranja
  '#7c3aed', // Roxo
  '#0891b2', // Teal
  '#6b7280', // Cinza
]

const SIZES = [
  { label: 'Fina',   visual: 6,  value: 2 },
  { label: 'Média',  visual: 11, value: 6 },
  { label: 'Grossa', visual: 17, value: 14 },
]

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

function EraserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11.5l5.5-5.5 3.5 3.5-3.5 3.5H3v-1.5z" />
      <path d="M2.5 14h11" />
    </svg>
  )
}

export default function Toolbar({
  tool, color, strokeSize,
  onSetTool, onSetColor, onSetStrokeSize,
  onBack,
}) {
  const toolbarRef = useRef(null)
  const [pos, setPos] = useState({ x: 0, y: 20 })
  const isDragging = useRef(false)
  const drag = useRef({ mx: 0, my: 0, tx: 0, ty: 0 })

  // Centraliza na montagem
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
    const maxX = window.innerWidth  - (el?.offsetWidth  ?? 400)
    const maxY = window.innerHeight - (el?.offsetHeight ?? 56)
    setPos({
      x: Math.max(0, Math.min(drag.current.tx + dx, maxX)),
      y: Math.max(0, Math.min(drag.current.ty + dy, maxY)),
    })
  }

  function onDragEnd() { isDragging.current = false }

  return (
    <div
      ref={toolbarRef}
      className="toolbar"
      style={{ left: pos.x, top: pos.y }}
    >
      {/* ── Alça de arraste ─── */}
      <div
        className="tb-handle"
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
        title="Arrastar"
      >
        ⠿
      </div>

      {/* ── Voltar ─────────── */}
      <button className="tb-btn" onClick={onBack} title="Voltar à biblioteca">
        <BackIcon />
      </button>

      <div className="tb-sep" />

      {/* ── Ferramentas ────── */}
      <button
        className={`tb-btn ${tool === 'pen' ? 'active' : ''}`}
        onClick={() => onSetTool('pen')}
        title="Caneta"
      >
        <PenIcon />
      </button>
      <button
        className={`tb-btn ${tool === 'eraser' ? 'active' : ''}`}
        onClick={() => onSetTool('eraser')}
        title="Borracha"
      >
        <EraserIcon />
      </button>

      <div className="tb-sep" />

      {/* ── Cores ──────────── */}
      <div className="tb-colors">
        {COLORS.map((c) => (
          <button
            key={c}
            className={`tb-color ${c === color ? 'active' : ''}`}
            style={{ background: c }}
            onClick={() => { onSetColor(c); onSetTool('pen') }}
            title={c}
          />
        ))}
      </div>

      <div className="tb-sep" />

      {/* ── Espessura ──────── */}
      <div className="tb-sizes">
        {SIZES.map((s) => (
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
                background: tool === 'eraser' ? '#9aa5b4' : color,
              }}
            />
          </button>
        ))}
      </div>
    </div>
  )
}
