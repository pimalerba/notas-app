import { useState, useEffect, useCallback } from 'react'
import { getAllStickers, putSticker, deleteSticker as dbDeleteSticker } from '../db/index.js'

function makeId() {
  return `stk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function measureImage(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => resolve({ width: 100, height: 100 })
    img.src = dataUrl
  })
}

export function useStickers() {
  const [stickers, setStickers] = useState([])

  useEffect(() => {
    getAllStickers().then(setStickers)
  }, [])

  const importSticker = useCallback(async (file) => {
    const dataUrl = await readFileAsDataUrl(file)
    const { width, height } = await measureImage(dataUrl)
    const sticker = {
      id: makeId(),
      name: file.name.replace(/\.[^.]+$/, ''),
      dataUrl,
      naturalWidth: width,
      naturalHeight: height,
      createdAt: Date.now(),
    }
    await putSticker(sticker)
    setStickers((prev) => [...prev, sticker])
  }, [])

  const removeSticker = useCallback(async (id) => {
    await dbDeleteSticker(id)
    setStickers((prev) => prev.filter((s) => s.id !== id))
  }, [])

  return { stickers, importSticker, removeSticker }
}
