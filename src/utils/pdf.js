import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

export async function openPdf(arrayBuffer) {
  return pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise
}
