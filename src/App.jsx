import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Dashboard from './components/Dashboard'
import TransactionForm from './components/TransactionForm'
import History from './components/History'
import Investments from './components/Investments'
import Nav from './components/Nav'

export default function App() {
  const [view, setView] = useState('dashboard')
  const [prevView, setPrevView] = useState('dashboard')
  const [categories, setCategories] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [editingTransaction, setEditingTransaction] = useState(null)

  useEffect(() => {
    loadCategories()
    loadTransactions()
  }, [])

  async function loadCategories() {
    const { data } = await supabase.from('categories').select('*').order('name')
    if (data) setCategories(data)
  }

  async function loadTransactions() {
    setLoading(true)
    const { data } = await supabase
      .from('transactions')
      .select('*, categories(*)')
      .order('date', { ascending: false })
    if (data) setTransactions(data)
    setLoading(false)
  }

  function handleEdit(transaction) {
    setEditingTransaction(transaction)
    setPrevView(view)
    setView('form')
  }

  function handleNewTransaction() {
    setEditingTransaction(null)
    setPrevView(view)
    setView('form')
  }

  function handleFormDone() {
    loadTransactions()
    setView(prevView === 'form' ? 'dashboard' : prevView)
  }

  function handleFormCancel() {
    setView(prevView === 'form' ? 'dashboard' : prevView)
  }

  function handleSetView(v) {
    // Never navigate to 'form' from nav tabs — only from explicit actions
    if (v !== 'form') setView(v)
  }

  const monthTransactions = transactions.filter(t => t.date.startsWith(selectedMonth))

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav view={view} setView={handleSetView} onNew={handleNewTransaction} />

      <main style={{ flex: 1, maxWidth: 900, margin: '0 auto', width: '100%', padding: '24px 16px 80px' }}>
        {view === 'dashboard' && (
          <Dashboard
            transactions={monthTransactions}
            allTransactions={transactions}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            loading={loading}
            onEdit={handleEdit}
            onNew={handleNewTransaction}
            onDeleted={loadTransactions}
          />
        )}
        {view === 'form' && (
          <TransactionForm
            categories={categories}
            onSaved={handleFormDone}
            onCancel={handleFormCancel}
            editing={editingTransaction}
          />
        )}
        {view === 'history' && (
          <History
            transactions={transactions}
            loading={loading}
            onEdit={handleEdit}
            onDeleted={loadTransactions}
          />
        )}
      </main>
    </div>
  )
}
