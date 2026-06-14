import { useState, useEffect, useCallback, useRef } from 'react'
import { getNotebook, getPdfData, putPage } from '../../db/index.js'
import { usePages } from '../../hooks/usePages.js'
import { useDrawing } from '../../hooks/useDrawing.js'
import { useLasso } from '../../hooks/useLasso.js'
import { useTextElements } from '../../hooks/useTextElements.js'
import { useStickers } from '../../hooks/useStickers.js'
import { useStickerInstances } from '../../hooks/useStickerInstances.js'
import { useZoom } from '../../hooks/useZoom.js'
import { openPdf } from '../../utils/pdf.js'
import { exportPageAsPng, exportNotebookAsPdf } from '../../utils/export.js'
import Canvas from '../Canvas/Canvas.jsx'
import Toolbar from '../Toolbar/Toolbar.jsx'
import PagePanel from '../PagePanel/PagePanel.jsx'
import TextLayer from '../TextLayer/TextLayer.jsx'
import StickerLayer from '../StickerLayer/StickerLayer.jsx'
import StickerPanel from '../StickerPanel/StickerPanel.jsx'
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
    updateStrokes, bulkDeleteStrokes, bulkRestoreStrokes,
    startStroke, addPoint, endStroke, eraseAt, flushEraseBuffer,
    undo, redo, canUndo, canRedo, pushHistory,
  } = useDrawing(activePage?.id)

  // Lasso
  const lasso = useLasso(strokes, updateStrokes, bulkDeleteStrokes, bulkRestoreStrokes, pushHistory)
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

  // Sticker library (global, not per-page)
  const { stickers, importSticker, removeSticker } = useStickers()

  // Sticker instances (per page)
  const {
    instances: stickerInstances,
    selectedId: selectedStickerId,
    selectedInstance: selectedStickerInstance,
    setSelectedId: setSelectedStickerId,
    placeSticker,
    updateInstance: updateStickerInstance,
    removeInstance: removeStickerInstance,
  } = useStickerInstances(activePage?.id)

  const [armedSticker, setArmedSticker] = useState(null) // sticker definition ready to place
  const [showStickerPanel, setShowStickerPanel] = useState(false)
  const [pencilOnly, setPencilOnly] = useState(false)

  const { zoom, panX, panY, containerRef, applyGesture, resetZoom, screenToCanvas } = useZoom()
  const [showZoomBadge, setShowZoomBadge] = useState(false)
  const zoomBadgeTimer = useRef(null)
  useEffect(() => {
    if (zoom === 1) { setShowZoomBadge(false); return }
    setShowZoomBadge(true)
    clearTimeout(zoomBadgeTimer.current)
    zoomBadgeTimer.current = setTimeout(() => setShowZoomBadge(false), 2000)
    return () => clearTimeout(zoomBadgeTimer.current)
  }, [zoom])

  const canvasSizeRef = useRef({ width: 1280, height: 900 })
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  function showToast(msg) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = setTimeout(() => setToast(null), 2500)
  }

  function handleStickerSelect(sticker) {
    setArmedSticker(sticker)
    setTool('sticker')
  }

  async function handleExportPng() {
    if (!activePage) return
    const { width, height } = canvasSizeRef.current
    await exportPageAsPng({
      page: activePage,
      strokes,
      texts,
      stickerInstances,
      pdfDoc,
      paperType: notebook?.paperType ?? 'blank',
      width,
      height,
      notebookName: notebook?.name ?? 'notas',
    })
    showToast('Página exportada como PNG ✓')
  }

  function handleGoToPage(pdfPageNum) {
    const target = pages.find((p) => p.pdfPageNum === pdfPageNum)
    if (target) setActivePageId(target.id)
  }

  async function handleExportPdf() {
    if (!notebook) return
    const { width, height } = canvasSizeRef.current
    await exportNotebookAsPdf({
      notebook,
      pages,
      pdfDoc,
      paperType: notebook?.paperType ?? 'blank',
      width,
      height,
    })
    showToast('Caderno exportado como PDF ✓')
  }

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e) {
      const tag = document.activeElement?.tagName
      const editable = document.activeElement?.contentEditable === 'true'
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || editable

      // Undo: Cmd+Z / Ctrl+Z
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        if (inInput) return
        e.preventDefault()
        undo()
        return
      }

      // Redo: Cmd+Shift+Z / Ctrl+Y
      if (
        ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') ||
        (e.ctrlKey && e.key === 'y')
      ) {
        if (inInput) return
        e.preventDefault()
        redo()
        return
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (inInput) return

        if (tool === 'lasso' && lasso.hasSelection) {
          e.preventDefault()
          lasso.deleteSelected()
        } else if (selectedTextId) {
          e.preventDefault()
          removeText(selectedTextId)
        } else if (selectedStickerId) {
          e.preventDefault()
          removeStickerInstance(selectedStickerId)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [tool, lasso, selectedTextId, removeText, selectedStickerId, removeStickerInstance, undo, redo])

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
      <div className="editor-main" ref={containerRef}>
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
          stickerPanelOpen={showStickerPanel}
          onToggleStickerPanel={() => setShowStickerPanel((v) => !v)}
          selectedSticker={selectedStickerInstance}
          onDeleteSelectedSticker={() => selectedStickerId && removeStickerInstance(selectedStickerId)}
          onExportPng={handleExportPng}
          onExportPdf={handleExportPdf}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
          pencilOnly={pencilOnly}
          onTogglePencilOnly={() => setPencilOnly((v) => !v)}
          zoom={zoom}
          onZoomReset={resetZoom}
        />

        {/* Viewport: all drawing layers scale and pan together */}
        <div
          className="editor-viewport"
          style={{ transform: `translate(${panX}px,${panY}px) scale(${zoom})` }}
        >
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
          onEraseEnd={flushEraseBuffer}
          onThumbnailGenerated={handleThumbnailGenerated}
          sizeRef={canvasSizeRef}
          pencilOnly={pencilOnly}
          onGoToPage={handleGoToPage}
          zoom={zoom}
          onGesture={applyGesture}
          onZoomReset={resetZoom}
        />
        <TextLayer
          texts={texts}
          selectedTextId={selectedTextId}
          tool={tool}
          onCreateText={createText}
          onSelectText={setSelectedTextId}
          onUpdateText={updateText}
          onDeleteText={removeText}
          screenToCanvas={screenToCanvas}
        />
        <StickerLayer
          instances={stickerInstances}
          stickers={stickers}
          selectedId={selectedStickerId}
          tool={tool}
          armedSticker={armedSticker}
          onPlace={(sticker, x, y) => {
            placeSticker(sticker, x, y)
            setArmedSticker(null)
            setTool('pen')
          }}
          onSelect={setSelectedStickerId}
          onUpdate={updateStickerInstance}
          onDelete={removeStickerInstance}
          screenToCanvas={screenToCanvas}
        />
        </div>{/* end editor-viewport */}

        {showStickerPanel && (
          <StickerPanel
            stickers={stickers}
            onImport={importSticker}
            onSelect={handleStickerSelect}
            onRemove={removeSticker}
            onClose={() => setShowStickerPanel(false)}
          />
        )}

        {/* Zoom level badge — appears on zoom change, hides after 2s */}
        {showZoomBadge && (
          <div className="zoom-badge" role="status" aria-live="polite">
            {Math.round(zoom * 100)}%
          </div>
        )}

        {/* PDF loading overlay */}
        {notebook?.type === 'pdf' && !pdfDoc && (
          <div className="editor-pdf-loading" role="status" aria-live="polite">
            <div className="pdf-spinner" />
            <span>Carregando PDF…</span>
          </div>
        )}

        {/* Toast notification */}
        {toast && (
          <div className="editor-toast" role="status" aria-live="polite">
            {toast}
          </div>
        )}
      </div>
    </div>
  )
}
