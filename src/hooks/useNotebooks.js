import { useState, useEffect, useCallback } from 'react'
import {
  getAllNotebooks,
  putNotebook,
  deleteNotebook as dbDeleteNotebook,
  putPdfData,
} from '../db/index.js'

function makeId(prefix = 'nb') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

export const COVER_COLORS = [
  '#5b9bd5', '#6ec6e6', '#4db8a8', '#6abf8a',
  '#e8c84a', '#e07b5a', '#d46b8a', '#9b7fd4',
]

function randomColor() {
  return COVER_COLORS[Math.floor(Math.random() * COVER_COLORS.length)]
}

export function useNotebooks() {
  const [notebooks, setNotebooks] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const all = await getAllNotebooks()
    setNotebooks(all.reverse())
  }, [])

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [load])

  // refresh é necessário após operações externas (ex: remoção de pasta)
  const refresh = useCallback(async () => {
    await load()
  }, [load])

  const createNotebook = useCallback(async (
    title = 'Sem título',
    coverColor = randomColor(),
    paperType = 'blank',
    folderId = null,
  ) => {
    const now = Date.now()
    const notebook = {
      id: makeId('nb'),
      title,
      type: 'notebook',
      coverColor,
      paperType,
      folderId,
      createdAt: now,
      updatedAt: now,
    }
    await putNotebook(notebook)
    setNotebooks((prev) => [notebook, ...prev])
    return notebook
  }, [])

  const createPdf = useCallback(async (file, folderId = null) => {
    const arrayBuffer = await file.arrayBuffer()
    const now = Date.now()
    const notebook = {
      id: makeId('pdf'),
      title: file.name.replace(/\.pdf$/i, ''),
      type: 'pdf',
      coverColor: '#e8eef6',
      folderId,
      fileSize: file.size,
      createdAt: now,
      updatedAt: now,
    }
    await putNotebook(notebook)
    await putPdfData(notebook.id, arrayBuffer)
    setNotebooks((prev) => [notebook, ...prev])
    return notebook
  }, [])

  const renameNotebook = useCallback(async (id, title) => {
    setNotebooks((prev) =>
      prev.map((nb) => {
        if (nb.id !== id) return nb
        const updated = { ...nb, title, updatedAt: Date.now() }
        putNotebook(updated)
        return updated
      })
    )
  }, [])

  const removeNotebook = useCallback(async (id) => {
    await dbDeleteNotebook(id)
    setNotebooks((prev) => prev.filter((nb) => nb.id !== id))
  }, [])

  const moveToFolder = useCallback(async (id, folderId) => {
    setNotebooks((prev) =>
      prev.map((nb) => {
        if (nb.id !== id) return nb
        const updated = { ...nb, folderId, updatedAt: Date.now() }
        putNotebook(updated)
        return updated
      })
    )
  }, [])

  const touchNotebook = useCallback(async (id) => {
    setNotebooks((prev) =>
      prev.map((nb) => {
        if (nb.id !== id) return nb
        const updated = { ...nb, updatedAt: Date.now() }
        putNotebook(updated)
        return updated
      })
    )
  }, [])

  return {
    notebooks,
    loading,
    refresh,
    createNotebook,
    createPdf,
    renameNotebook,
    removeNotebook,
    moveToFolder,
    touchNotebook,
  }
}
