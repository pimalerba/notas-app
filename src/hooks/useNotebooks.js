import { useState, useEffect, useCallback } from 'react'
import {
  getAllNotebooks,
  putNotebook,
  deleteNotebook as dbDeleteNotebook,
} from '../db/index.js'

function makeId() {
  return `nb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

const COVER_COLORS = [
  '#4f86c6', '#e07b54', '#6abf8a', '#c97bb2',
  '#e6c84a', '#7bb5c9', '#c96060', '#8c7bb5',
]

function randomColor() {
  return COVER_COLORS[Math.floor(Math.random() * COVER_COLORS.length)]
}

export function useNotebooks() {
  const [notebooks, setNotebooks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAllNotebooks()
      .then((all) => setNotebooks(all.reverse())) // mais recente primeiro
      .finally(() => setLoading(false))
  }, [])

  const createNotebook = useCallback(async (title = 'Sem título') => {
    const now = Date.now()
    const notebook = {
      id: makeId(),
      title,
      coverColor: randomColor(),
      createdAt: now,
      updatedAt: now,
    }
    await putNotebook(notebook)
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
    createNotebook,
    renameNotebook,
    removeNotebook,
    touchNotebook,
  }
}
