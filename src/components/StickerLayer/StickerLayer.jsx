import { useRef, useState } from 'react'
import './StickerLayer.css'

const MIN_SIZE = 32

function StickerInstance({ inst, isSelected, onSelect, onUpdate, onDelete }) {
  const [dragging, setDragging] = useState(false)
  const [resizing, setResizing] = useState(null)
  const dragStart = useRef(null)

  // ── Move ───────────────────────────────────────────────────────────────────

  function handlePointerDown(e) {
    if (resizing) return
    e.stopPropagation()
    onSelect()
    setDragging(true)
    dragStart.current = { x: e.clientX - inst.x, y: e.clientY - inst.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e) {
    if (dragging && dragStart.current) {
      onUpdate({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y })
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
    dragStart.current = { x: e.clientX, y: e.clientY, w: inst.width, h: inst.height, ix: inst.x, iy: inst.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handleResizeMove(e) {
    if (!resizing || !dragStart.current) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
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
  onPlace,
  onSelect,
  onUpdate,
  onDelete,
}) {
  const isStickerTool = tool === 'sticker'

  function handleLayerPointerDown(e) {
    if (!isStickerTool || !armedSticker) return
    if (e.target !== e.currentTarget) return
    const rect = e.currentTarget.getBoundingClientRect()
    onPlace(armedSticker, e.clientX - rect.left, e.clientY - rect.top)
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
          onSelect={() => onSelect(inst.id)}
          onUpdate={(changes) => onUpdate(inst.id, changes)}
          onDelete={() => onDelete(inst.id)}
        />
      ))}
    </div>
  )
}
