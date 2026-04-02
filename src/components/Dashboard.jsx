import { useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../supabase'

function fmt(n) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n)
}

function getMonths(transactions) {
  const set = new Set(transactions.map(t => t.date.slice(0, 7)))
  return Array.from(set).sort().reverse().slice(0, 12)
}

export default function Dashboard({ transactions, allTransactions, selectedMonth, setSelectedMonth, loading, onEdit, onNew, onDeleted }) {
  const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const balance = income - expenses

  const months = useMemo(() => getMonths(allTransactions), [allTransactions])

  // Group expenses by category for pie/bar
  const byCategory = useMemo(() => {
    const map = {}
    transactions.filter(t => t.type === 'expense').forEach(t => {
      const name = t.categories?.name || 'Sin categoría'
      const icon = t.categories?.icon || '📦'
      const color = t.categories?.color || '#6b7280'
      if (!map[name]) map[name] = { name, icon, color, total: 0 }
      map[name].total += Number(t.amount)
    })
    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [transactions])

  // Monthly evolution (last 6 months)
  const evolution = useMemo(() => {
    const last6 = [...months].reverse().slice(-6)
    return last6.map(m => {
      const mTx = allTransactions.filter(t => t.date.startsWith(m))
      const inc = mTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
      const exp = mTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
      const label = format(parseISO(m + '-01'), 'MMM', { locale: es })
      return { month: label, Ingresos: inc, Gastos: exp }
    })
  }, [allTransactions, months])

  const recentTransactions = transactions.slice(0, 5)

  const monthLabel = selectedMonth
    ? format(parseISO(selectedMonth + '-01'), 'MMMM yyyy', { locale: es })
    : ''

  return (
    <div className="fade-in">
      {/* Month selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <h1 className="serif" style={{ fontSize: 28, textTransform: 'capitalize', color: 'var(--text)' }}>
          {monthLabel}
        </h1>
        <select
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          style={{
            background: 'var(--bg3)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            padding: '8px 12px',
            borderRadius: 8,
            fontSize: 14,
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          {months.map(m => (
            <option key={m} value={m}>
              {format(parseISO(m + '-01'), 'MMMM yyyy', { locale: es })}
            </option>
          ))}
          {months.length === 0 && (
            <option value={selectedMonth}>{monthLabel}</option>
          )}
        </select>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
        <Card label="Ingresos" value={fmt(income)} color="var(--income)" bg="var(--income-bg)" icon="↑" />
        <Card label="Gastos" value={fmt(expenses)} color="var(--expense)" bg="var(--expense-bg)" icon="↓" />
        <Card
          label={balance >= 0 ? 'Ahorro' : 'Déficit'}
          value={fmt(Math.abs(balance))}
          color={balance >= 0 ? 'var(--accent)' : 'var(--expense)'}
          bg={balance >= 0 ? 'var(--accent-bg)' : 'var(--expense-bg)'}
          icon={balance >= 0 ? '★' : '!'}
          bold
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Evolution chart */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px 16px' }}>
          <p style={{ fontSize: 12, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Evolución mensual</p>
          {evolution.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={evolution} barGap={4} barSize={16}>
                <XAxis dataKey="month" tick={{ fill: 'var(--text3)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}
                  formatter={(v) => fmt(v)}
                />
                <Bar dataKey="Ingresos" fill="var(--income)" radius={[4, 4, 0, 0]} opacity={0.8} />
                <Bar dataKey="Gastos" fill="var(--expense)" radius={[4, 4, 0, 0]} opacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Empty />
          )}
        </div>

        {/* By category */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px 16px' }}>
          <p style={{ fontSize: 12, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Gastos por categoría</p>
          {byCategory.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {byCategory.slice(0, 5).map(cat => (
                <div key={cat.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: 'var(--text2)' }}>{cat.icon} {cat.name}</span>
                    <span style={{ fontSize: 13, color: 'var(--text)' }}>{fmt(cat.total)}</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--bg3)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(100, (cat.total / (byCategory[0]?.total || 1)) * 100)}%`,
                      background: cat.color,
                      borderRadius: 2,
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty />
          )}
        </div>
      </div>

      {/* Recent transactions */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <p style={{ fontSize: 12, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1 }}>Últimas transacciones</p>
          {transactions.length > 5 && (
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>+{transactions.length - 5} más</span>
          )}
        </div>
        {loading ? <Spinner /> : recentTransactions.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {recentTransactions.map(t => (
              <TxRow key={t.id} t={t} onEdit={onEdit} onDeleted={onDeleted} />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <p style={{ color: 'var(--text3)', marginBottom: 12 }}>No hay transacciones este mes</p>
            <button onClick={onNew} style={btnStyle}>+ Añadir primera transacción</button>
          </div>
        )}
      </div>
    </div>
  )
}

function Card({ label, value, color, bg, icon, bold }) {
  return (
    <div style={{
      background: bg,
      border: `1px solid ${color}22`,
      borderRadius: 'var(--radius)',
      padding: '18px 20px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: 12, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>
        <span style={{ color, fontSize: 16, fontWeight: 700 }}>{icon}</span>
      </div>
      <p className={bold ? 'serif' : ''} style={{ fontSize: bold ? 26 : 22, color, marginTop: 8, fontWeight: bold ? 400 : 600 }}>
        {value}
      </p>
    </div>
  )
}

export function TxRow({ t, onEdit, onDeleted }) {
  const isIncome = t.type === 'income'

  async function handleDelete(e) {
    e.stopPropagation()
    if (!confirm(`¿Eliminar "${t.description}"?`)) return
    await supabase.from('transactions').delete().eq('id', t.id)
    if (onDeleted) onDeleted()
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 10px',
        borderRadius: 8,
        transition: 'background 0.15s',
        position: 'relative',
      }}
      className="tx-row"
      onMouseOver={e => { e.currentTarget.style.background = 'var(--bg3)'; const btn = e.currentTarget.querySelector('.delete-btn'); if(btn) btn.style.opacity='1' }}
      onMouseOut={e => { e.currentTarget.style.background = 'transparent'; const btn = e.currentTarget.querySelector('.delete-btn'); if(btn) btn.style.opacity='0' }}
    >
      <span
        onClick={() => onEdit && onEdit(t)}
        style={{ display: 'contents', cursor: onEdit ? 'pointer' : 'default' }}
      >
        <span style={{ fontSize: 20, width: 32, textAlign: 'center', flexShrink: 0 }}>
          {t.categories?.icon || (isIncome ? '💰' : '📦')}
        </span>
        <div style={{ flex: 1, minWidth: 0 }} onClick={() => onEdit && onEdit(t)}>
          <p style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: onEdit ? 'pointer' : 'default' }}>
            {t.description}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text3)' }}>
            {t.categories?.name || '—'} · {format(parseISO(t.date), 'd MMM', { locale: es })}
            {t.notes && <span style={{ color: 'var(--text3)' }}> · {t.notes}</span>}
          </p>
        </div>
        <span style={{ fontSize: 15, fontWeight: 600, color: isIncome ? 'var(--income)' : 'var(--expense)', whiteSpace: 'nowrap', cursor: onEdit ? 'pointer' : 'default' }}>
          {isIncome ? '+' : '-'}{fmt(t.amount)}
        </span>
      </span>
      {onDeleted && (
        <button
          className="delete-btn"
          onClick={handleDelete}
          title="Eliminar"
          style={{
            opacity: 0,
            padding: '4px 8px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text3)',
            cursor: 'pointer',
            fontSize: 18,
            lineHeight: 1,
            borderRadius: 6,
            transition: 'color 0.15s, opacity 0.15s',
            flexShrink: 0,
          }}
          onMouseOver={e => e.currentTarget.style.color = 'var(--expense)'}
          onMouseOut={e => e.currentTarget.style.color = 'var(--text3)'}
        >
          ×
        </button>
      )}
    </div>
  )
}

function Empty() {
  return <p style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>Sin datos</p>
}

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
      <div style={{ width: 24, height: 24, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  )
}

const btnStyle = {
  background: 'var(--bg3)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  padding: '8px 16px',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 14,
  fontFamily: 'inherit',
}
