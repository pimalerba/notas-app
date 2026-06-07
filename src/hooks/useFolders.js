import { useState, useEffect, useCallback } from 'react'
import {
  getAllFolders,
  putFolder,
  deleteFolder as dbDeleteFolder,
} from '../db/index.js'

function makeId() {
  return `fd_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

export function useFolders() {
  const [folders, setFolders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAllFolders()
      .then((all) => setFolders(all.reverse()))
      .finally(() => setLoading(false))
  }, [])

  const createFolder = useCallback(async (name = 'Nova pasta') => {
    const now = Date.now()
    const folder = {
      id: makeId(),
      name,
      parentId: null,
      createdAt: now,
      updatedAt: now,
    }
    await putFolder(folder)
    setFolders((prev) => [folder, ...prev])
    return folder
  }, [])

  const renameFolder = useCallback(async (id, name) => {
    setFolders((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f
        const updated = { ...f, name, updatedAt: Date.now() }
        putFolder(updated)
        return updated
      })
    )
  }, [])

  const removeFolder = useCallback(async (id) => {
    await dbDeleteFolder(id)
    setFolders((prev) => prev.filter((f) => f.id !== id))
  }, [])

  return {
    folders,
    loading,
    createFolder,
    renameFolder,
    removeFolder,
  }
}
