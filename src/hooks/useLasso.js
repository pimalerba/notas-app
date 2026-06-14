import { useState, useRef } from 'react'
import {
  strokeHitsPolygon,
  computeBB,
  hitHandle,
  hitBB,
  computeResizeTransform,
  applyPointTransform,
} from '../utils/lasso.js'

// state: 'idle' | 'drawing' | 'selected' | 'moving' | 'resizing'

export function useLasso(strokes, onUpdateStrokes, onBulkDeleteStrokes, onBulkRestoreStrokes, onHistory) {
  const [state, setState] = useState('idle')
  const [path, setPath] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [moveOffset, setMoveOffset] = useState({ dx: 0, dy: 0 })
  const [resizeTransform, setResizeTransform] = useState(null)

  const dragStart = useRef(null)
  const savedBB = useRef(null)
  const savedHandle = useRef(null)

  const selectedStrokes = strokes.filter((s) => selectedIds.has(s.id))

  // Bounding box accounting for current move offset
  const bb = (() => {
    if (!selectedStrokes.length) return null
    const { dx, dy } = state === 'moving' ? moveOffset : { dx: 0, dy: 0 }
    return computeBB(selectedStrokes, dx, dy)
  })()

  // BB with resize transform applied (for display during resizing)
  const displayBB = (() => {
    if (state !== 'resizing' || !resizeTransform || !savedBB.current) return bb
    const { anchorX, anchorY, scaleX, scaleY } = resizeTransform
    const b = savedBB.current
    return {
      x: anchorX + (b.x - anchorX) * scaleX,
      y: anchorY + (b.y - anchorY) * scaleY,
      w: b.w * scaleX,
      h: b.h * scaleY,
    }
  })()

  // ── Event handlers ─────────────────────────────────────────────────────────

  function pointerDown(x, y) {
    if (state === 'selected' || state === 'resizing') {
      const handle = hitHandle(x, y, bb)
      if (handle) {
        savedBB.current = bb
        savedHandle.current = handle
        dragStart.current = { x, y }
        setState('resizing')
        return 'resize'
      }
      if (hitBB(x, y, bb)) {
        dragStart.current = { x, y }
        setState('moving')
        return 'move'
      }
      // Click outside: start new lasso
      clearSelection()
    }
    // Start drawing
    setState('drawing')
    setPath([[x, y]])
    return 'draw'
  }

  function pointerMove(x, y) {
    if (state === 'drawing') {
      setPath((prev) => [...prev, [x, y]])
    } else if (state === 'moving' && dragStart.current) {
      setMoveOffset({ dx: x - dragStart.current.x, dy: y - dragStart.current.y })
    } else if (state === 'resizing' && dragStart.current && savedBB.current) {
      const t = computeResizeTransform(
        savedBB.current,
        savedHandle.current,
        x - dragStart.current.x,
        y - dragStart.current.y,
      )
      setResizeTransform(t)
    }
  }

  async function pointerUp(allStrokes) {
    if (state === 'drawing') {
      const polygon = path
      if (polygon.length < 3) { setState('idle'); setPath([]); return }
      const ids = new Set(
        allStrokes.filter((s) => strokeHitsPolygon(s, polygon)).map((s) => s.id),
      )
      if (ids.size === 0) { setState('idle'); setPath([]); return }
      setSelectedIds(ids)
      setState('selected')
      return
    }

    if (state === 'moving' && dragStart.current) {
      const { dx, dy } = moveOffset
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        const originals = selectedStrokes.map((s) => ({ ...s }))
        const updated = selectedStrokes.map((s) => ({
          ...s,
          points: s.points.map(([px, py, pp]) => [px + dx, py + dy, pp]),
          updatedAt: Date.now(),
        }))
        await onUpdateStrokes(updated)
        onHistory?.(
          async () => onUpdateStrokes(originals),
          async () => onUpdateStrokes(updated),
        )
      }
      setMoveOffset({ dx: 0, dy: 0 })
      dragStart.current = null
      setState('selected')
      return
    }

    if (state === 'resizing' && resizeTransform && savedBB.current) {
      const t = resizeTransform
      const originals = selectedStrokes.map((s) => ({ ...s }))
      const updated = selectedStrokes.map((s) => ({
        ...s,
        size: Math.max(1, s.size * Math.sqrt(Math.abs(t.scaleX * t.scaleY))),
        points: s.points.map(([px, py, pp]) => applyPointTransform(px, py, pp, t)),
        updatedAt: Date.now(),
      }))
      await onUpdateStrokes(updated)
      onHistory?.(
        async () => onUpdateStrokes(originals),
        async () => onUpdateStrokes(updated),
      )
      setResizeTransform(null)
      savedBB.current = null
      savedHandle.current = null
      dragStart.current = null
      setState('selected')
    }
  }

  async function deleteSelected() {
    if (!selectedIds.size) return
    const deleted = selectedStrokes.map((s) => ({ ...s }))
    await onBulkDeleteStrokes([...selectedIds])
    onHistory?.(
      async () => onBulkRestoreStrokes?.(deleted),
      async () => onBulkDeleteStrokes([...deleted.map((s) => s.id)]),
    )
    clearSelection()
  }

  function clearSelection() {
    setState('idle')
    setSelectedIds(new Set())
    setPath([])
    setMoveOffset({ dx: 0, dy: 0 })
    setResizeTransform(null)
    dragStart.current = null
  }

  // ── Cursor hint ────────────────────────────────────────────────────────────

  function getCursorForPos(x, y) {
    if (state === 'idle' || state === 'drawing') return 'crosshair'
    if (bb) {
      const h = hitHandle(x, y, bb)
      if (h) {
        const map = { nw: 'nw-resize', ne: 'ne-resize', sw: 'sw-resize', se: 'se-resize' }
        return map[h]
      }
      if (hitBB(x, y, bb)) return 'move'
    }
    return 'crosshair'
  }

  return {
    lassoState: state,
    path,
    selectedIds,
    selectedStrokes,
    bb: displayBB,
    moveOffset,
    resizeTransform,
    hasSelection: selectedIds.size > 0,
    pointerDown,
    pointerMove,
    pointerUp,
    deleteSelected,
    clearSelection,
    getCursorForPos,
  }
}
