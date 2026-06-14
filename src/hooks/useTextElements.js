import { useState, useEffect, useCallback } from 'react'
import { getTextElements, putTextElement, deleteTextElement } from '../db/index.js'

function makeId() {
  return `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

export function useTextElements(pageId) {
  const [texts, setTexts] = useState([])
  const [selectedTextId, setSelectedTextId] = useState(null)

  useEffect(() => {
    if (!pageId) { setTexts([]); setSelectedTextId(null); return }
    getTextElements(pageId).then(setTexts)
    setSelectedTextId(null)
  }, [pageId])

  const createText = useCallback(async (x, y) => {
    const el = {
      id: makeId(),
      pageId,
      x,
      y,
      width: 200,
      height: 80,
      content: '',
      fontFamily: 'sans',
      fontSize: 16,
      color: '#111827',
      bold: false,
      italic: false,
      updatedAt: Date.now(),
    }
    await putTextElement(el)
    setTexts((prev) => [...prev, el])
    setSelectedTextId(el.id)
    return el
  }, [pageId])

  const updateText = useCallback(async (id, changes) => {
    setTexts((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t
        const updated = { ...t, ...changes, updatedAt: Date.now() }
        putTextElement(updated)
        return updated
      }),
    )
  }, [])

  const removeText = useCallback(async (id) => {
    await deleteTextElement(id)
    setTexts((prev) => prev.filter((t) => t.id !== id))
    setSelectedTextId((prev) => (prev === id ? null : prev))
  }, [])

  const selectedText = texts.find((t) => t.id === selectedTextId) ?? null

  return {
    texts,
    selectedText,
    selectedTextId,
    setSelectedTextId,
    createText,
    updateText,
    removeText,
  }
}
