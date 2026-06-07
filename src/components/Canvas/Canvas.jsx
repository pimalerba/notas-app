import { useRef, useEffect } from 'react'
import { renderStrokes, renderStroke } from '../../utils/drawing.js'
import './Canvas.css'

const PAPER_STYLE = {
  blank: {},
  lines: {
    backgroundImage:
      'repeating-linear-gradient(to bottom, transparent, transparent 27px, #c2d0de 27px, #c2d0de 28.5px)',
    backgroundPosition: '0 48px',
  },
  grid: {
    backgroundImage: [
      'repeating-linear-gradient(transparent, transparent 27px, #c2d0de 27px, #c2d0de 28.5px),',
      'repeating-linear-gradient(90deg, transparent, transparent 27px, #c2d0de 27px, #c2d0de 28.5px)',
    ].join(' '),
  },
  dots: {
    backgroundImage: 'radial-gradient(circle, #adc0d4 1.6px, transparent 1.6px)',
    backgroundSize: '28px 28px',
    backgroundPosition: '14px 14px',
  },
}

export default function Canvas({
  paperType,
  strokes,
  liveStroke,
  tool,
  onStartStroke,
  onAddPoint,
  onEndStroke,
  onEraseAt,
}) {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const isDown = useRef(false)

  // drawRef sempre aponta para a função de desenho com o closure mais recente
  const drawRef = useRef(null)
  useEffect(() => {
    drawRef.current = () => {
      const canvas = canvasRef.current
      if (!canvas || canvas.width === 0 || canvas.height === 0) return
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      renderStrokes(ctx, strokes)
      if (liveStroke) renderStroke(ctx, liveStroke)
    }
  })

  // Redesenha quando o estado dos traços muda
  useEffect(() => {
    drawRef.current?.()
  }, [strokes, liveStroke])

  // Mantém as dimensões do canvas sincronizadas com o layout
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const obs = new ResizeObserver(([entry]) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const { width, height } = entry.contentRect
      canvas.width = Math.round(width)
      canvas.height = Math.round(height)
      drawRef.current?.()
    })
    obs.observe(wrap)
    return () => obs.disconnect()
  }, [])

  function coords(e) {
    const r = canvasRef.current.getBoundingClientRect()
    return {
      x: e.clientX - r.left,
      y: e.clientY - r.top,
      p: e.pressure > 0 ? e.pressure : 0.5,
    }
  }

  function handlePointerDown(e) {
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch {}
    isDown.current = true
    const { x, y, p } = coords(e)
    if (tool === 'eraser') onEraseAt(x, y)
    else onStartStroke(x, y, p)
  }

  function handlePointerMove(e) {
    if (!isDown.current) return
    const { x, y, p } = coords(e)
    if (tool === 'eraser') onEraseAt(x, y)
    else onAddPoint(x, y, p)
  }

  function handlePointerUp() {
    if (!isDown.current) return
    isDown.current = false
    if (tool !== 'eraser') onEndStroke()
  }

  const paperStyle = PAPER_STYLE[paperType] ?? {}

  return (
    <div
      ref={wrapRef}
      className={`canvas-wrap ${tool === 'eraser' ? 'tool-eraser' : 'tool-pen'}`}
      style={{ background: '#ffffff', ...paperStyle }}
    >
      <canvas
        ref={canvasRef}
        className="drawing-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ touchAction: 'none' }}
      />
    </div>
  )
}
