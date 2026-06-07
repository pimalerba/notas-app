import './App.css'

export default function App() {
  return (
    <div className="app">
      {/* Sidebar — será substituído pelo componente Sidebar */}
      <aside style={{
        width: 260,
        flexShrink: 0,
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: 20,
        boxShadow: 'var(--shadow-sm)',
      }}>
        <span style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--blue-500)' }}>
          Notas
        </span>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
          Sidebar em breve
        </span>
      </aside>

      {/* Área principal — será substituída por Canvas + Toolbar */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-editor)',
        gap: 8,
      }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: 'var(--radius-lg)',
          background: 'var(--blue-100)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
          boxShadow: 'var(--shadow-md)',
        }}>
          ✏️
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
          Canvas em breve
        </p>
      </main>
    </div>
  )
}
