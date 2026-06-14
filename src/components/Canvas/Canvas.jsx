import { useRef, useEffect, useState, useCallback } from 'react'
import { renderStrokes, renderStroke } from '../../utils/drawing.js'
import { renderLassoOverlay } from '../../utils/lasso.js'
import { makeDebouncedThumbnail } from '../../utils/thumbnail.js'
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
  // Lasso props
  lasso,
  // Callbacks — drawing
  onStartStroke,
  onAddPoint,
  onEndStroke,
  onEraseAt,
  onEraseEnd,
  // PDF navigation (from annotation link clicks)
  onGoToPage,
  // Palm rejection: when true, only pen/stylus input is accepted
  pencilOnly,
  // Thumbnail
  onThumbnailGenerated,
  // Exposes current canvas size to parent
  sizeRef,
}) {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const pdfCanvasRef = useRef(null)
  const isDown = useRef(false)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const [lassoCursor, setLassoCursor] = useState('crosshair')
  const debouncedThumb = useRef(makeDebouncedThumbnail(1500))
  const [pdfLinks, setPdfLinks] = useState([])

  // drawRef always holds the freshest draw function
  const drawRef = useRef(null)
  useEffect(() => {
    drawRef.current = () => {
      const canvas = canvasRef.current
      if (!canvas || canvas.width === 0 || canvas.height === 0) return
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (lasso && lasso.lassoState !== 'idle' && lasso.selectedIds?.size > 0) {
        // Render non-selected strokes normally
        const nonSelected = strokes.filter((s) => !lasso.selectedIds.has(s.id))
        renderStrokes(ctx, nonSelected)

        // Render selected strokes with move/resize transform applied
        const selected = strokes.filter((s) => lasso.selectedIds.has(s.id))
        if (selected.length > 0) {
          ctx.save()
          if (lasso.lassoState === 'moving' && lasso.moveOffset) {
            const { dx, dy } = lasso.moveOffset
            ctx.translate(dx, dy)
          } else if (lasso.lassoState === 'resizing' && lasso.resizeTransform) {
            const { anchorX, anchorY, scaleX, scaleY } = lasso.resizeTransform
            ctx.translate(anchorX, anchorY)
            ctx.scale(scaleX, scaleY)
            ctx.translate(-anchorX, -anchorY)
          }
          renderStrokes(ctx, selected)
          ctx.restore()
        }
      } else {
        renderStrokes(ctx, strokes)
      }

      if (liveStroke) renderStroke(ctx, liveStroke)

      // Lasso overlay (path + bounding box + handles)
      if (lasso) {
        renderLassoOverlay(ctx, {
          lassoState: lasso.lassoState,
          path: lasso.path,
          bb: lasso.bb,
        })
      }
    }
  })

  useEffect(() => { drawRef.current?.() }, [strokes, liveStroke, lasso])

  // PDF background rendering + annotation link extraction
  useEffect(() => {
    const pdfCanvas = pdfCanvasRef.current
    const drawCanvas = canvasRef.current
    if (!pdfCanvas || !pdfDoc || !pdfPageNum || !drawCanvas || drawCanvas.width === 0) {
      setPdfLinks([])
      return
    }

    if (pdfCanvas.width !== drawCanvas.width || pdfCanvas.height !== drawCanvas.height) {
      pdfCanvas.width = drawCanvas.width
      pdfCanvas.height = drawCanvas.height
    }

    let cancelled = false
    let renderTask = null

    pdfDoc.getPage(pdfPageNum).then(async (page) => {
      if (cancelled) return
      const viewport = page.getViewport({ scale: 1 })
      const scale = Math.min(pdfCanvas.width / viewport.width, pdfCanvas.height / viewport.height)
      const scaled = page.getViewport({ scale })
      const ctx = pdfCanvas.getContext('2d')
      ctx.clearRect(0, 0, pdfCanvas.width, pdfCanvas.height)
      renderTask = page.render({ canvasContext: ctx, viewport: scaled })
      await renderTask.promise

      if (cancelled) return

      // Extract link annotations and compute canvas-space positions
      const annots = await page.getAnnotations()
      const links = []
      for (const annot of annots) {
        if (annot.subtype !== 'Link') continue
        const [vx1, vy1, vx2, vy2] = scaled.convertToViewportRectangle(annot.rect)
        links.push({
          left:   Math.min(vx1, vx2),
          top:    Math.min(vy1, vy2),
          width:  Math.abs(vx2 - vx1),
          height: Math.abs(vy2 - vy1),
          annot,
        })
      }
      if (!cancelled) setPdfLinks(links)
    }).catch((err) => {
      if (!cancelled) console.error('[PDF render]', err)
    })

    return () => { cancelled = true; renderTask?.cancel() }
  }, [pdfDoc, pdfPageNum, canvasSize])

  // Sync canvas size to container
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

      if (sizeRef) sizeRef.current = { width: w, height: h }
      setCanvasSize({ width: w, height: h })
      drawRef.current?.()
    })
    obs.observe(wrap)
    return () => obs.disconnect()
  }, [])

  // Thumbnail generation
  useEffect(() => {
    if (!onThumbnailGenerated || !canvasSize.width || !strokes.length) return
    debouncedThumb.current(strokes, canvasSize.width, canvasSize.height, onThumbnailGenerated)
  }, [strokes, canvasSize, onThumbnailGenerated])

  // ── Pointer event helpers ──────────────────────────────────────────────────

  function coords(e) {
    const r = canvasRef.current.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top, p: e.pressure > 0 ? e.pressure : 0.5 }
  }

  // Returns true if this input should be ignored (palm or filtered by mode)
  function shouldIgnoreInput(e) {
    // Large contact area = palm resting on screen — always reject
    if (e.pointerType === 'touch' && (e.width > 40 || e.height > 40)) return true
    // Pencil-only mode: reject anything that isn't a stylus
    if (pencilOnly && e.pointerType !== 'pen') return true
    return false
  }

  const isDrawingTool = tool === 'pen' || tool === 'brush' || tool === 'highlight' || tool === 'eraser'
  const isLassoTool = tool === 'lasso'
  const isStickerTool = tool === 'sticker'
  const isHandTool = tool === 'hand'

  function handlePointerDown(e) {
    if (tool === 'text' || isStickerTool || isHandTool) return
    if (shouldIgnoreInput(e)) return
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch {}
    isDown.current = true
    const { x, y, p } = coords(e)

    if (isLassoTool && lasso) {
      lasso.pointerDown(x, y)
      return
    }

    if (isDrawingTool) {
      if (tool === 'eraser') onEraseAt(x, y)
      else onStartStroke(x, y, p)
    }
  }

  function handlePointerMove(e) {
    if (shouldIgnoreInput(e)) return
    if (!isDown.current && tool !== 'lasso') return
    const { x, y, p } = coords(e)

    if (isLassoTool && lasso) {
      if (isDown.current) lasso.pointerMove(x, y)
      // Update cursor based on position
      setLassoCursor(lasso.getCursorForPos(x, y))
      return
    }

    if (!isDown.current) return
    if (isDrawingTool) {
      if (tool === 'eraser') onEraseAt(x, y)
      else onAddPoint(x, y, p)
    }
  }

  function handlePointerUp(e) {
    if (!isDown.current) return
    isDown.current = false
    const { x, y } = coords(e)

    if (isLassoTool && lasso) {
      lasso.pointerUp(strokes)
      return
    }

    if (isDrawingTool && tool !== 'eraser') onEndStroke()
    if (tool === 'eraser') onEraseEnd?.()
  }

  // Handle clicks on PDF annotation links (hand tool mode)
  const handleAnnotClick = useCallback(async (annot) => {
    if (!pdfDoc) return
    if (annot.url) {
      window.open(annot.url, '_blank', 'noopener,noreferrer')
      return
    }
    let dest = annot.dest
    if (!dest && annot.action?.type === 'GoTo') dest = annot.action.dest
    if (!dest) return
    if (typeof dest === 'string') {
      dest = await pdfDoc.getDestination(dest)
    }
    if (dest?.[0]) {
      const pageIndex = await pdfDoc.getPageIndex(dest[0])
      onGoToPage?.(pageIndex + 1) // convert to 1-based pdfPageNum
    }
  }, [pdfDoc, onGoToPage])

  const paperStyle = PAPER_STYLE[paperType] ?? {}

  let cursorClass = 'tool-pen'
  if (tool === 'eraser') cursorClass = 'tool-eraser'
  else if (tool === 'lasso') cursorClass = 'tool-lasso'
  else if (tool === 'text') cursorClass = 'tool-text'
  else if (isStickerTool) cursorClass = 'tool-sticker'
  else if (isHandTool) cursorClass = 'tool-hand'

  const extraStyle = tool === 'lasso' ? { cursor: lassoCursor } : {}

  return (
    <div
      ref={wrapRef}
      className={`canvas-wrap ${cursorClass}`}
      style={{ background: '#ffffff', ...paperStyle, ...extraStyle }}
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
        style={{ touchAction: 'none', position: 'absolute', inset: 0, pointerEvents: isHandTool ? 'none' : 'auto' }}
      />
      {/* PDF annotation link overlay — only interactive in hand mode */}
      {pdfDoc && pdfLinks.length > 0 && (
        <div
          className="pdf-annot-layer"
          style={{ pointerEvents: isHandTool ? 'auto' : 'none' }}
        >
          {pdfLinks.map((link, i) => (
            <div
              key={i}
              className="pdf-annot-link"
              style={{
                left:   link.left,
                top:    link.top,
                width:  link.width,
                height: link.height,
              }}
              onClick={() => handleAnnotClick(link.annot)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
