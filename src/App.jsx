import { useEffect, useMemo, useState } from 'react'
import './App.css'

const DEFAULT_BALANCE = 5000
const STORAGE_KEY = 'expenses'
const BALANCE_KEY = 'walletBalance'
const CATEGORIES = ['Food', 'Travel', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Other']
const COLORS = ['#2563eb', '#8b5cf6', '#14b8a6', '#f59e0b', '#ef4444', '#0f172a', '#10b981']

const defaultExpenseForm = {
  title: '',
  price: '',
  category: CATEGORIES[0],
  date: '',
}

function loadStoredData() {
  try {
    const savedBalance = Number(localStorage.getItem(BALANCE_KEY))
    const savedExpenses = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')

    return {
      walletBalance: Number.isFinite(savedBalance) ? savedBalance : DEFAULT_BALANCE,
      expenses: Array.isArray(savedExpenses) ? savedExpenses : [],
    }
  } catch {
    return {
      walletBalance: DEFAULT_BALANCE,
      expenses: [],
    }
  }
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

function App() {
  const [walletBalance, setWalletBalance] = useState(DEFAULT_BALANCE)
  const [expenses, setExpenses] = useState([])
  const [incomeAmount, setIncomeAmount] = useState('')
  const [incomeError, setIncomeError] = useState('')
  const [expenseForm, setExpenseForm] = useState(defaultExpenseForm)
  const [formError, setFormError] = useState('')
  const [isIncomeOpen, setIsIncomeOpen] = useState(false)
  const [isExpenseOpen, setIsExpenseOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    const storedData = loadStoredData()
    setWalletBalance(storedData.walletBalance)
    setExpenses(storedData.expenses)
  }, [])

  useEffect(() => {
    localStorage.setItem(BALANCE_KEY, String(walletBalance))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses))
  }, [walletBalance, expenses])

  const totalExpenses = useMemo(
    () => expenses.reduce((sum, expense) => sum + Number(expense.price || 0), 0),
    [expenses],
  )

  const summaryByCategory = useMemo(() => {
    return CATEGORIES.map((category) => ({
      category,
      amount: expenses
        .filter((expense) => expense.category === category)
        .reduce((sum, expense) => sum + Number(expense.price || 0), 0),
    }))
  }, [expenses])

  const activeCategories = summaryByCategory.filter((item) => item.amount > 0)
  const totalCategorySpend = activeCategories.reduce((sum, item) => sum + item.amount, 0)

  const pieGradient = useMemo(() => {
    if (activeCategories.length === 0) {
      return 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)'
    }

    let current = 0
    const segments = activeCategories.map((item, index) => {
      const start = current
      const end = current + (item.amount / totalCategorySpend) * 360
      current = end
      return `${COLORS[index % COLORS.length]} ${start.toFixed(2)}deg ${end.toFixed(2)}deg`
    })

    return `conic-gradient(${segments.join(', ')})`
  }, [activeCategories, totalCategorySpend])

  const orderedExpenses = useMemo(() => {
    return [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [expenses])

  const maxBar = Math.max(...summaryByCategory.map((item) => item.amount), 1)

  const resetExpenseForm = () => {
    setExpenseForm(defaultExpenseForm)
    setFormError('')
    setEditingId(null)
  }

  const openExpenseModal = (expense = null) => {
    setFormError('')
    if (expense) {
      setExpenseForm({
        title: expense.title,
        price: String(expense.price),
        category: expense.category,
        date: expense.date,
      })
      setEditingId(expense.id)
    } else {
      resetExpenseForm()
    }
    setIsExpenseOpen(true)
  }

  const closeExpenseModal = () => {
    setIsExpenseOpen(false)
    resetExpenseForm()
  }

  const closeIncomeModal = () => {
    setIsIncomeOpen(false)
    setIncomeAmount('')
    setIncomeError('')
  }

  const handleIncomeSubmit = (event) => {
    event.preventDefault()
    const amount = Number(incomeAmount)

    if (!incomeAmount || Number.isNaN(amount) || amount <= 0) {
      setIncomeError('Please enter a valid positive income amount.')
      return
    }

    setWalletBalance((current) => current + amount)
    closeIncomeModal()
  }

  const handleExpenseSubmit = (event) => {
    event.preventDefault()

    const { title, price, category, date } = expenseForm

    if (!title || !price || !category || !date) {
      setFormError('Please complete all required fields before saving the expense.')
      return
    }

    const parsedPrice = Number(price)

    if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      setFormError('Please enter a valid positive expense amount.')
      return
    }

    if (!editingId && parsedPrice > walletBalance) {
      window.alert('You cannot spend more than the available wallet balance.')
      return
    }

    const expenseData = {
      id: editingId || `${Date.now()}`,
      title,
      price: parsedPrice,
      category,
      date,
    }

    if (editingId) {
      const originalExpense = expenses.find((item) => item.id === editingId)
      const originalPrice = originalExpense ? Number(originalExpense.price) : 0
      setWalletBalance((current) => current + (originalPrice - parsedPrice))
      setExpenses((current) => current.map((item) => (item.id === editingId ? expenseData : item)))
    } else {
      setWalletBalance((current) => current - parsedPrice)
      setExpenses((current) => [...current, expenseData])
    }

    closeExpenseModal()
  }

  const handleDeleteExpense = (expenseId) => {
    const expenseToRemove = expenses.find((item) => item.id === expenseId)

    if (!expenseToRemove) {
      return
    }

    setWalletBalance((current) => current + Number(expenseToRemove.price || 0))
    setExpenses((current) => current.filter((item) => item.id !== expenseId))
  }

  return (
    <div className="app-shell">
      <header className="hero-panel">
        <div>
          <p className="eyebrow">Expense management</p>
          <h1>Expense Tracker</h1>
          <p className="hero-copy">
            Track spending, add income, and keep your wallet balance up to date in real time.
          </p>
        </div>

        <div className="hero-actions">
          <div className="balance-card">
            <p>Wallet Balance</p>
            <h2>{formatCurrency(walletBalance)}</h2>
          </div>
          <button type="button" className="btn btn-secondary" onClick={() => setIsIncomeOpen(true)}>
            + Add Income
          </button>
          <button type="button" className="btn btn-primary" onClick={() => openExpenseModal()}>
            + Add Expense
          </button>
        </div>
      </header>

      <section className="summary-grid">
        <article className="summary-card">
          <p>Expenses</p>
          <h2>{formatCurrency(totalExpenses)}</h2>
        </article>
        <article className="summary-card">
          <p>Available Balance</p>
          <h2>{formatCurrency(walletBalance)}</h2>
        </article>
        <article className="summary-card">
          <p>Expense Count</p>
          <h2>{expenses.length}</h2>
        </article>
      </section>

      <section className="analytics-grid">
        <article className="chart-card">
          <div className="section-header">
            <div>
              <p className="eyebrow">Overview</p>
              <h2>Expense Summary</h2>
            </div>
          </div>
          <div className="pie-wrapper">
            <div className="pie-chart" style={{ background: pieGradient }} aria-hidden="true" />
            <div className="pie-center">
              <strong>{formatCurrency(totalExpenses)}</strong>
              <span>spent</span>
            </div>
          </div>
          <div className="legend-list">
            {activeCategories.map((item, index) => (
              <div className="legend-item" key={item.category}>
                <span className="legend-dot" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span>{item.category}</span>
                <strong>{formatCurrency(item.amount)}</strong>
              </div>
            ))}
            {activeCategories.length === 0 && (
              <p className="empty-note">No expenses recorded yet. Add your first expense to populate the chart.</p>
            )}
          </div>
        </article>

        <article className="chart-card">
          <div className="section-header">
            <div>
              <p className="eyebrow">Trends</p>
              <h2>Spending by Category</h2>
            </div>
          </div>
          <div className="bar-chart">
            {summaryByCategory.map((item) => (
              <div className="bar-row" key={item.category}>
                <span>{item.category}</span>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ width: `${(item.amount / maxBar) * 100}%` }}
                    aria-hidden="true"
                  />
                </div>
                <strong>{formatCurrency(item.amount)}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="history-card">
        <div className="section-header">
          <div>
            <p className="eyebrow">Transactions</p>
            <h2>Expense History</h2>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => openExpenseModal()}>
            + Add Expense
          </button>
        </div>

        <div className="expense-list">
          {orderedExpenses.length === 0 && (
            <div className="empty-state">
              <p>No expenses added yet. Use the Add Expense button to get started.</p>
            </div>
          )}

          {orderedExpenses.map((expense) => (
            <article className="expense-row" key={expense.id}>
              <div>
                <p className="expense-title">{expense.title}</p>
                <p className="expense-meta">
                  {expense.category} • {expense.date}
                </p>
              </div>
              <div className="expense-actions">
                <strong>{formatCurrency(expense.price)}</strong>
                <div>
                  <button type="button" className="action-btn" onClick={() => openExpenseModal(expense)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="action-btn danger"
                    onClick={() => handleDeleteExpense(expense.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {isIncomeOpen && (
        <div className="modal-overlay" role="presentation">
          <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="income-modal-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Add income</p>
                <h2 id="income-modal-title">Add Balance</h2>
              </div>
              <button type="button" className="icon-button" onClick={closeIncomeModal} aria-label="Close add income modal">
                ×
              </button>
            </div>
            <form onSubmit={handleIncomeSubmit} className="modal-form">
              <label>
                Income Amount
                <input
                  type="number"
                  placeholder="Income Amount"
                  value={incomeAmount}
                  onChange={(event) => setIncomeAmount(event.target.value)}
                />
              </label>
              {incomeError && <p className="form-error">{incomeError}</p>}
              <button type="submit" className="btn btn-primary full-width">
                Add Balance
              </button>
            </form>
          </div>
        </div>
      )}

      {isExpenseOpen && (
        <div className="modal-overlay" role="presentation">
          <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="expense-modal-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Manage expense</p>
                <h2 id="expense-modal-title">{editingId ? 'Edit Expense' : 'Add Expense'}</h2>
              </div>
              <button type="button" className="icon-button" onClick={closeExpenseModal} aria-label="Close expense modal">
                ×
              </button>
            </div>
            <form onSubmit={handleExpenseSubmit} className="modal-form">
              <label>
                Expense Title
                <input
                  type="text"
                  name="title"
                  value={expenseForm.title}
                  onChange={(event) => setExpenseForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="e.g. Grocery run"
                />
              </label>

              <label>
                Expense Amount
                <input
                  type="number"
                  name="price"
                  value={expenseForm.price}
                  onChange={(event) => setExpenseForm((current) => ({ ...current, price: event.target.value }))}
                  placeholder="Enter amount"
                />
              </label>

              <label>
                Category
                <select
                  name="category"
                  value={expenseForm.category}
                  onChange={(event) => setExpenseForm((current) => ({ ...current, category: event.target.value }))}
                >
                  {CATEGORIES.map((category) => (
                    <option value={category} key={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Date
                <input
                  type="date"
                  name="date"
                  value={expenseForm.date}
                  onChange={(event) => setExpenseForm((current) => ({ ...current, date: event.target.value }))}
                />
              </label>

              {formError && <p className="form-error">{formError}</p>}

              <button type="submit" className="btn btn-primary full-width">
                {editingId ? 'Save Expense' : 'Add Expense'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
