import { useState, useEffect, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '../supabase'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const KNOWN_ETFS = [
  { ticker: 'IWDA.AS', name: 'MSCI World', color: '#60a5fa', icon: '🌍' },
  { ticker: 'SGLD.L',  name: 'Oro (SGLD)', color: '#f59e0b', icon: '🥇' },
]

function fmt(n, decimals = 2) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: decimals
  }).format(n)
}
function fmtPct(n) {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
}

async function fetchPrice(ticker) {
  try {
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(yahooUrl)}`
    const res = await fetch(proxyUrl)
    if (!res.ok) return null
    const outer = await res.json()
    const data = JSON.parse(outer.contents)
    const meta = data?.chart?.result?.[0]?.meta
    if (!meta?.regularMarketPrice) return null
    let price = meta.regularMarketPrice
    const currency = meta.currency
    if (currency === 'GBp') price = price / 100
    return { price, currency: currency === 'GBp' ? 'GBP' : currency }
  } catch {
    return null
  }
}

export default function Investments() {
  const [contributions, setContributions] = useState([])
  const [prices, setPrices] = useState({})
  const [loadingData, setLoadingData] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => { loadContributions() }, [])

  async function loadContributions() {
    setLoadingData(true)
    try {
      const { data, error } = await supabase
        .from('investments')
        .select('*')
        .order('date', { ascending: false })
      if (error) throw error
      const rows = data || []
      setContributions(rows)
      const tickers = [...new Set(rows.map(c => c.ticker))]
      if (tickers.length > 0) loadPrices(tickers)
    } catch (e) {
      console.error('Error loading investments:', e)
    } finally {
      setLoadingData(false)
    }
  }

  async function loadPrices(tickers) {
    setPrices(prev => {
      const next = { ...prev }
      tickers.forEach(t => { next[t] = { loading: true, price: null, currency: null, error: null } })
      return next
    })
    await Promise.all(tickers.map(async ticker => {
      const result = await fetchPrice(ticker)
      setPrices(prev => ({
        ...prev,
        [ticker]: result
          ? { loading: false, price: result.price, currency: result.currency, error: null }
          : { loading: false, price: null, currency: null, error: 'No disponible' }
      }))
    }))
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar esta aportación?')) return
    setDeletingId(id)
    try {
      await supabase.from('investments').delete().eq('id', id)
      await loadContributions()
    } finally {
      setDeletingId(null)
    }
  }

  const portfolio = useMemo(() => {
    const map = {}
    contributions.forEach(c => {
      if (!map[c.ticker]) {
        const known = KNOWN_ETFS.find(e => e.ticker === c.ticker) || {}
        map[c.ticker] = {
          ticker: c.ticker,
          name: c.name,
          color: known.color || '#6366f1',
          icon: known.icon || '📈',
          totalShares: 0,
          totalInvested: 0,
        }
      }
      map[c.ticker].totalShares += Number(c.shares)
      map[c.ticker].totalInvested += Number(c.shares) * Number(c.price_paid)
    })
    return Object.values(map).map(etf => {
      const pd = prices[etf.ticker]
      const currentPrice = pd?.price ?? null
      const currentValue = currentPrice !== null ? etf.totalShares * currentPrice : null
      const gainLoss = currentValue !== null ? currentValue - etf.totalInvested : null
      const gainLossPct = gainLoss !== null && etf.totalInvested > 0
        ? (gainLoss / etf.totalInvested) * 100 : null
      const avgCost = etf.totalShares > 0 ? etf.totalInvested / etf.totalShares : 0
      return { ...etf, currentPrice, currentValue, gainLoss, gainLossPct, avgCost, priceData: pd }
    })
  }, [contributions, prices])

  const totals = useMemo(() => {
    const invested = portfolio.reduce((s, e) => s + e.totalInvested, 0)
    const allHaveValue = portfolio.length > 0 && portfolio.every(e => e.currentValue !== null)
    const value = allHaveValue ? portfolio.reduce((s, e) => s + e.currentValue, 0) : null
    const gain = value !== null ? value - invested : null
    const gainPct = gain !== null && invested > 0 ? (gain / invested) * 100 : null
    return { invested, value, gain, gainPct }
  }, [portfolio])

  const evolutionData = useMemo(() => {
    const sorted = [...contributions].sort((a, b) => a.date.localeCompare(b.date))
    let cum = 0
    const byMonth = {}
    sorted.forEach(c => {
      const m = c.date.slice(0, 7)
      byMonth[m] = (byMonth[m] || 0) + Number(c.shares) * Number(c.price_paid)
    })
    return Object.entries(byMonth).map(([m, amount]) => {
      cum += amount
      return { month: format(parseISO(m + '-01'), 'MMM yy', { locale: es }), Invertido: parseFloat(cum.toFixed(2)) }
    })
  }, [contributions])

  const anyLoading = Object.values(prices).some(p => p?.loading)

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <h1 className="serif" style={{ fontSize: 28 }}>Inversiones</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {anyLoading && (
            <span style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Spinner small /> Actualizando precios…
            </span>
          )}
          <button
            onClick={() => setShowForm(true)}
            style={{ padding: '8px 16px', background: 'var(--accent)', border: 'none', color: '#0f0e0c', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit', fontWeight: 600 }}
          >
            + Aportación
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        <SCard label="Total invertido" value={fmt(totals.invested)} color="var(--text)" />
        <SCard label="Valor actual" value={totals.value !== null ? fmt(totals.value) : '—'} color="var(--accent)" loading={anyLoading} />
        <SCard
          label={totals.gain === null || totals.gain >= 0 ? 'Ganancia' : 'Pérdida'}
          value={totals.gain !== null ? `${fmt(totals.gain)}  (${fmtPct(totals.gainPct)})` : '—'}
          color={totals.gain === null ? 'var(--text3)' : totals.gain >= 0 ? 'var(--income)' : 'var(--expense)'}
          loading={anyLoading}
          bold
        />
      </div>

      {loadingData ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}><Spinner /></div>
      ) : portfolio.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text3)' }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>📈</p>
          <p style={{ marginBottom: 16 }}>Sin aportaciones todavía</p>
          <button onClick={() => setShowForm(true)} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
            + Añadir primera aportación
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: portfolio.length === 1 ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 20 }}>
            {portfolio.map(etf => <EtfCard key={etf.ticker} etf={etf} />)}
          </div>

          {evolutionData.length > 1 && (
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px', marginBottom: 20 }}>
              <p style={{ fontSize: 12, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Capital acumulado invertido</p>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={evolutionData}>
                  <XAxis dataKey="month" tick={{ fill: 'var(--text3)', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }} formatter={v => fmt(v)} />
                  <Line type="monotone" dataKey="Invertido" stroke="var(--accent)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px' }}>
            <p style={{ fontSize: 12, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Historial de aportaciones</p>
            {contributions.map((c, i) => {
              const known = KNOWN_ETFS.find(e => e.ticker === c.ticker)
              return (
                <div
                  key={c.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px', borderRadius: 8, borderBottom: i < contributions.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background 0.15s' }}
                  onMouseOver={e => { e.currentTarget.style.background = 'var(--bg3)'; e.currentTarget.querySelector('.del-btn').style.opacity = '1' }}
                  onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.querySelector('.del-btn').style.opacity = '0' }}
                >
                  <span style={{ fontSize: 20, width: 32, textAlign: 'center' }}>{known?.icon || '📈'}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{c.name}</p>
                    <p style={{ fontSize: 12, color: 'var(--text3)' }}>
                      {Number(c.shares).toFixed(4)} partic. · {fmt(Number(c.price_paid), 4)}/ud · {format(parseISO(c.date), 'd MMM yyyy', { locale: es })}
                      {c.notes ? ` · ${c.notes}` : ''}
                    </p>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                    {fmt(Number(c.shares) * Number(c.price_paid))}
                  </span>
                  <button
                    className="del-btn"
                    onClick={() => handleDelete(c.id)}
                    disabled={deletingId === c.id}
                    style={{ opacity: 0, background: 'transparent', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 18, padding: '4px 8px', borderRadius: 6, transition: 'color 0.15s, opacity 0.15s', flexShrink: 0 }}
                    onMouseOver={e => e.currentTarget.style.color = 'var(--expense)'}
                    onMouseOut={e => e.currentTarget.style.color = 'var(--text3)'}
                  >×</button>
                </div>
              )
            })}
          </div>
        </>
      )}

      {showForm && (
        <ContributionForm
          onSaved={() => { setShowForm(false); loadContributions() }}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  )
}

function EtfCard({ etf }) {
  const pd = etf.priceData
  const positive = etf.gainLoss === null || etf.gainLoss >= 0

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>{etf.icon}</span>
          <div>
            <p style={{ fontWeight: 600, color: 'var(--text)' }}>{etf.name}</p>
            <p style={{ fontSize: 12, color: 'var(--text3)' }}>{etf.ticker}</p>
          </div>
        </div>
        {pd?.loading ? <Spinner small />
          : pd?.error ? <span style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--bg3)', padding: '3px 8px', borderRadius: 20 }}>Sin precio</span>
          : etf.currentPrice !== null ? (
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{fmt(etf.currentPrice, 4)}</p>
              <p style={{ fontSize: 11, color: 'var(--text3)' }}>{pd?.currency} · precio actual</p>
            </div>
          ) : null}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: etf.gainLoss !== null ? 14 : 0 }}>
        <Stat label="Invertido" value={fmt(etf.totalInvested)} />
        <Stat label="Valor actual" value={etf.currentValue !== null ? fmt(etf.currentValue) : '—'} color={etf.currentValue !== null ? 'var(--accent)' : undefined} />
        <Stat label="Participaciones" value={etf.totalShares.toFixed(4)} />
        <Stat label="Precio medio" value={fmt(etf.avgCost, 4)} />
      </div>

      {etf.gainLoss !== null && (
        <div style={{ padding: '10px 14px', background: positive ? 'var(--income-bg)' : 'var(--expense-bg)', border: `1px solid ${positive ? '#22c55e22' : '#ef444422'}`, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--text2)' }}>{positive ? '📈 Ganancia latente' : '📉 Pérdida latente'}</span>
          <span style={{ fontWeight: 700, color: positive ? 'var(--income)' : 'var(--expense)', fontSize: 15 }}>
            {positive ? '+' : ''}{fmt(etf.gainLoss)} <span style={{ fontSize: 12, fontWeight: 400 }}>({fmtPct(etf.gainLossPct)})</span>
          </span>
        </div>
      )}
    </div>
  )
}

function SCard({ label, value, color, bold, loading }) {
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 18px' }}>
      <p style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>{label}</p>
      {loading
        ? <div style={{ width: 80, height: 22, background: 'var(--bg3)', borderRadius: 4, opacity: 0.6 }} />
        : <p className={bold ? 'serif' : ''} style={{ fontSize: bold ? 20 : 18, color, fontWeight: bold ? 400 : 600 }}>{value}</p>
      }
    </div>
  )
}

function Stat({ label, value, color }) {
  return (
    <div>
      <p style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 }}>{label}</p>
      <p style={{ fontSize: 14, fontWeight: 500, color: color || 'var(--text)' }}>{value}</p>
    </div>
  )
}

function ContributionForm({ onSaved, onCancel }) {
  const [ticker, setTicker] = useState(KNOWN_ETFS[0].ticker)
  const [name, setName] = useState(KNOWN_ETFS[0].name)
  const [shares, setShares] = useState('')
  const [pricePaid, setPricePaid] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const total = shares && pricePaid ? parseFloat(shares) * parseFloat(pricePaid) : null

  async function handleSubmit(e) {
    e.preventDefault()
    if (!shares || !pricePaid) { setError('Participaciones y precio son obligatorios'); return }
    setSaving(true)
    setError('')
    try {
      const { error: err } = await supabase.from('investments').insert({
        ticker, name,
        shares: parseFloat(shares),
        price_paid: parseFloat(pricePaid),
        date,
        notes: notes || null,
      })
      if (err) throw err
      onSaved()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onCancel()}
    >
      <div className="slide-in" style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 28, width: '100%', maxWidth: 460 }}>
        <h3 className="serif" style={{ fontSize: 22, marginBottom: 22 }}>Nueva aportación</h3>

        <div style={{ marginBottom: 18 }}>
          <p style={labelStyle}>ETF</p>
          <div style={{ display: 'flex', gap: 8 }}>
            {KNOWN_ETFS.map(etf => (
              <button
                key={etf.ticker}
                type="button"
                onClick={() => { setTicker(etf.ticker); setName(etf.name) }}
                style={{ flex: 1, padding: '10px 8px', borderRadius: 8, border: '1px solid', borderColor: ticker === etf.ticker ? etf.color : 'var(--border)', background: ticker === etf.ticker ? etf.color + '22' : 'var(--bg3)', color: ticker === etf.ticker ? etf.color : 'var(--text2)', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', fontWeight: 500, transition: 'all 0.15s', textAlign: 'center' }}
              >
                {etf.icon} {etf.name}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Participaciones</label>
              <input type="number" step="0.000001" min="0.000001" placeholder="0.0000" value={shares} onChange={e => setShares(e.target.value)} style={inputStyle} autoFocus />
            </div>
            <div>
              <label style={labelStyle}>Precio / participación</label>
              <input type="number" step="0.0001" min="0.0001" placeholder="0.00" value={pricePaid} onChange={e => setPricePaid(e.target.value)} style={inputStyle} />
            </div>
          </div>

          {total !== null && (
            <div style={{ background: 'var(--accent-bg)', border: '1px solid #e8c97e22', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>Total invertido</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--accent)' }}>{fmt(total)}</span>
            </div>
          )}

          <div>
            <label style={labelStyle}>Fecha</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Notas <span style={{ color: 'var(--text3)' }}>(opcional)</span></label>
            <input type="text" placeholder="Broker, comentario..." value={notes} onChange={e => setNotes(e.target.value)} style={inputStyle} />
          </div>

          {error && <p style={{ color: 'var(--expense)', fontSize: 13 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onCancel} style={{ flex: 1, padding: '11px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>Cancelar</button>
            <button type="submit" disabled={saving} style={{ flex: 2, padding: '11px', border: 'none', background: 'var(--accent)', color: '#0f0e0c', borderRadius: 10, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 14, fontFamily: 'inherit', fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Guardando…' : 'Añadir aportación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Spinner({ small }) {
  const size = small ? 14 : 24
  return <div style={{ width: size, height: size, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
}

const labelStyle = { display: 'block', fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6, fontWeight: 500 }
const inputStyle = { width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)', padding: '10px 12px', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none' }
