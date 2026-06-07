import { openDB } from 'idb'

const DB_NAME = 'notas-db'
const DB_VERSION = 2

let dbPromise = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, transaction) {
        // ── v1: stores iniciais ───────────────────────────────────────────────
        if (oldVersion < 1) {
          const notebooks = db.createObjectStore('notebooks', { keyPath: 'id' })
          notebooks.createIndex('updatedAt', 'updatedAt')
          notebooks.createIndex('folderId', 'folderId')

          const pages = db.createObjectStore('pages', { keyPath: 'id' })
          pages.createIndex('notebookId', 'notebookId')
          pages.createIndex('notebookId_order', ['notebookId', 'order'])

          const strokes = db.createObjectStore('strokes', { keyPath: 'id' })
          strokes.createIndex('pageId', 'pageId')
        }

        // ── v2: pastas + PDFs + índice folderId nos cadernos existentes ───────
        if (oldVersion < 2) {
          if (oldVersion >= 1) {
            // Migração: adiciona índice que não existia na v1
            transaction.objectStore('notebooks').createIndex('folderId', 'folderId')
          }

          db.createObjectStore('folders', { keyPath: 'id' })
            .createIndex('updatedAt', 'updatedAt')

          // Dados binários dos PDFs ficam isolados do restante
          db.createObjectStore('pdfs', { keyPath: 'id' })
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
  const tx = db.transaction(['notebooks', 'pages', 'strokes', 'pdfs'], 'readwrite')

  const pages = await tx.objectStore('pages').index('notebookId').getAll(id)
  for (const page of pages) {
    const strokes = await tx.objectStore('strokes').index('pageId').getAll(page.id)
    for (const stroke of strokes) tx.objectStore('strokes').delete(stroke.id)
    tx.objectStore('pages').delete(page.id)
  }
  tx.objectStore('notebooks').delete(id)
  tx.objectStore('pdfs').delete(id) // no-op se não for PDF

  await tx.done
}

// ─── Folders ──────────────────────────────────────────────────────────────────

export async function getAllFolders() {
  const db = await getDB()
  return db.getAllFromIndex('folders', 'updatedAt')
}

export async function putFolder(folder) {
  const db = await getDB()
  await db.put('folders', folder)
}

export async function deleteFolder(id) {
  const db = await getDB()
  const tx = db.transaction(['folders', 'notebooks'], 'readwrite')

  // Move cadernos da pasta para a raiz antes de deletar
  const notebooks = await tx.objectStore('notebooks').index('folderId').getAll(id)
  for (const nb of notebooks) {
    tx.objectStore('notebooks').put({ ...nb, folderId: null })
  }
  tx.objectStore('folders').delete(id)

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
  for (const stroke of strokes) tx.objectStore('strokes').delete(stroke.id)
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

// ─── PDFs ─────────────────────────────────────────────────────────────────────

export async function putPdfData(id, arrayBuffer) {
  const db = await getDB()
  await db.put('pdfs', { id, data: arrayBuffer })
}

export async function getPdfData(id) {
  const db = await getDB()
  const record = await db.get('pdfs', id)
  return record?.data ?? null
}
