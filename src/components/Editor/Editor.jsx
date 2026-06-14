import { useState, useEffect, useCallback, useRef } from 'react'
import { getNotebook, getPdfData, putPage } from '../../db/index.js'
import { usePages } from '../../hooks/usePages.js'
import { useDrawing } from '../../hooks/useDrawing.js'
import { useLasso } from '../../hooks/useLasso.js'
import { useTextElements } from '../../hooks/useTextElements.js'
import { openPdf } from '../../utils/pdf.js'
import Canvas from '../Canvas/Canvas.jsx'
import Toolbar from '../Toolbar/Toolbar.jsx'
import PagePanel from '../PagePanel/PagePanel.jsx'
import TextLayer from '../TextLayer/TextLayer.jsx'
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

  useEffect(() => {
    if (notebook && notebook.type !== 'pdf' && pages.length === 0) createPage()
  }, [notebook, pages.length, createPage])

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
    updateStrokes, bulkDeleteStrokes,
    startStroke, addPoint, endStroke, eraseAt,
  } = useDrawing(activePage?.id)

  // Lasso — clear selection when tool changes away from lasso
  const lasso = useLasso(strokes, updateStrokes, bulkDeleteStrokes)
  const prevToolRef = useRef(tool)
  useEffect(() => {
    if (prevToolRef.current === 'lasso' && tool !== 'lasso') lasso.clearSelection()
    prevToolRef.current = tool
  }, [tool])

  // Text elements
  const {
    texts, selectedText, selectedTextId,
    setSelectedTextId, createText, updateText, removeText,
  } = useTextElements(activePage?.id)

  // Delete key: delete lasso selection or selected text element
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const tag = document.activeElement?.tagName
        const editable = document.activeElement?.contentEditable === 'true'
        if (tag === 'INPUT' || tag === 'TEXTAREA' || editable) return

        if (tool === 'lasso' && lasso.hasSelection) {
          e.preventDefault()
          lasso.deleteSelected()
        } else if (selectedTextId) {
          e.preventDefault()
          removeText(selectedTextId)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [tool, lasso, selectedTextId, removeText])

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
          lassoHasSelection={lasso.hasSelection}
          onDeleteLassoSelection={lasso.deleteSelected}
          selectedText={selectedText}
          onUpdateText={updateText}
          onDeleteSelectedText={() => selectedTextId && removeText(selectedTextId)}
        />
        <Canvas
          paperType={notebook?.paperType ?? 'blank'}
          strokes={strokes}
          liveStroke={liveStroke}
          tool={tool}
          pdfDoc={pdfDoc}
          pdfPageNum={activePage?.pdfPageNum ?? null}
          lasso={lasso}
          onStartStroke={startStroke}
          onAddPoint={addPoint}
          onEndStroke={endStroke}
          onEraseAt={eraseAt}
          onThumbnailGenerated={handleThumbnailGenerated}
        />
        <TextLayer
          texts={texts}
          selectedTextId={selectedTextId}
          tool={tool}
          onCreateText={createText}
          onSelectText={setSelectedTextId}
          onUpdateText={updateText}
          onDeleteText={removeText}
        />
      </div>
    </div>
  )
}
