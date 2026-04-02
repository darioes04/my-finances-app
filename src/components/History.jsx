import { useState, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { TxRow } from './Dashboard'

function fmt(n) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n)
}

export default function History({ transactions, loading, onEdit, onDeleted }) {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (filter !== 'all' && t.type !== filter) return false
      if (search && !t.description.toLowerCase().includes(search.toLowerCase()) &&
          !(t.categories?.name || '').toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [transactions, filter, search])

  const grouped = useMemo(() => {
    const map = {}
    filtered.forEach(t => {
      const m = t.date.slice(0, 7)
      if (!map[m]) map[m] = []
      map[m].push(t)
    })
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtered])

  return (
    <div className="fade-in">
      <h2 className="serif" style={{ fontSize: 26, marginBottom: 24 }}>Historial</h2>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Buscar..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: 180,
            background: 'var(--bg3)', border: '1px solid var(--border)',
            color: 'var(--text)', padding: '9px 14px', borderRadius: 8,
            fontSize: 14, fontFamily: 'inherit', outline: 'none',
          }}
        />
        {['all', 'expense', 'income'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '9px 14px', borderRadius: 8, border: '1px solid',
              borderColor: filter === f ? 'var(--accent)' : 'var(--border)',
              background: filter === f ? 'var(--accent-bg)' : 'var(--bg3)',
              color: filter === f ? 'var(--accent)' : 'var(--text2)',
              cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', fontWeight: 500,
            }}
          >
            {{ all: 'Todos', expense: 'Gastos', income: 'Ingresos' }[f]}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <div style={{ width: 24, height: 24, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        </div>
      ) : grouped.length === 0 ? (
        <p style={{ color: 'var(--text3)', textAlign: 'center', padding: 48 }}>No hay transacciones</p>
      ) : (
        grouped.map(([month, txs]) => {
          const inc = txs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
          const exp = txs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
          return (
            <div key={month} style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', textTransform: 'capitalize' }}>
                  {format(parseISO(month + '-01'), 'MMMM yyyy', { locale: es })}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                  <span style={{ color: 'var(--income)' }}>+{fmt(inc)}</span>
                  {' · '}
                  <span style={{ color: 'var(--expense)' }}>-{fmt(exp)}</span>
                </span>
              </div>
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                {txs.map((t, i) => (
                  <div key={t.id} style={{ borderBottom: i < txs.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <TxRow t={t} onEdit={onEdit} onDeleted={onDeleted} />
                  </div>
                ))}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
