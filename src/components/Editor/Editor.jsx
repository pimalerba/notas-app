import { useState, useEffect, useCallback } from 'react'
import { getNotebook, getPdfData, putPage } from '../../db/index.js'
import { usePages } from '../../hooks/usePages.js'
import { useDrawing } from '../../hooks/useDrawing.js'
import { openPdf } from '../../utils/pdf.js'
import Canvas from '../Canvas/Canvas.jsx'
import Toolbar from '../Toolbar/Toolbar.jsx'
import PagePanel from '../PagePanel/PagePanel.jsx'
import './Editor.css'

export default function Editor({ notebookId, onBack }) {
  const [notebook, setNotebook] = useState(null)
  const [pdfDoc, setPdfDoc] = useState(null)

  useEffect(() => {
    getNotebook(notebookId).then(setNotebook)
  }, [notebookId])

  useEffect(() => {
    if (!notebook || notebook.type !== 'pdf') { setPdfDoc(null); return }
    let cancelled = false
    getPdfData(notebook.id).then((buf) => {
      if (!buf || cancelled) return
      return openPdf(buf).then((doc) => { if (!cancelled) setPdfDoc(doc) })
    })
    return () => { cancelled = true }
  }, [notebook])

  const {
    pages, activePage, loading: pagesLoading,
    createPage, removePage, duplicatePage, reorderPages,
    setActivePageId, updateThumbnail, reloadPages,
  } = usePages(notebookId)

  // Cria a primeira página apenas para cadernos normais (PDFs já têm páginas)
  useEffect(() => {
    if (notebook && notebook.type !== 'pdf' && pages.length === 0) createPage()
  }, [notebook, pages.length, createPage])

  // Fallback: cria páginas do PDF se o background job falhou
  useEffect(() => {
    if (!pdfDoc || pagesLoading || pages.length > 0) return
    const now = Date.now()
    Promise.all(
      Array.from({ length: pdfDoc.numPages }, (_, i) =>
        putPage({
          id: `pg_${notebookId}_${i}`,
          notebookId,
          order: i,
          pdfPageNum: i + 1,
          updatedAt: now,
          thumbnail: null,
        })
      )
    ).then(reloadPages)
  }, [pdfDoc, pagesLoading, pages.length, notebookId, reloadPages])

  const {
    strokes, liveStroke,
    tool, color, strokeSize, eraserMode,
    setTool, setColor, setStrokeSize, setEraserMode,
    startStroke, addPoint, endStroke, eraseAt,
  } = useDrawing(activePage?.id)

  const handleThumbnailGenerated = useCallback((dataUrl) => {
    if (activePage) updateThumbnail(activePage.id, dataUrl)
  }, [activePage, updateThumbnail])

  return (
    <div className="editor">
      <PagePanel
        pages={pages}
        activePageId={activePage?.id ?? null}
        onSelectPage={setActivePageId}
        onAddPage={createPage}
        onDuplicatePage={duplicatePage}
        onDeletePage={removePage}
        onReorderPages={reorderPages}
      />
      <div className="editor-main">
        <Toolbar
          tool={tool}
          color={color}
          strokeSize={strokeSize}
          eraserMode={eraserMode}
          onSetTool={setTool}
          onSetColor={setColor}
          onSetStrokeSize={setStrokeSize}
          onSetEraserMode={setEraserMode}
          onBack={onBack}
        />
        <Canvas
          paperType={notebook?.paperType ?? 'blank'}
          strokes={strokes}
          liveStroke={liveStroke}
          tool={tool}
          pdfDoc={pdfDoc}
          pdfPageNum={activePage?.pdfPageNum ?? null}
          onStartStroke={startStroke}
          onAddPoint={addPoint}
          onEndStroke={endStroke}
          onEraseAt={eraseAt}
          onThumbnailGenerated={handleThumbnailGenerated}
        />
      </div>
    </div>
  )
}
