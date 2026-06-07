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

// Opções do perfect-freehand por ferramenta
const FREEHAND_OPTIONS = {
  pen: {
    size: 1,         // multiplicado pelo strokeSize em runtime
    thinning: 0.5,
    smoothing: 0.5,
    streamline: 0.5,
    simulatePressure: false,
    last: true,
  },
  eraser: {
    size: 1,
    thinning: 0,
    smoothing: 0.3,
    streamline: 0.3,
    simulatePressure: false,
    last: true,
  },
}

export function strokeToOutline(stroke) {
  return getStroke(stroke.points, {
    ...FREEHAND_OPTIONS[stroke.tool],
    size: stroke.size,
  })
}

export function useDrawing(pageId) {
  const [strokes, setStrokes] = useState([])
  const [tool, setTool] = useState('pen')
  const [color, setColor] = useState('#1a1a1a')
  const [strokeSize, setStrokeSize] = useState(4)

  // Traço em andamento — em ref para não causar re-render a cada ponto
  const activeStroke = useRef(null)
  // Versão do traço ativo exposta ao canvas via state (só muda no flush)
  const [liveStroke, setLiveStroke] = useState(null)

  // Pilhas de undo/redo armazenam listas de ids
  const undoStack = useRef([]) // cada item: { type: 'add'|'remove', stroke }
  const redoStack = useRef([])

  // Carrega traços do banco quando a página muda
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

  // ── Captura de eventos ─────────────────────────────────────────────────────

  const startStroke = useCallback((x, y, pressure = 0.5) => {
    if (!pageId) return
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
    activeStroke.current.points.push([x, y, pressure])
    // Throttle: só notifica o canvas se acumulou ≥2 pontos novos
    setLiveStroke({ ...activeStroke.current })
  }, [])

  const endStroke = useCallback(async () => {
    const s = activeStroke.current
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

  // ── Undo / Redo ────────────────────────────────────────────────────────────

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

  // ── Limpar página ──────────────────────────────────────────────────────────

  const clearPage = useCallback(async () => {
    if (!pageId) return
    await deleteStrokesByPage(pageId)
    // Empilha como ações individuais de remoção para permitir undo completo
    const snapshot = strokes
    for (const s of snapshot) {
      undoStack.current.push({ type: 'remove', stroke: s })
    }
    redoStack.current = []
    setStrokes([])
  }, [pageId, strokes])

  // ── Borracha por traço ─────────────────────────────────────────────────────
  // Recebe o ponto do ponteiro e remove traços cuja bounding box é tocada.

  const eraseAt = useCallback(async (x, y, radius = 20) => {
    const r2 = radius * radius
    const toRemove = strokes.filter((s) =>
      s.points.some(([px, py]) => (px - x) ** 2 + (py - y) ** 2 <= r2)
    )
    if (!toRemove.length) return

    for (const s of toRemove) {
      await deleteStroke(s.id)
      undoStack.current.push({ type: 'remove', stroke: s })
    }
    redoStack.current = []
    setStrokes((prev) => prev.filter((s) => !toRemove.includes(s)))
  }, [strokes])

  return {
    // Estado
    strokes,
    liveStroke,
    tool,
    color,
    strokeSize,
    // Setters de ferramenta
    setTool,
    setColor,
    setStrokeSize,
    // Eventos de desenho
    startStroke,
    addPoint,
    endStroke,
    eraseAt,
    // Histórico
    undo,
    redo,
    canUndo: undoStack.current.length > 0,
    canRedo: redoStack.current.length > 0,
    // Ações de página
    clearPage,
  }
}
