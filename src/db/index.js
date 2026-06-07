import { openDB } from 'idb'

const DB_NAME = 'notas-db'
const DB_VERSION = 1

let dbPromise = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Cadernos: id, title, createdAt, updatedAt, coverColor
        if (!db.objectStoreNames.contains('notebooks')) {
          const notebooks = db.createObjectStore('notebooks', {
            keyPath: 'id',
            autoIncrement: false,
          })
          notebooks.createIndex('updatedAt', 'updatedAt')
        }

        // Páginas: id, notebookId, order, updatedAt
        if (!db.objectStoreNames.contains('pages')) {
          const pages = db.createObjectStore('pages', {
            keyPath: 'id',
            autoIncrement: false,
          })
          pages.createIndex('notebookId', 'notebookId')
          pages.createIndex('notebookId_order', ['notebookId', 'order'])
        }

        // Traços: id, pageId, points (Float32Array serializado), tool, color, size
        if (!db.objectStoreNames.contains('strokes')) {
          const strokes = db.createObjectStore('strokes', {
            keyPath: 'id',
            autoIncrement: false,
          })
          strokes.createIndex('pageId', 'pageId')
        }
      },
    })
  }
  return dbPromise
}

// ─── Notebooks ────────────────────────────────────────────────────────────────

export async function getAllNotebooks() {
  const db = await getDB()
  return db.getAllFromIndex('notebooks', 'updatedAt')
}

export async function getNotebook(id) {
  const db = await getDB()
  return db.get('notebooks', id)
}

export async function putNotebook(notebook) {
  const db = await getDB()
  await db.put('notebooks', notebook)
}

export async function deleteNotebook(id) {
  const db = await getDB()
  const tx = db.transaction(['notebooks', 'pages', 'strokes'], 'readwrite')

  // Remove todas as páginas e traços do caderno em cascata
  const pages = await tx.objectStore('pages').index('notebookId').getAll(id)
  for (const page of pages) {
    const strokes = await tx.objectStore('strokes').index('pageId').getAll(page.id)
    for (const stroke of strokes) {
      tx.objectStore('strokes').delete(stroke.id)
    }
    tx.objectStore('pages').delete(page.id)
  }
  tx.objectStore('notebooks').delete(id)

  await tx.done
}

// ─── Pages ────────────────────────────────────────────────────────────────────

export async function getPages(notebookId) {
  const db = await getDB()
  const all = await db.getAllFromIndex('pages', 'notebookId', notebookId)
  return all.sort((a, b) => a.order - b.order)
}

export async function putPage(page) {
  const db = await getDB()
  await db.put('pages', page)
}

export async function deletePage(id) {
  const db = await getDB()
  const tx = db.transaction(['pages', 'strokes'], 'readwrite')

  const strokes = await tx.objectStore('strokes').index('pageId').getAll(id)
  for (const stroke of strokes) {
    tx.objectStore('strokes').delete(stroke.id)
  }
  tx.objectStore('pages').delete(id)

  await tx.done
}

// ─── Strokes ──────────────────────────────────────────────────────────────────

export async function getStrokes(pageId) {
  const db = await getDB()
  return db.getAllFromIndex('strokes', 'pageId', pageId)
}

export async function putStroke(stroke) {
  const db = await getDB()
  await db.put('strokes', stroke)
}

export async function deleteStroke(id) {
  const db = await getDB()
  await db.delete('strokes', id)
}

export async function deleteStrokesByPage(pageId) {
  const db = await getDB()
  const tx = db.transaction('strokes', 'readwrite')
  const strokes = await tx.store.index('pageId').getAll(pageId)
  for (const s of strokes) tx.store.delete(s.id)
  await tx.done
}
