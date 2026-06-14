import { useState, useEffect, useCallback } from 'react'
import {
  getPages,
  putPage,
  deletePage as dbDeletePage,
  getStrokes,
  putStroke,
} from '../db/index.js'

function makeStrokeId() {
  return `sk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function makeId() {
  return `pg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

export function usePages(notebookId) {
  const [pages, setPages] = useState([])
  const [activePageId, setActivePageId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!notebookId) {
      setPages([])
      setActivePageId(null)
      setLoading(false)
      return
    }

    setLoading(true)
    getPages(notebookId).then((loaded) => {
      setPages(loaded)
      setActivePageId((prev) => {
        const stillExists = loaded.some((p) => p.id === prev)
        return stillExists ? prev : (loaded[0]?.id ?? null)
      })
      setLoading(false)
    })
  }, [notebookId])

  const createPage = useCallback(async () => {
    const order = pages.length ? pages[pages.length - 1].order + 1 : 0
    const page = {
      id: makeId(),
      notebookId,
      order,
      updatedAt: Date.now(),
      thumbnail: null,
    }
    await putPage(page)
    setPages((prev) => [...prev, page])
    setActivePageId(page.id)
    return page
  }, [notebookId, pages])

  const removePage = useCallback(async (id) => {
    await dbDeletePage(id)
    setPages((prev) => {
      const next = prev.filter((p) => p.id !== id)
      setActivePageId((current) => {
        if (current !== id) return current
        // Ativa a página anterior ou a seguinte
        const idx = prev.findIndex((p) => p.id === id)
        const fallback = next[Math.max(0, idx - 1)]?.id ?? null
        return fallback
      })
      return next
    })
  }, [])

  const updateThumbnail = useCallback(async (id, dataUrl) => {
    setPages((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p
        const updated = { ...p, thumbnail: dataUrl, updatedAt: Date.now() }
        putPage(updated)
        return updated
      })
    )
  }, [])

  const reloadPages = useCallback(async () => {
    const loaded = await getPages(notebookId)
    setPages(loaded)
    setActivePageId(loaded[0]?.id ?? null)
  }, [notebookId])

  const duplicatePage = useCallback(async (id) => {
    const idx = pages.findIndex((p) => p.id === id)
    if (idx === -1) return
    const original = pages[idx]
    const newPageId = makeId()

    const originalStrokes = await getStrokes(id)
    const newStrokes = originalStrokes.map((s) => ({
      ...s,
      id: makeStrokeId(),
      pageId: newPageId,
    }))

    const draft = [...pages]
    draft.splice(idx + 1, 0, {
      ...original,
      id: newPageId,
      updatedAt: Date.now(),
    })
    const renumbered = draft.map((p, i) => ({ ...p, order: i }))

    for (const p of renumbered) await putPage(p)
    for (const s of newStrokes) await putStroke(s)

    setPages(renumbered)
    setActivePageId(newPageId)
  }, [pages])

  const reorderPages = useCallback(async (newPages) => {
    const renumbered = newPages.map((p, i) => ({ ...p, order: i }))
    for (const p of renumbered) await putPage(p)
    setPages(renumbered)
  }, [])

  const activePage = pages.find((p) => p.id === activePageId) ?? null

  return {
    pages,
    activePage,
    activePageId,
    setActivePageId,
    loading,
    createPage,
    removePage,
    duplicatePage,
    reorderPages,
    updateThumbnail,
    reloadPages,
  }
}
