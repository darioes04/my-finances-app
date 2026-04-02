export default function Nav({ view, setView, onNew }) {
  return (
    <nav style={{
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      backdropFilter: 'blur(12px)',
    }}>
      <div style={{
        maxWidth: 900,
        margin: '0 auto',
        padding: '0 16px',
        height: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span className="serif" style={{ fontSize: 22, color: 'var(--accent)', letterSpacing: '-0.5px' }}>
          finanzas
        </span>

        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {[
            { id: 'dashboard', label: 'Resumen' },
            { id: 'history', label: 'Historial' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: 'none',
                background: view === item.id ? 'var(--bg3)' : 'transparent',
                color: view === item.id ? 'var(--text)' : 'var(--text2)',
                cursor: 'pointer',
                fontSize: 14,
                fontFamily: 'inherit',
                fontWeight: 500,
                transition: 'all 0.15s',
              }}
            >
              {item.label}
            </button>
          ))}

          {view !== 'investments' && (
            <button
              onClick={onNew}
              style={{
                marginLeft: 8,
                padding: '7px 16px',
                borderRadius: 8,
                border: 'none',
                background: 'var(--accent)',
                color: '#0f0e0c',
                cursor: 'pointer',
                fontSize: 14,
                fontFamily: 'inherit',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'opacity 0.15s',
              }}
              onMouseOver={e => e.currentTarget.style.opacity = '0.85'}
              onMouseOut={e => e.currentTarget.style.opacity = '1'}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Añadir
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}
