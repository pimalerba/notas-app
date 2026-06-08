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
  const [eraserMode, setEraserMode] = useState('stroke') // 'stroke' | 'highlight'

  const activeStroke = useRef(null)
  const [liveStroke, setLiveStroke] = useState(null)

  // Para calcular velocidade no brush pen
  const brushState = useRef(null) // { x, y, t }

  const undoStack = useRef([])
  const redoStack = useRef([])

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
    activeStroke.current = null
    setLiveStroke(null)
  }, [pageId])

  const startStroke = useCallback((x, y, pressure = 0.5) => {
    if (!pageId) return
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
  }, [pageId, tool, color, strokeSize])

  const addPoint = useCallback((x, y, pressure = 0.5) => {
    if (!activeStroke.current) return

    let p = pressure

    if (activeStroke.current.tool === 'brush' && brushState.current) {
      const now = performance.now()
      const dt = Math.max(1, now - brushState.current.t)
      const dist = Math.hypot(x - brushState.current.x, y - brushState.current.y)
      const velocity = dist / dt // px/ms
      // velocidade alta → traço fino; velocidade baixa → traço grosso
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
    undoStack.current.push({ type: 'add', stroke: s })
    redoStack.current = []
  }, [])

  const undo = useCallback(async () => {
    const action = undoStack.current.pop()
    if (!action) return
    if (action.type === 'add') {
      await deleteStroke(action.stroke.id)
      setStrokes((prev) => prev.filter((s) => s.id !== action.stroke.id))
      redoStack.current.push({ type: 'remove', stroke: action.stroke })
    } else {
      await putStroke(action.stroke)
      setStrokes((prev) => [...prev, action.stroke])
      redoStack.current.push({ type: 'add', stroke: action.stroke })
    }
  }, [])

  const redo = useCallback(async () => {
    const action = redoStack.current.pop()
    if (!action) return
    if (action.type === 'add') {
      await deleteStroke(action.stroke.id)
      setStrokes((prev) => prev.filter((s) => s.id !== action.stroke.id))
      undoStack.current.push({ type: 'remove', stroke: action.stroke })
    } else {
      await putStroke(action.stroke)
      setStrokes((prev) => [...prev, action.stroke])
      undoStack.current.push({ type: 'add', stroke: action.stroke })
    }
  }, [])

  const clearPage = useCallback(async () => {
    if (!pageId) return
    await deleteStrokesByPage(pageId)
    const snapshot = strokes
    for (const s of snapshot) {
      undoStack.current.push({ type: 'remove', stroke: s })
    }
    redoStack.current = []
    setStrokes([])
  }, [pageId, strokes])

  const eraseAt = useCallback(async (x, y, radius = 20) => {
    const r2 = radius * radius
    const toRemove = strokes.filter((s) => {
      if (eraserMode === 'highlight' && s.tool !== 'highlight') return false
      return s.points.some(([px, py]) => (px - x) ** 2 + (py - y) ** 2 <= r2)
    })
    if (!toRemove.length) return
    for (const s of toRemove) {
      await deleteStroke(s.id)
      undoStack.current.push({ type: 'remove', stroke: s })
    }
    redoStack.current = []
    setStrokes((prev) => prev.filter((s) => !toRemove.includes(s)))
  }, [strokes, eraserMode])

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
    startStroke,
    addPoint,
    endStroke,
    eraseAt,
    undo,
    redo,
    canUndo: undoStack.current.length > 0,
    canRedo: redoStack.current.length > 0,
    clearPage,
  }
}
