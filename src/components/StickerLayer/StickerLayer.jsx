import { useRef, useState } from 'react'
import './StickerLayer.css'

const MIN_SIZE = 32

function StickerInstance({ inst, isSelected, screenToCanvas, onSelect, onUpdate, onDelete }) {
  const [dragging, setDragging] = useState(false)
  const [resizing, setResizing] = useState(null)
  const dragStart = useRef(null)

  // ── Move ───────────────────────────────────────────────────────────────────

  function handlePointerDown(e) {
    if (resizing) return
    e.stopPropagation()
    onSelect()
    setDragging(true)
    const pos = screenToCanvas(e.clientX, e.clientY)
    dragStart.current = { x: pos.x - inst.x, y: pos.y - inst.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e) {
    if (dragging && dragStart.current) {
      const pos = screenToCanvas(e.clientX, e.clientY)
      onUpdate({ x: pos.x - dragStart.current.x, y: pos.y - dragStart.current.y })
    }
  }

  function handlePointerUp() {
    setDragging(false)
    dragStart.current = null
  }

  // ── Resize ─────────────────────────────────────────────────────────────────

  function handleResizeDown(e, handle) {
    e.stopPropagation()
    setResizing(handle)
    const pos = screenToCanvas(e.clientX, e.clientY)
    dragStart.current = { x: pos.x, y: pos.y, w: inst.width, h: inst.height, ix: inst.x, iy: inst.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handleResizeMove(e) {
    if (!resizing || !dragStart.current) return
    const pos = screenToCanvas(e.clientX, e.clientY)
    const dx = pos.x - dragStart.current.x
    const dy = pos.y - dragStart.current.y
    const { w, h, ix, iy } = dragStart.current
    const ratio = w / h
    const changes = {}

    if (resizing === 'se') {
      const size = Math.max(MIN_SIZE, Math.max(w + dx, h + dy))
      changes.width = size
      changes.height = Math.round(size / ratio)
    } else if (resizing === 'sw') {
      const size = Math.max(MIN_SIZE, Math.max(w - dx, h + dy))
      changes.width = size
      changes.height = Math.round(size / ratio)
      changes.x = ix + (w - size)
    } else if (resizing === 'ne') {
      const size = Math.max(MIN_SIZE, Math.max(w + dx, h - dy))
      changes.width = size
      changes.height = Math.round(size / ratio)
      changes.y = iy + (h - Math.round(size / ratio))
    } else if (resizing === 'nw') {
      const size = Math.max(MIN_SIZE, Math.max(w - dx, h - dy))
      changes.width = size
      changes.height = Math.round(size / ratio)
      changes.x = ix + (w - size)
      changes.y = iy + (h - Math.round(size / ratio))
    }

    if (Object.keys(changes).length) onUpdate(changes)
  }

  function handleResizeUp() {
    setResizing(null)
    dragStart.current = null
  }

  const handles = ['nw', 'ne', 'sw', 'se']

  return (
    <div
      className={`si-el ${isSelected ? 'selected' : ''} ${dragging ? 'dragging' : ''}`}
      style={{ left: inst.x, top: inst.y, width: inst.width, height: inst.height, pointerEvents: 'auto' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClick={(e) => { e.stopPropagation(); onSelect() }}
    >
      <img src={inst.dataUrl} alt="" draggable={false} />

      {isSelected && (
        <>
          <button
            className="si-delete"
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            title="Deletar adesivo"
          >×</button>

          {handles.map((h) => (
            <div
              key={h}
              className={`si-handle si-handle-${h}`}
              onPointerDown={(e) => handleResizeDown(e, h)}
              onPointerMove={handleResizeMove}
              onPointerUp={handleResizeUp}
              onPointerCancel={handleResizeUp}
            />
          ))}
        </>
      )}
    </div>
  )
}

export default function StickerLayer({
  instances,
  stickers,
  selectedId,
  tool,
  armedSticker,
  screenToCanvas,
  onPlace,
  onSelect,
  onUpdate,
  onDelete,
}) {
  const isStickerTool = tool === 'sticker'
  const toCanvas = screenToCanvas ?? ((x, y) => ({ x, y }))

  function handleLayerPointerDown(e) {
    if (!isStickerTool || !armedSticker) return
    if (e.target !== e.currentTarget) return
    const pos = toCanvas(e.clientX, e.clientY)
    onPlace(armedSticker, pos.x, pos.y)
  }

  function handleLayerClick(e) {
    if (e.target === e.currentTarget) onSelect(null)
  }

  return (
    <div
      className="sticker-layer"
      style={{ pointerEvents: isStickerTool ? 'auto' : 'none' }}
      onPointerDown={handleLayerPointerDown}
      onClick={handleLayerClick}
    >
      {instances.map((inst) => (
        <StickerInstance
          key={inst.id}
          inst={inst}
          isSelected={inst.id === selectedId}
          screenToCanvas={toCanvas}
          onSelect={() => onSelect(inst.id)}
          onUpdate={(changes) => onUpdate(inst.id, changes)}
          onDelete={() => onDelete(inst.id)}
        />
      ))}
    </div>
  )
}
