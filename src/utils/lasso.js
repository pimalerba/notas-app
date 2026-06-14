// ── Geometria ─────────────────────────────────────────────────────────────────

export function pointInPolygon(px, py, polygon) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

export function strokeHitsPolygon(stroke, polygon) {
  return stroke.points.some(([px, py]) => pointInPolygon(px, py, polygon))
}

const BB_PAD = 14

export function computeBB(strokes, dx = 0, dy = 0) {
  if (!strokes.length) return null
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const s of strokes) {
    for (const [x, y] of s.points) {
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  }
  return {
    x: minX - BB_PAD + dx,
    y: minY - BB_PAD + dy,
    w: maxX - minX + BB_PAD * 2,
    h: maxY - minY + BB_PAD * 2,
  }
}

// ── Hit testing ───────────────────────────────────────────────────────────────

const HANDLE_R = 10

export function hitHandle(x, y, bb) {
  if (!bb) return null
  const corners = [
    ['nw', bb.x, bb.y],
    ['ne', bb.x + bb.w, bb.y],
    ['sw', bb.x, bb.y + bb.h],
    ['se', bb.x + bb.w, bb.y + bb.h],
  ]
  for (const [name, hx, hy] of corners) {
    if (Math.abs(x - hx) <= HANDLE_R && Math.abs(y - hy) <= HANDLE_R) return name
  }
  return null
}

export function hitBB(x, y, bb) {
  if (!bb) return false
  return x >= bb.x && x <= bb.x + bb.w && y >= bb.y && y <= bb.y + bb.h
}

// ── Transform ─────────────────────────────────────────────────────────────────

export function computeResizeTransform(bb, handle, dx, dy) {
  let newW = bb.w, newH = bb.h
  let anchorX = bb.x, anchorY = bb.y

  if (handle.includes('e')) newW = Math.max(20, bb.w + dx)
  if (handle.includes('s')) newH = Math.max(20, bb.h + dy)
  if (handle.includes('w')) { anchorX = bb.x + bb.w; newW = Math.max(20, bb.w - dx) }
  if (handle.includes('n')) { anchorY = bb.y + bb.h; newH = Math.max(20, bb.h - dy) }

  return {
    anchorX,
    anchorY,
    scaleX: newW / bb.w,
    scaleY: newH / bb.h,
  }
}

export function applyPointTransform(px, py, pp, { anchorX, anchorY, scaleX, scaleY }) {
  return [
    anchorX + (px - anchorX) * scaleX,
    anchorY + (py - anchorY) * scaleY,
    pp,
  ]
}

// ── Canvas rendering ──────────────────────────────────────────────────────────

export function renderLassoOverlay(ctx, { lassoState, path, bb }) {
  if (!lassoState || lassoState === 'idle') return

  ctx.save()

  // Lasso path (dashed outline)
  if (path.length > 1) {
    ctx.strokeStyle = '#3B82F6'
    ctx.lineWidth = 1.5
    ctx.setLineDash([5, 4])
    ctx.beginPath()
    ctx.moveTo(path[0][0], path[0][1])
    for (let i = 1; i < path.length; i++) ctx.lineTo(path[i][0], path[i][1])
    if (lassoState !== 'drawing') ctx.closePath()
    ctx.stroke()
  }

  // Bounding box + handles
  if (bb && lassoState !== 'drawing') {
    ctx.setLineDash([])
    ctx.strokeStyle = '#3B82F6'
    ctx.lineWidth = 1.5
    ctx.strokeRect(bb.x, bb.y, bb.w, bb.h)

    // Filled highlight
    ctx.fillStyle = 'rgba(59,130,246,0.07)'
    ctx.fillRect(bb.x, bb.y, bb.w, bb.h)

    // Corner handles
    const corners = [
      [bb.x, bb.y],
      [bb.x + bb.w, bb.y],
      [bb.x, bb.y + bb.h],
      [bb.x + bb.w, bb.y + bb.h],
    ]
    ctx.fillStyle = 'white'
    for (const [hx, hy] of corners) {
      ctx.beginPath()
      ctx.arc(hx, hy, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }
  }

  ctx.restore()
}
