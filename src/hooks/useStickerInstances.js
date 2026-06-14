import { useState, useEffect, useCallback } from 'react'
import {
  getPageStickerInstances,
  putPageStickerInstance,
  deletePageStickerInstance,
} from '../db/index.js'

function makeId() {
  return `psi_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

export function useStickerInstances(pageId) {
  const [instances, setInstances] = useState([])
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    if (!pageId) { setInstances([]); setSelectedId(null); return }
    getPageStickerInstances(pageId).then(setInstances)
    setSelectedId(null)
  }, [pageId])

  const placeSticker = useCallback(async (sticker, x, y) => {
    // Default display size: 150px on the longest side, preserving aspect ratio
    const MAX = 150
    const ratio = sticker.naturalWidth / sticker.naturalHeight
    const [w, h] = ratio >= 1 ? [MAX, MAX / ratio] : [MAX * ratio, MAX]

    const inst = {
      id: makeId(),
      pageId,
      stickerId: sticker.id,
      dataUrl: sticker.dataUrl,
      x: x - w / 2,
      y: y - h / 2,
      width: Math.round(w),
      height: Math.round(h),
      updatedAt: Date.now(),
    }
    await putPageStickerInstance(inst)
    setInstances((prev) => [...prev, inst])
    setSelectedId(inst.id)
    return inst
  }, [pageId])

  const updateInstance = useCallback(async (id, changes) => {
    setInstances((prev) =>
      prev.map((inst) => {
        if (inst.id !== id) return inst
        const updated = { ...inst, ...changes, updatedAt: Date.now() }
        putPageStickerInstance(updated)
        return updated
      }),
    )
  }, [])

  const removeInstance = useCallback(async (id) => {
    await deletePageStickerInstance(id)
    setInstances((prev) => prev.filter((s) => s.id !== id))
    setSelectedId((prev) => (prev === id ? null : prev))
  }, [])

  const selectedInstance = instances.find((s) => s.id === selectedId) ?? null

  return {
    instances,
    selectedId,
    selectedInstance,
    setSelectedId,
    placeSticker,
    updateInstance,
    removeInstance,
  }
}
