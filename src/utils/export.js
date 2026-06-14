import { jsPDF } from 'jspdf'
import { renderStrokes } from './drawing.js'
import { openPdf } from './pdf.js'
import { getStrokes, getTextElements, getPageStickerInstances } from '../db/index.js'

const FONT_CANVAS_MAP = {
  sans: 'system-ui, sans-serif',
  serif: 'Georgia, serif',
  mono: 'monospace',
}

function drawPaperPattern(ctx, paperType, width, height) {
  if (paperType === 'lines') {
    ctx.save()
    ctx.strokeStyle = '#c2d0de'
    ctx.lineWidth = 1.5
    for (let y = 48; y < height; y += 28) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke()
    }
    ctx.restore()
  } else if (paperType === 'grid') {
    ctx.save()
    ctx.strokeStyle = '#c2d0de'
    ctx.lineWidth = 1.5
    for (let y = 0; y < height; y += 28) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke()
    }
    for (let x = 0; x < width; x += 28) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke()
    }
    ctx.restore()
  } else if (paperType === 'dots') {
    ctx.save()
    ctx.fillStyle = '#adc0d4'
    for (let x = 14; x < width; x += 28) {
      for (let y = 14; y < height; y += 28) {
        ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI * 2); ctx.fill()
      }
    }
    ctx.restore()
  }
}

async function renderPdfPage(pdfDoc, pageNum, ctx, width, height) {
  const page = await pdfDoc.getPage(pageNum)
  const viewport = page.getViewport({ scale: 1 })
  const scale = Math.min(width / viewport.width, height / viewport.height)
  const scaled = page.getViewport({ scale })

  const offscreen = document.createElement('canvas')
  offscreen.width = width
  offscreen.height = height
  const offCtx = offscreen.getContext('2d')
  await page.render({ canvasContext: offCtx, viewport: scaled }).promise
  ctx.drawImage(offscreen, 0, 0)
}

function wrapText(ctx, text, maxWidth) {
  const lines = []
  for (const paragraph of text.split('\n')) {
    if (!paragraph) { lines.push(''); continue }
    const words = paragraph.split(' ')
    let line = ''
    for (const word of words) {
      const test = line ? `${line} ${word}` : word
      if (line && ctx.measureText(test).width > maxWidth) {
        lines.push(line)
        line = word
      } else {
        line = test
      }
    }
    lines.push(line)
  }
  return lines
}

function drawTexts(ctx, texts) {
  for (const el of texts) {
    if (!el.content) continue
    const fontFamily = FONT_CANVAS_MAP[el.fontFamily] ?? FONT_CANVAS_MAP.sans
    const weight = el.bold ? 'bold' : 'normal'
    const style = el.italic ? 'italic' : 'normal'
    ctx.save()
    ctx.font = `${style} ${weight} ${el.fontSize}px ${fontFamily}`
    ctx.fillStyle = el.color
    ctx.textBaseline = 'top'
    const lineHeight = el.fontSize * 1.4
    const lines = wrapText(ctx, el.content, el.width - 8)
    lines.forEach((line, i) => {
      ctx.fillText(line, el.x + 4, el.y + 24 + i * lineHeight)
    })
    ctx.restore()
  }
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = dataUrl
  })
}

async function drawStickers(ctx, instances) {
  for (const inst of instances) {
    try {
      const img = await loadImage(inst.dataUrl)
      ctx.drawImage(img, inst.x, inst.y, inst.width, inst.height)
    } catch {}
  }
}

async function buildPageCanvas(page, { strokes, texts, stickerInstances, pdfDoc, paperType, width, height }) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  drawPaperPattern(ctx, paperType, width, height)

  if (pdfDoc && page.pdfPageNum) {
    await renderPdfPage(pdfDoc, page.pdfPageNum, ctx, width, height)
  }

  renderStrokes(ctx, strokes)
  await drawStickers(ctx, stickerInstances)
  drawTexts(ctx, texts)

  return canvas
}

function triggerDownload(dataUrl, filename) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  a.click()
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10)
}

export async function exportPageAsPng({ page, strokes, texts, stickerInstances, pdfDoc, paperType, width, height, notebookName }) {
  const canvas = await buildPageCanvas(page, { strokes, texts, stickerInstances, pdfDoc, paperType, width, height })
  triggerDownload(canvas.toDataURL('image/png'), `${notebookName}_${dateStamp()}.png`)
}

export async function exportNotebookAsPdf({ notebook, pages, pdfDoc, paperType, width, height }) {
  const orientation = width >= height ? 'landscape' : 'portrait'
  const doc = new jsPDF({ orientation, unit: 'px', format: [width, height], compress: true })

  for (let i = 0; i < pages.length; i++) {
    const p = pages[i]
    const [strokes, texts, stickerInstances] = await Promise.all([
      getStrokes(p.id),
      getTextElements(p.id),
      getPageStickerInstances(p.id),
    ])

    const canvas = await buildPageCanvas(p, { strokes, texts, stickerInstances, pdfDoc, paperType, width, height })
    const imgData = canvas.toDataURL('image/jpeg', 0.92)
    if (i > 0) doc.addPage([width, height], orientation)
    doc.addImage(imgData, 'JPEG', 0, 0, width, height)
  }

  doc.save(`${notebook.name}_${dateStamp()}.pdf`)
}
