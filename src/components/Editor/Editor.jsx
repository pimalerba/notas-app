import { useState, useEffect } from 'react'
import { getNotebook } from '../../db/index.js'
import { usePages } from '../../hooks/usePages.js'
import { useDrawing } from '../../hooks/useDrawing.js'
import Canvas from '../Canvas/Canvas.jsx'
import Toolbar from '../Toolbar/Toolbar.jsx'
import './Editor.css'

export default function Editor({ notebookId, onBack }) {
  const [notebook, setNotebook] = useState(null)

  useEffect(() => {
    getNotebook(notebookId).then(setNotebook)
  }, [notebookId])

  const { pages, activePage, createPage } = usePages(notebookId)

  // Cria a primeira página se o caderno estiver vazio
  useEffect(() => {
    if (notebook && pages.length === 0) createPage()
  }, [notebook, pages.length, createPage])

  const {
    strokes, liveStroke,
    tool, color, strokeSize,
    setTool, setColor, setStrokeSize,
    startStroke, addPoint, endStroke, eraseAt,
  } = useDrawing(activePage?.id)

  return (
    <div className="editor">
      <Toolbar
        tool={tool}
        color={color}
        strokeSize={strokeSize}
        onSetTool={setTool}
        onSetColor={setColor}
        onSetStrokeSize={setStrokeSize}
        onBack={onBack}
      />
      <Canvas
        paperType={notebook?.paperType ?? 'blank'}
        strokes={strokes}
        liveStroke={liveStroke}
        tool={tool}
        onStartStroke={startStroke}
        onAddPoint={addPoint}
        onEndStroke={endStroke}
        onEraseAt={eraseAt}
      />
    </div>
  )
}
