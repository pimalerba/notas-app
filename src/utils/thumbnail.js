import { renderStrokes } from './drawing.js'

const THUMB_WIDTH = 240
const THUMB_HEIGHT = 160
const PAGE_BG = '#ffffff'

/**
 * Gera uma miniatura PNG (data URL) de uma página a partir de seus traços.
 *
 * pageWidth/pageHeight são as dimensões reais do canvas de origem — usados
 * para calcular a escala de forma que o conteúdo caiba proporcionalmente na
 * miniatura sem distorção.
 *
 * Retorna null se não houver traços (evita sobrescrever a última miniatura
 * válida com um quadrado em branco).
 */
export function generateThumbnail(
  strokes,
  pageWidth,
  pageHeight,
  thumbWidth = THUMB_WIDTH,
  thumbHeight = THUMB_HEIGHT,
) {
  if (!strokes.length) return null

  const scale = Math.min(thumbWidth / pageWidth, thumbHeight / pageHeight)

  // OffscreenCanvas está disponível em todos os browsers modernos e em workers
  const canvas = new OffscreenCanvas(thumbWidth, thumbHeight)
  const ctx = canvas.getContext('2d')

  // Fundo
  ctx.fillStyle = PAGE_BG
  ctx.fillRect(0, 0, thumbWidth, thumbHeight)

  // Escala os traços para o tamanho da miniatura
  ctx.save()
  ctx.scale(scale, scale)
  renderStrokes(ctx, strokes)
  ctx.restore()

  // Converte para Blob e depois para data URL de forma síncrona via canvas 2D
  // OffscreenCanvas.convertToBlob é async; usamos um canvas normal para
  // poder chamar toDataURL() de forma síncrona no thread principal.
  const fallback = document.createElement('canvas')
  fallback.width = thumbWidth
  fallback.height = thumbHeight
  const fctx = fallback.getContext('2d')
  fctx.drawImage(canvas, 0, 0)
  return fallback.toDataURL('image/png', 0.7)
}

/**
 * Versão debounced: retorna uma função que gera a miniatura no máximo uma
 * vez a cada `delay` ms. Útil para chamar durante o desenho sem travar a UI.
 */
export function makeDebouncedThumbnail(delay = 1500) {
  let timer = null
  return function debouncedThumbnail(strokes, pageWidth, pageHeight, cb) {
    clearTimeout(timer)
    timer = setTimeout(() => {
      const dataUrl = generateThumbnail(strokes, pageWidth, pageHeight)
      if (dataUrl) cb(dataUrl)
    }, delay)
  }
}
