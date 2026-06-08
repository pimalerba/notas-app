import { useRef, useEffect, useState } from 'react'
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
  pdfDoc,
  pdfPageNum,
  onStartStroke,
  onAddPoint,
  onEndStroke,
  onEraseAt,
}) {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const pdfCanvasRef = useRef(null)
  const isDown = useRef(false)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })

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

  // Renderiza a página do PDF no canvas de fundo
  useEffect(() => {
    const pdfCanvas = pdfCanvasRef.current
    const drawCanvas = canvasRef.current
    if (!pdfCanvas || !pdfDoc || !pdfPageNum || !drawCanvas || drawCanvas.width === 0) return

    if (pdfCanvas.width !== drawCanvas.width || pdfCanvas.height !== drawCanvas.height) {
      pdfCanvas.width = drawCanvas.width
      pdfCanvas.height = drawCanvas.height
    }

    let cancelled = false
    let renderTask = null

    pdfDoc.getPage(pdfPageNum).then((page) => {
      if (cancelled) return
      const viewport = page.getViewport({ scale: 1 })
      const scale = Math.min(pdfCanvas.width / viewport.width, pdfCanvas.height / viewport.height)
      const scaled = page.getViewport({ scale })
      const ctx = pdfCanvas.getContext('2d')
      ctx.clearRect(0, 0, pdfCanvas.width, pdfCanvas.height)
      renderTask = page.render({ canvasContext: ctx, viewport: scaled })
      return renderTask.promise
    }).catch((err) => {
      if (!cancelled) console.error('[PDF render]', err)
    })

    return () => {
      cancelled = true
      renderTask?.cancel()
    }
  }, [pdfDoc, pdfPageNum, canvasSize])

  // Mantém as dimensões do canvas sincronizadas com o layout
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const obs = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      const w = Math.round(width)
      const h = Math.round(height)

      const canvas = canvasRef.current
      if (canvas) { canvas.width = w; canvas.height = h }

      const pdfCanvas = pdfCanvasRef.current
      if (pdfCanvas) { pdfCanvas.width = w; pdfCanvas.height = h }

      setCanvasSize({ width: w, height: h })
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
        ref={pdfCanvasRef}
        className="pdf-canvas"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: pdfDoc ? 'block' : 'none' }}
      />
      <canvas
        ref={canvasRef}
        className="drawing-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ touchAction: 'none', position: 'relative' }}
      />
    </div>
  )
}
