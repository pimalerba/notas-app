import { getStroke } from 'perfect-freehand'

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

export function outlineToPath2D(outline) {
  const path = new Path2D()
  if (outline.length < 2) return path
  const first = outline[0]
  path.moveTo(first[0], first[1])
  for (let i = 1; i < outline.length - 1; i++) {
    const [x0, y0] = outline[i]
    const [x1, y1] = outline[i + 1]
    path.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
  }
  const last = outline[outline.length - 1]
  path.lineTo(last[0], last[1])
  path.closePath()
  return path
}

export function strokeToPath2D(stroke) {
  const opts = FREEHAND_OPTIONS[stroke.tool] ?? FREEHAND_OPTIONS.pen
  const outline = getStroke(stroke.points, { ...opts, size: stroke.size })
  return outlineToPath2D(outline)
}

export function renderStroke(ctx, stroke) {
  const path = strokeToPath2D(stroke)

  if (stroke.tool === 'eraser') {
    ctx.save()
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fillStyle = 'rgba(0,0,0,1)'
    ctx.fill(path)
    ctx.restore()
  } else if (stroke.tool === 'highlight') {
    ctx.save()
    ctx.globalCompositeOperation = 'multiply'
    ctx.fillStyle = stroke.color
    ctx.fill(path)
    ctx.restore()
  } else {
    ctx.fillStyle = stroke.color
    ctx.fill(path)
  }
}

// Highlights renderizados por último com multiply:
// - sobre traços de tinta: multiply preserva a cor da tinta (ink * yellow = ink visível)
// - sobre áreas vazias: multiply com transparente ≈ source-over, mostra a cor do marcador
export function renderStrokes(ctx, strokes) {
  ctx.save()
  for (const s of strokes) {
    if (s.tool !== 'highlight') renderStroke(ctx, s)
  }
  for (const s of strokes) {
    if (s.tool === 'highlight') renderStroke(ctx, s)
  }
  ctx.restore()
}
