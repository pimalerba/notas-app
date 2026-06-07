import { getStroke } from 'perfect-freehand'

// Opções base do perfect-freehand — espelhadas aqui para uso fora do hook
const FREEHAND_OPTIONS = {
  pen: {
    thinning: 0.5,
    smoothing: 0.5,
    streamline: 0.5,
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

/**
 * Converte o polígono de saída do perfect-freehand em um Path2D usando
 * curvas quadráticas de Bézier entre os pontos médios — produz contornos
 * suaves mesmo com baixa densidade de pontos.
 */
export function outlineToPath2D(outline) {
  const path = new Path2D()
  if (outline.length < 2) return path

  const first = outline[0]
  path.moveTo(first[0], first[1])

  for (let i = 1; i < outline.length - 1; i++) {
    const [x0, y0] = outline[i]
    const [x1, y1] = outline[i + 1]
    // Ponto de controle é o ponto atual; destino é o ponto médio
    path.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
  }

  const last = outline[outline.length - 1]
  path.lineTo(last[0], last[1])
  path.closePath()

  return path
}

/**
 * Calcula o contorno suavizado de um traço e retorna o Path2D pronto para
 * ser pintado no canvas.
 */
export function strokeToPath2D(stroke) {
  const options = { ...FREEHAND_OPTIONS[stroke.tool], size: stroke.size }
  const outline = getStroke(stroke.points, options)
  return outlineToPath2D(outline)
}

/**
 * Pinta um único traço em um CanvasRenderingContext2D.
 * A borracha usa `destination-out` para apagar pixels reais no canvas.
 */
export function renderStroke(ctx, stroke) {
  const path = strokeToPath2D(stroke)

  if (stroke.tool === 'eraser') {
    const prev = ctx.globalCompositeOperation
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fillStyle = 'rgba(0,0,0,1)'
    ctx.fill(path)
    ctx.globalCompositeOperation = prev
  } else {
    ctx.fillStyle = stroke.color
    ctx.fill(path)
  }
}

/**
 * Pinta uma lista de traços em ordem, do mais antigo ao mais recente.
 * Salva e restaura o estado do contexto para não vazar configurações.
 */
export function renderStrokes(ctx, strokes) {
  ctx.save()
  for (const stroke of strokes) {
    renderStroke(ctx, stroke)
  }
  ctx.restore()
}
