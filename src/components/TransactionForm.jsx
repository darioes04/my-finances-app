import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { format } from 'date-fns'

export default function TransactionForm({ categories, onSaved, onCancel, editing }) {
  const [type, setType] = useState('expense')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [notes, setNotes] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (editing) {
      setType(editing.type)
      setAmount(String(editing.amount))
      setDescription(editing.description)
      setCategoryId(editing.category_id || '')
      setNotes(editing.notes || '')
      setDate(editing.date)
    }
  }, [editing])

  const filteredCats = categories.filter(c => c.type === type || c.type === 'both')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!amount || !description) { setError('Importe y descripción son obligatorios'); return }
    setSaving(true)
    setError('')

    const payload = {
      type,
      amount: parseFloat(amount),
      description,
      category_id: categoryId || null,
      notes: notes || null,
      date,
    }

    let res
    if (editing) {
      res = await supabase.from('transactions').update(payload).eq('id', editing.id)
    } else {
      res = await supabase.from('transactions').insert(payload)
    }

    if (res.error) {
      setError(res.error.message)
      setSaving(false)
    } else {
      onSaved()
    }
  }

  return (
    <div className="slide-in" style={{ maxWidth: 520, margin: '0 auto' }}>
      <h2 className="serif" style={{ fontSize: 26, marginBottom: 28, color: 'var(--text)' }}>
        {editing ? 'Editar transacción' : 'Nueva transacción'}
      </h2>

      {/* Type toggle */}
      <div style={{ display: 'flex', background: 'var(--bg3)', borderRadius: 10, padding: 4, marginBottom: 24 }}>
        {[
          { id: 'expense', label: '↓ Gasto', color: 'var(--expense)' },
          { id: 'income', label: '↑ Ingreso', color: 'var(--income)' },
        ].map(opt => (
          <button
            key={opt.id}
            type="button"
            onClick={() => { setType(opt.id); setCategoryId('') }}
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              borderRadius: 8,
              background: type === opt.id ? (opt.id === 'expense' ? 'var(--expense-bg)' : 'var(--income-bg)') : 'transparent',
              color: type === opt.id ? opt.color : 'var(--text3)',
              fontFamily: 'inherit',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              border: type === opt.id ? `1px solid ${opt.color}44` : '1px solid transparent',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Amount */}
        <div>
          <label style={labelStyle}>Importe (€)</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0,00"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            style={{ ...inputStyle, fontSize: 22, fontWeight: 600 }}
            autoFocus
          />
        </div>

        {/* Description */}
        <div>
          <label style={labelStyle}>Descripción</label>
          <input
            type="text"
            placeholder="¿En qué?"
            value={description}
            onChange={e => setDescription(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Category */}
        <div>
          <label style={labelStyle}>Categoría</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {filteredCats.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryId(cat.id === categoryId ? '' : cat.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 20,
                  border: `1px solid ${categoryId === cat.id ? cat.color : 'var(--border)'}`,
                  background: categoryId === cat.id ? cat.color + '22' : 'var(--bg3)',
                  color: categoryId === cat.id ? cat.color : 'var(--text2)',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontFamily: 'inherit',
                  transition: 'all 0.15s',
                }}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Date */}
        <div>
          <label style={labelStyle}>Fecha</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Notes */}
        <div>
          <label style={labelStyle}>Notas <span style={{ color: 'var(--text3)' }}>(opcional)</span></label>
          <input
            type="text"
            placeholder="Añade una nota..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            style={inputStyle}
          />
        </div>

        {error && <p style={{ color: 'var(--expense)', fontSize: 13 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{ flex: 1, padding: '12px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', borderRadius: 10, cursor: 'pointer', fontSize: 15, fontFamily: 'inherit' }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            style={{
              flex: 2,
              padding: '12px',
              border: 'none',
              background: 'var(--accent)',
              color: '#0f0e0c',
              borderRadius: 10,
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: 15,
              fontFamily: 'inherit',
              fontWeight: 600,
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Añadir'}
          </button>
        </div>
      </form>
    </div>
  )
}

const labelStyle = {
  display: 'block',
  fontSize: 12,
  color: 'var(--text3)',
  textTransform: 'uppercase',
  letterSpacing: 0.8,
  marginBottom: 8,
  fontWeight: 500,
}

const inputStyle = {
  width: '100%',
  background: 'var(--bg3)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  padding: '12px 14px',
  borderRadius: 10,
  fontSize: 15,
  fontFamily: 'inherit',
  outline: 'none',
  transition: 'border-color 0.15s',
}
