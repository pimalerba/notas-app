# Notas ✦

> A GoodNotes-inspired digital notebook for iPad and desktop — built entirely with React, no native code required.

[![Live Demo](https://img.shields.io/badge/live%20demo-notas--app.vercel.app-4d94e0?style=flat-square&logo=vercel&logoColor=white)](https://notas-app-mu.vercel.app)
[![PWA Ready](https://img.shields.io/badge/PWA-ready-5cb85c?style=flat-square)](https://notas-app-alpha.vercel.app)
[![React 19](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8-646cff?style=flat-square&logo=vite&logoColor=white)](https://vite.dev)

---

## ✨ Features

### ✏️ Drawing & Annotation
- **Pen** — pressure-sensitive ink powered by `perfect-freehand`
- **Calligraphic brush** — variable-width strokes that react to drawing speed
- **Highlighter** — semi-transparent marker with multiply blending
- **Selective eraser** — erase full strokes or highlights only
- **Lasso selection** — draw a free selection, then move, resize, or delete
- **Palm rejection** — always filters large-contact palm touches; optional pencil-only mode blocks all finger input

### 📄 PDF Import & Annotation
- Import any PDF — pages stored in IndexedDB, works fully offline
- Cover thumbnail generated from page 1 and cached in the database
- Draw, highlight, and add text on top of every PDF page
- **Hand tool** — disables drawing so you can tap PDF internal links (perfect for planners with navigation)

### 📝 Text & Stickers
- Rich text boxes with font family, size, bold, italic, and six colors
- Drag and reposition text elements freely on the canvas
- Custom sticker library — import any PNG/SVG as a reusable stamp
- Place, resize, and delete sticker instances per page

### 📚 Library & Organization
- Create notebooks with custom cover colors and paper styles (blank, lined, grid, dot)
- Organize notebooks into folders with drag-and-drop reordering
- Rename, move, and delete with confirmation dialogs

### 🗂️ Page Management
- Unlimited pages per notebook
- Live thumbnails in the collapsible side panel
- Duplicate, delete, and drag-to-reorder pages

### ↩️ Undo / Redo
- Command-based history covering strokes, eraser gestures, lasso operations, and text
- `⌘Z` / `⌘⇧Z` keyboard shortcuts (also `Ctrl+Z` / `Ctrl+Y`)
- Toolbar buttons with correct disabled state

### 💾 Export
- **PNG** — composites all layers (PDF background, ink, text, stickers) into a single image
- **PDF** — exports the full notebook as a PDF with all annotations baked in

### 🎨 Toolbar
- Floating, draggable — place it anywhere on screen
- Toggle between **horizontal** and **vertical** orientation with a single button
- Position and orientation persist across sessions via `localStorage`

### 📲 PWA / Offline
- Installable on iPad via Safari — feels like a native app on the home screen
- Service Worker (Workbox) caches everything; PDF worker cached separately so install stays lean

---

## 🛠 Stack

| | Technology |
|---|---|
| UI | [React 19](https://react.dev) |
| Build | [Vite 8](https://vite.dev) |
| Ink rendering | [perfect-freehand](https://github.com/steveruizok/perfect-freehand) |
| PDF rendering | [pdfjs-dist 4](https://mozilla.github.io/pdf.js/) |
| PDF export | [jsPDF 4](https://github.com/parallax/jsPDF) |
| Storage | [IndexedDB via idb](https://github.com/jakearchibald/idb) |
| PWA / SW | [vite-plugin-pwa](https://vite-pwa-org.netlify.app) + Workbox |
| Hosting | [Vercel](https://vercel.com) |

No UI library. Every component is hand-rolled with CSS custom properties.

---
## Use
- Open the website on your phone/tablet
- Click "Add to Home Screen" then confirm
