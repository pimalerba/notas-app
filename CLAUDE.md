# Notas — CLAUDE.md

App de caderno digital inspirado no GoodNotes. React 19 + Vite 8, PWA, sem backend. Todo estado persiste no navegador via IndexedDB.

## Stack

- **React 19** (hooks, sem class components)
- **Vite 8** com `vite-plugin-pwa` + Workbox para PWA e service worker
- **IndexedDB** via `idb` — única fonte de verdade para todos os dados
- **perfect-freehand** — renderização de traços à mão livre
- **pdfjs-dist v4** — importação e renderização de PDFs
- **jspdf** — exportação de páginas como PDF
- **Sem router** — duas telas (`Library` / `Editor`) controladas por `activeNotebookId` em `App.jsx`
- **Sem estado global** (sem Zustand, Redux, Context) — cada hook gerencia seu domínio
- **Sem TypeScript** — JSX puro

## Estrutura

```
src/
  App.jsx                     # Raiz: alterna Library ↔ Editor
  db/index.js                 # Todas as operações IndexedDB (DB v4)
  hooks/
    useNotebooks.js           # CRUD cadernos + PDFs
    useFolders.js             # CRUD pastas
    usePages.js               # CRUD páginas + ordem
    useDrawing.js             # Strokes ativos + undo/redo
    useLasso.js               # Seleção por laço
    useZoom.js                # Zoom/pan do editor (pinch-to-zoom)
    useStickers.js            # Biblioteca global de adesivos
    useStickerInstances.js    # Instâncias de adesivos por página
    useTextElements.js        # Elementos de texto por página
  components/
    Library/                  # Tela inicial: grid de cadernos/pastas
    Editor/                   # Tela de edição: canvas + layers
    Canvas/                   # Desenho com perfect-freehand + gestos touch
    Toolbar/                  # Ferramentas (pode ser horizontal ou vertical)
    PagePanel/                # Painel lateral de páginas com thumbnails
    TextLayer/                # Elementos de texto draggáveis/redimensionáveis
    StickerLayer/             # Instâncias de adesivos na página
    StickerPanel/             # Painel flutuante da biblioteca de adesivos
    UpdatePrompt/             # Banner de atualização do PWA
    ui/ConfirmDialog.jsx      # Dialog de confirmação reutilizável
  utils/
    drawing.js                # getSvgPathFromStroke (perfect-freehand)
    thumbnail.js              # Geração de thumbnails de páginas
    pdf.js                    # renderPdfCoverThumb + renderPdfPage
    export.js                 # Exportação via jspdf
    lasso.js                  # Hit-test geométrico do laço
  styles/theme.css            # Variáveis CSS globais (cores, espaçamentos)
```

## IndexedDB — esquema (v4)

| Store | keyPath | Índices |
|---|---|---|
| `notebooks` | `id` | `updatedAt`, `folderId` |
| `pages` | `id` | `notebookId`, `notebookId_order` |
| `strokes` | `id` | `pageId` |
| `pdfs` | `id` | — |
| `folders` | `id` | `updatedAt` |
| `texts` | `id` | `pageId` |
| `stickers` | `id` | — |
| `pageStickers` | `id` | `pageId` |

Ao adicionar um novo store, incremente `DB_VERSION` em `src/db/index.js` e escreva o bloco `if (oldVersion < N)` no `upgrade()`.

## Sistema de zoom/pan (`useZoom.js`)

**Regra crítica:** o `StickerPanel` é um overlay flutuante e deve ficar **fora** do `<div class="editor-viewport">`. Tudo dentro do viewport escala com `transform: scale(zoom)`.

O `editor-viewport` usa `transform-origin: 0 0` e `transform: translate(panX, panY) scale(zoom)`.

`screenToCanvas(clientX, clientY)` converte coordenadas de tela para coordenadas lógicas do canvas:
```js
x: (clientX - rect.left - panX) / zoom
y: (clientY - rect.top  - panY) / zoom
```
`getBoundingClientRect()` num elemento com CSS transform retorna bounds **visuais** (já escalados) — por isso dividir pelo zoom é suficiente. Todo drag/resize em `TextLayer` e `StickerLayer` usa `screenToCanvas`.

## Convenções

- **Sem comentários óbvios** — só quando o "porquê" não é evidente (invariante sutil, workaround de bug específico)
- **Sem TypeScript** — não adicionar
- **Português** para UI (labels, placeholders, mensagens ao usuário); inglês para código
- **CSS por componente** — cada componente tem seu `.css` colocado na mesma pasta; variáveis globais em `theme.css`
- **Hooks = domínio** — cada hook cuida de um recurso (notebooks, pages, strokes...). Não misturar responsabilidades
- **Sem abstrações prematuras** — três linhas parecidas é melhor que uma abstração desnecessária

## localStorage (preferências de UI)

| Chave | Valor | Onde |
|---|---|---|
| `'notas-toolbar-vertical'` | `'1'` | Toolbar — orientação |
| `'notas-lib-sort'` | `'updated'` \| `'created'` \| `'name'` | Library — ordenação |

## Comandos

```bash
npm run dev      # dev server em localhost:5173
npm run build    # build de produção (emite dist/)
npm run preview  # serve o dist/ localmente
```

## Deploy

Hospedado na **Vercel**. Deploy automático no push para `main`. Domínio: `notas.pimalerba.me` (CNAME → `cname.vercel-dns.com`).

O PDF worker (`pdf.worker.mjs`) é excluído do precache do Workbox (> 1.4MB) e servido via `CacheFirst` em runtime.

## Armadilhas conhecidas

- **Coordenadas do canvas** — strokes e elementos são sempre em coordenadas **lógicas** (independente de zoom). Nunca salvar coordenadas de tela no IndexedDB.
- **StickerPanel fora do viewport** — é overlay absoluto, não pode escalar com zoom.
- **`vpRef.current = vp` durante render** — em `useZoom`, o ref é sincronizado com o estado no corpo do componente (não em `useEffect`) para que `screenToCanvas` (deps vazias) sempre leia valores atualizados sem se recriar.
- **ContentEditable em TextLayer** — o DOM do `contentEditable` é gerenciado imperativa­mente via `ref` (não pelo React) para evitar reset de cursor a cada keystroke. Não tornar o conteúdo filho React do div editável.
- **Migração do DB** — ao criar novo store ou índice, sempre usar `oldVersion < N` dentro do `upgrade()`. Nunca chamar `createIndex` em store que já existe sem verificar `oldVersion`.
- **Push para o remote** — se rejeitado, fazer `git pull --rebase` antes de `git push`.
