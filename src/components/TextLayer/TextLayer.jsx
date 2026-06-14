import { useRef, useEffect, useState, useCallback } from 'react'
import './TextLayer.css'

const FONT_MAP = {
  sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
}

const MIN_W = 80
const MIN_H = 32
const HANDLE_SIZE = 8

function TextElement({ el, isSelected, isTextTool, onSelect, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [resizing, setResizing] = useState(null) // 'se' | 'sw' | etc.
  const dragStart = useRef(null)
  const contentRef = useRef(null)

  // Set DOM content imperatively when element loads or page changes.
  // We never let React control the children of the contenteditable div —
  // that would reset the cursor on every keystroke (causing reverse typing).
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.textContent = el.content || ''
    }
  }, [el.id]) // only re-sync on element identity change, not on every content update

  // Enter edit mode when just created (empty element selected)
  useEffect(() => {
    if (isSelected && el.content === '' && isTextTool) {
      enterEdit()
    }
  }, [isSelected, isTextTool]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isSelected) setEditing(false)
  }, [isSelected])

  function enterEdit() {
    setEditing(true)
    setTimeout(() => {
      const el = contentRef.current
      if (!el) return
      el.focus()
      // Place cursor at end
      const range = document.createRange()
      range.selectNodeContents(el)
      range.collapse(false)
      const sel = window.getSelection()
      sel.removeAllRanges()
      sel.addRange(range)
    }, 0)
  }

  // ── Drag to move ──────────────────────────────────────────────────────────

  function handleHeaderPointerDown(e) {
    if (editing) return
    e.stopPropagation()
    onSelect()
    setDragging(true)
    dragStart.current = { x: e.clientX - el.x, y: e.clientY - el.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handleHeaderPointerMove(e) {
    if (!dragging || !dragStart.current) return
    onUpdate({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y })
  }

  function handleHeaderPointerUp() {
    setDragging(false)
    dragStart.current = null
  }

  // ── Resize ────────────────────────────────────────────────────────────────

  function handleResizePointerDown(e, handle) {
    e.stopPropagation()
    setResizing(handle)
    dragStart.current = { x: e.clientX, y: e.clientY, w: el.width, h: el.height }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handleResizePointerMove(e) {
    if (!resizing || !dragStart.current) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    const changes = {}
    if (resizing.includes('e')) changes.width = Math.max(MIN_W, dragStart.current.w + dx)
    if (resizing.includes('s')) changes.height = Math.max(MIN_H, dragStart.current.h + dy)
    if (Object.keys(changes).length) onUpdate(changes)
  }

  function handleResizePointerUp() {
    setResizing(null)
    dragStart.current = null
  }

  // ── Editing ───────────────────────────────────────────────────────────────

  function handleDoubleClick(e) {
    e.stopPropagation()
    onSelect()
    enterEdit()
  }

  function handleContentInput(e) {
    // Save to state/DB — but don't touch the DOM; browser manages cursor
    onUpdate({ content: e.currentTarget.textContent })
  }

  function handleContentKeyDown(e) {
    if (e.key === 'Escape') {
      setEditing(false)
      contentRef.current?.blur()
    }
    e.stopPropagation()
  }

  function handleClick(e) {
    e.stopPropagation()
    onSelect()
  }

  const fontStyle = {
    fontFamily: FONT_MAP[el.fontFamily] ?? FONT_MAP.sans,
    fontSize: el.fontSize,
    color: el.color,
    fontWeight: el.bold ? 'bold' : 'normal',
    fontStyle: el.italic ? 'italic' : 'normal',
  }

  const resizeHandles = ['se', 'sw', 'ne', 'nw'].map((h) => (
    <div
      key={h}
      className={`tx-handle tx-handle-${h}`}
      onPointerDown={(e) => handleResizePointerDown(e, h)}
      onPointerMove={handleResizePointerMove}
      onPointerUp={handleResizePointerUp}
      onPointerCancel={handleResizePointerUp}
    />
  ))

  return (
    <div
      className={`tx-el ${isSelected ? 'selected' : ''} ${dragging ? 'dragging' : ''}`}
      style={{ left: el.x, top: el.y, width: el.width, minHeight: el.height, pointerEvents: 'auto' }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {/* Drag handle bar */}
      <div
        className="tx-drag-bar"
        onPointerDown={handleHeaderPointerDown}
        onPointerMove={handleHeaderPointerMove}
        onPointerUp={handleHeaderPointerUp}
        onPointerCancel={handleHeaderPointerUp}
      />

      {/* Text content — NO React children; content managed imperatively via ref */}
      <div
        ref={contentRef}
        className={`tx-content ${!el.content && !editing ? 'empty' : ''}`}
        contentEditable={editing || undefined}
        suppressContentEditableWarning
        style={fontStyle}
        onInput={handleContentInput}
        onKeyDown={handleContentKeyDown}
        onBlur={() => setEditing(false)}
        data-placeholder="Digite aqui..."
      />

      {/* Delete button (selected) */}
      {isSelected && (
        <button
          className="tx-delete"
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          title="Deletar caixa de texto"
        >×</button>
      )}

      {/* Resize handles */}
      {isSelected && resizeHandles}
    </div>
  )
}

export default function TextLayer({
  texts,
  selectedTextId,
  tool,
  onCreateText,
  onSelectText,
  onUpdateText,
  onDeleteText,
}) {
  const isTextTool = tool === 'text'

  function handleLayerPointerDown(e) {
    if (!isTextTool) return
    if (e.target !== e.currentTarget) return
    const rect = e.currentTarget.getBoundingClientRect()
    onCreateText(e.clientX - rect.left, e.clientY - rect.top)
  }

  function handleLayerClick(e) {
    // Click on empty space deselects
    if (e.target === e.currentTarget) onSelectText(null)
  }

  return (
    <div
      className="text-layer"
      // Only the background layer captures events when text tool is active.
      // Individual text elements always have pointer-events: auto (set inline)
      // so they remain clickable regardless of the active tool.
      style={{ pointerEvents: isTextTool ? 'auto' : 'none' }}
      onPointerDown={handleLayerPointerDown}
      onClick={handleLayerClick}
    >
      {texts.map((el) => (
        <TextElement
          key={el.id}
          el={el}
          isSelected={el.id === selectedTextId}
          isTextTool={isTextTool}
          onSelect={() => onSelectText(el.id)}
          onUpdate={(changes) => onUpdateText(el.id, changes)}
          onDelete={() => onDeleteText(el.id)}
        />
      ))}
    </div>
  )
}
