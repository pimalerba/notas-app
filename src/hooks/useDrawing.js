import { useState, useEffect, useRef, useCallback } from 'react'
import { getStroke } from 'perfect-freehand'
import {
  getStrokes,
  putStroke,
  deleteStroke,
  deleteStrokesByPage,
} from '../db/index.js'

function makeId() {
  return `sk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

const FREEHAND_OPTIONS = {
  pen: {
    thinning: 0.5,
    smoothing: 0.5,
    streamline: 0.5,
    simulatePressure: false,
    last: true,
  },
  brush: {
    thinning: 0.75,
    smoothing: 0.5,
    streamline: 0.35,
    simulatePressure: false,
    last: true,
  },
  highlight: {
    thinning: 0,
    smoothing: 0.9,
    streamline: 0.55,
    simulatePressure: false,
    last: true,
  },
  eraser: {
    thinning: 0,
    smoothing: 0.3,
    streamline: 0.3,
    simulatePressure: false,
    last: true,
  },
}

export function strokeToOutline(stroke) {
  const opts = FREEHAND_OPTIONS[stroke.tool] ?? FREEHAND_OPTIONS.pen
  return getStroke(stroke.points, { ...opts, size: stroke.size })
}

export function useDrawing(pageId) {
  const [strokes, setStrokes] = useState([])
  const [tool, setTool] = useState('pen')
  const [color, setColor] = useState('#111827')
  const [strokeSize, setStrokeSize] = useState(6)
  const [eraserMode, setEraserMode] = useState('stroke')

  const activeStroke = useRef(null)
  const [liveStroke, setLiveStroke] = useState(null)
  const brushState = useRef(null)

  // Generic command history: each entry is { undo: async fn, redo: async fn }
  const undoStack = useRef([])
  const redoStack = useRef([])
  // Reactive flag so toolbar buttons update
  const [historyTick, setHistoryTick] = useState(0)

  // Pending erased strokes collected during a single eraser drag
  const erasedBuffer = useRef([])

  function bumpTick() { setHistoryTick((t) => t + 1) }

  useEffect(() => {
    if (!pageId) {
      setStrokes([])
      setLiveStroke(null)
      activeStroke.current = null
      return
    }
    getStrokes(pageId).then(setStrokes)
    undoStack.current = []
    redoStack.current = []
    erasedBuffer.current = []
    activeStroke.current = null
    setLiveStroke(null)
    bumpTick()
  }, [pageId])

  // ── History helpers ────────────────────────────────────────────────────────

  const pushHistory = useCallback((undoFn, redoFn) => {
    undoStack.current.push({ undo: undoFn, redo: redoFn })
    redoStack.current = []
    bumpTick()
  }, [])

  const undo = useCallback(async () => {
    const cmd = undoStack.current.pop()
    if (!cmd) return
    await cmd.undo()
    redoStack.current.push(cmd)
    bumpTick()
  }, [])

  const redo = useCallback(async () => {
    const cmd = redoStack.current.pop()
    if (!cmd) return
    await cmd.redo()
    undoStack.current.push(cmd)
    bumpTick()
  }, [])

  // ── Bulk restore (used by lasso delete undo) ───────────────────────────────

  const bulkRestoreStrokes = useCallback(async (toRestore) => {
    for (const s of toRestore) await putStroke(s)
    setStrokes((prev) => {
      const existing = new Set(prev.map((s) => s.id))
      return [...prev, ...toRestore.filter((s) => !existing.has(s.id))]
    })
  }, [])

  // ── Drawing ────────────────────────────────────────────────────────────────

  const startStroke = useCallback((x, y, pressure = 0.5) => {
    if (!pageId) return
    // Flush any buffered erases when starting a new action
    if (erasedBuffer.current.length > 0) {
      const erased = [...erasedBuffer.current]
      erasedBuffer.current = []
      pushHistory(
        async () => { await bulkRestoreStrokes(erased) },
        async () => {
          for (const s of erased) await deleteStroke(s.id)
          setStrokes((prev) => { const ids = new Set(erased.map((s) => s.id)); return prev.filter((s) => !ids.has(s.id)) })
        },
      )
    }
    brushState.current = { x, y, t: performance.now() }
    activeStroke.current = {
      id: makeId(),
      pageId,
      tool,
      color,
      size: strokeSize,
      points: [[x, y, pressure]],
    }
    setLiveStroke({ ...activeStroke.current })
  }, [pageId, tool, color, strokeSize, pushHistory, bulkRestoreStrokes])

  const addPoint = useCallback((x, y, pressure = 0.5) => {
    if (!activeStroke.current) return

    let p = pressure
    if (activeStroke.current.tool === 'brush' && brushState.current) {
      const now = performance.now()
      const dt = Math.max(1, now - brushState.current.t)
      const dist = Math.hypot(x - brushState.current.x, y - brushState.current.y)
      const velocity = dist / dt
      p = Math.max(0.05, Math.min(0.98, 1 - velocity * 1.4))
      brushState.current = { x, y, t: now }
    }

    activeStroke.current.points.push([x, y, p])
    setLiveStroke({ ...activeStroke.current })
  }, [])

  const endStroke = useCallback(async () => {
    const s = activeStroke.current
    brushState.current = null
    if (!s || s.points.length < 2) {
      activeStroke.current = null
      setLiveStroke(null)
      return
    }
    activeStroke.current = null
    setLiveStroke(null)
    await putStroke(s)
    setStrokes((prev) => [...prev, s])
    pushHistory(
      async () => { await deleteStroke(s.id); setStrokes((prev) => prev.filter((x) => x.id !== s.id)) },
      async () => { await putStroke(s); setStrokes((prev) => [...prev, s]) },
    )
  }, [pushHistory])

  // ── Eraser ─────────────────────────────────────────────────────────────────

  const eraseAt = useCallback(async (x, y, radius = 20) => {
    const r2 = radius * radius
    const toRemove = strokes.filter((s) => {
      if (eraserMode === 'highlight' && s.tool !== 'highlight') return false
      const alreadyErased = erasedBuffer.current.some((e) => e.id === s.id)
      if (alreadyErased) return false
      return s.points.some(([px, py]) => (px - x) ** 2 + (py - y) ** 2 <= r2)
    })
    if (!toRemove.length) return
    for (const s of toRemove) await deleteStroke(s.id)
    erasedBuffer.current.push(...toRemove)
    setStrokes((prev) => prev.filter((s) => !toRemove.some((r) => r.id === s.id)))
  }, [strokes, eraserMode])

  // Flush erased buffer when pointer is released (called from Canvas via tool change or pointerUp)
  const flushEraseBuffer = useCallback(() => {
    if (erasedBuffer.current.length === 0) return
    const erased = [...erasedBuffer.current]
    erasedBuffer.current = []
    pushHistory(
      async () => { await bulkRestoreStrokes(erased) },
      async () => {
        for (const s of erased) await deleteStroke(s.id)
        setStrokes((prev) => { const ids = new Set(erased.map((s) => s.id)); return prev.filter((s) => !ids.has(s.id)) })
      },
    )
  }, [pushHistory, bulkRestoreStrokes])

  // ── Lasso support (update / delete) ───────────────────────────────────────

  const updateStrokes = useCallback(async (updates) => {
    for (const s of updates) await putStroke(s)
    setStrokes((prev) => prev.map((s) => updates.find((u) => u.id === s.id) ?? s))
  }, [])

  const bulkDeleteStrokes = useCallback(async (ids) => {
    const idSet = new Set(ids)
    for (const id of ids) await deleteStroke(id)
    setStrokes((prev) => prev.filter((s) => !idSet.has(s.id)))
  }, [])

  const clearPage = useCallback(async () => {
    if (!pageId) return
    const snapshot = strokes
    await deleteStrokesByPage(pageId)
    setStrokes([])
    pushHistory(
      async () => { await bulkRestoreStrokes(snapshot) },
      async () => { await deleteStrokesByPage(pageId); setStrokes([]) },
    )
  }, [pageId, strokes, pushHistory, bulkRestoreStrokes])

  return {
    strokes,
    liveStroke,
    tool,
    color,
    strokeSize,
    eraserMode,
    setTool,
    setColor,
    setStrokeSize,
    setEraserMode,
    updateStrokes,
    bulkDeleteStrokes,
    bulkRestoreStrokes,
    startStroke,
    addPoint,
    endStroke,
    eraseAt,
    flushEraseBuffer,
    undo,
    redo,
    pushHistory,
    canUndo: undoStack.current.length > 0,
    canRedo: redoStack.current.length > 0,
    clearPage,
  }
}
