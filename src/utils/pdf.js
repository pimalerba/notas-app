import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

export async function openPdf(arrayBuffer) {
  return pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise
}

// Renders page 1 of an already-opened PDF document to a JPEG data URL.
export async function renderPdfCoverThumb(pdfDoc, targetWidth = 320) {
  const page = await pdfDoc.getPage(1)
  const viewport = page.getViewport({ scale: 1 })
  const scale = targetWidth / viewport.width
  const scaled = page.getViewport({ scale })

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(scaled.width)
  canvas.height = Math.round(scaled.height)
  await page.render({ canvasContext: canvas.getContext('2d'), viewport: scaled }).promise
  return canvas.toDataURL('image/jpeg', 0.82)
}
