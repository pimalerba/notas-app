import { useState } from 'react'
import Library from './components/Library/Library.jsx'
import Editor from './components/Editor/Editor.jsx'
import UpdatePrompt from './components/UpdatePrompt/UpdatePrompt.jsx'
import './App.css'

export default function App() {
  const [activeNotebookId, setActiveNotebookId] = useState(null)

  return (
    <div className="app">
      <UpdatePrompt />
      {activeNotebookId ? (
        <Editor
          notebookId={activeNotebookId}
          onBack={() => setActiveNotebookId(null)}
        />
      ) : (
        <Library onOpenNotebook={setActiveNotebookId} />
      )}
    </div>
  )
}
