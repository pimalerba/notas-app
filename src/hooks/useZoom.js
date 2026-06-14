import { useState, useRef, useCallback } from 'react'

const MIN_ZOOM = 0.25
const MAX_ZOOM = 4

export function useZoom() {
  const [vp, setVP] = useState({ zoom: 1, panX: 0, panY: 0 })
  const containerRef = useRef(null)

  // Ref mirrors state so screenToCanvas is always fresh without re-creating it
  const vpRef = useRef(vp)
  vpRef.current = vp

  // Apply a combined pinch-zoom + pan delta in a single atomic update.
  // cx, cy are in screen coordinates (clientX / clientY).
  const applyGesture = useCallback(({ scaleDelta, cx, cy, dPanX, dPanY }) => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setVP((prev) => {
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev.zoom * scaleDelta))
      const relCx = cx - rect.left
      const relCy = cy - rect.top
      // Keep the canvas point beneath the pinch center stationary, then shift by pan delta
      const rawX = relCx - ((relCx - prev.panX) / prev.zoom) * newZoom + dPanX
      const rawY = relCy - ((relCy - prev.panY) / prev.zoom) * newZoom + dPanY
      const W = el.offsetWidth
      const H = el.offsetHeight
      const panX = newZoom <= 1 ? 0 : Math.min(0, Math.max(W * (1 - newZoom), rawX))
      const panY = newZoom <= 1 ? 0 : Math.min(0, Math.max(H * (1 - newZoom), rawY))
      return { zoom: newZoom, panX, panY }
    })
  }, [])

  const resetZoom = useCallback(() => {
    setVP({ zoom: 1, panX: 0, panY: 0 })
  }, [])

  // Convert screen coordinates to canvas-logical coordinates.
  // Stable reference — always reads the latest vp values through vpRef.
  const screenToCanvas = useCallback((clientX, clientY) => {
    const el = containerRef.current
    if (!el) return { x: clientX, y: clientY }
    const rect = el.getBoundingClientRect()
    const { zoom, panX, panY } = vpRef.current
    return {
      x: (clientX - rect.left - panX) / zoom,
      y: (clientY - rect.top  - panY) / zoom,
    }
  }, [])

  return {
    zoom: vp.zoom,
    panX: vp.panX,
    panY: vp.panY,
    containerRef,
    applyGesture,
    resetZoom,
    screenToCanvas,
  }
}
