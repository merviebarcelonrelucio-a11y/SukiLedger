
import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import './App.css'

const money = (amount) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(Number(amount) || 0)

function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [page, setPage] = useState('Dashboard')
  const [customers, setCustomers] = useState([])
  const [transactions, setTransactions] = useState([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [items, setItems] = useState([
    { item_name: '', quantity: '1', unit_price: '' },
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMode, setAuthMode] = useState('login')

  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) setError(error.message)
      setUser(data?.session?.user ?? null)
      setAuthLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) {
      setCustomers([])
      setTransactions([])
      return
    }

    loadCustomers()
  }, [user])

  async function loadCustomers() {
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('customers')
      .select('id, full_name, contact_number')
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    const { data: balances, error: balanceError } = await supabase
      .from('customer_balances')
      .select('customer_id, balance')

    if (balanceError) setError(balanceError.message)

    const balanceMap = new Map(
      (balances ?? []).map((row) => [
        row.customer_id,
        Number(row.balance) || 0,
      ]),
    )

    setCustomers(
      (data ?? []).map((customer) => {
        const balance = balanceMap.get(customer.id) ?? 0
        return {
          id: customer.id,
          name: customer.full_name,
          phone: customer.contact_number ?? '',
          balance,
          status: balance > 0 ? 'Pending' : 'Paid',
        }
      }),
    )

    setLoading(false)
  }

  async function loadTransactions() {
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('transactions')
      .select(`
        id,
        customer_id,
        status,
        transaction_date,
        created_at,
        customers ( full_name ),
        transaction_items ( id, item_name, quantity, unit_price, subtotal ),
        payments ( amount )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    const records = (data ?? []).map((transaction) => {
      const total = (transaction.transaction_items ?? []).reduce(
        (sum, item) => sum + Number(item.subtotal || 0),
        0,
      )
      const paid = (transaction.payments ?? []).reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0,
      )

      return {
        ...transaction,
        total,
        paid,
        balance: total - paid,
        customerName:
          transaction.customers?.full_name ?? 'Unknown customer',
      }
    })

    setTransactions(records)
    setLoading(false)
  }

  async function handleAuth(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setNotice('')

    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        })
        if (error) throw error

        setNotice(
          data.session
            ? 'Account created successfully!'
            : 'Check your email to confirm your account, then sign in.',
        )
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (error) throw error
      }
    } catch (err) {
      setError(err.message || 'Authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  async function addCustomer(event) {
    event.preventDefault()
    if (!customerName.trim() || !user) return

    setLoading(true)
    setError('')
    setNotice('')

    const { error } = await supabase.from('customers').insert({
      owner_id: user.id,
      full_name: customerName.trim(),
      contact_number: phone.trim() || null,
      qr_token: crypto.randomUUID(),
    })

    if (error) {
      setError(error.message)
    } else {
      setCustomerName('')
      setPhone('')
      setShowForm(false)
      setNotice('Customer saved successfully!')
      await loadCustomers()
    }

    setLoading(false)
  }

  function updateItem(index, field, value) {
    setItems((current) =>
      current.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    )
  }

  function addItemRow() {
    setItems((current) => [
      ...current,
      { item_name: '', quantity: '1', unit_price: '' },
    ])
  }

  function removeItemRow(index) {
    setItems((current) =>
      current.filter((_, i) => i !== index),
    )
  }

  const transactionTotal = items.reduce((sum, item) => {
    const quantity = Number(item.quantity) || 0
    const price = Number(item.unit_price) || 0
    return sum + quantity * price
  }, 0)

  async function saveTransaction(event) {
    event.preventDefault()
    setError('')
    setNotice('')

    if (!selectedCustomer) {
      setError('Please select a customer.')
      return
    }

    if (
      items.length === 0 ||
      items.some(
        (item) =>
          !item.item_name.trim() ||
          !Number.isInteger(Number(item.quantity)) ||
          Number(item.quantity) < 1 ||
          item.unit_price === '' ||
          !Number.isFinite(Number(item.unit_price)) ||
          Number(item.unit_price) < 0,
      )
    ) {
      setError(
        'Enter an item name, a whole-number quantity above zero, and a valid non-negative price for every item.',
      )
      return
    }

    setLoading(true)

    const { data: transaction, error: transactionError } =
      await supabase
        .from('transactions')
        .insert({
          customer_id: selectedCustomer,
          status: 'unpaid',
          transaction_date: new Date().toISOString(),
        })
        .select('id')
        .single()

    if (transactionError) {
      setError(transactionError.message)
      setLoading(false)
      return
    }

    const itemRows = items.map((item) => ({
      transaction_id: transaction.id,
      item_name: item.item_name.trim(),
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
    }))

    const { error: itemsError } = await supabase
      .from('transaction_items')
      .insert(itemRows)

    if (itemsError) {
      // Try to remove the parent record if item insertion failed.
      const { error: rollbackError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transaction.id)

      setError(
        `Saving items failed: ${itemsError.message}` +
          (rollbackError
            ? ` Cleanup also failed: ${rollbackError.message}. Check Supabase before retrying.`
            : ' The incomplete transaction was removed.'),
      )
      setLoading(false)
      return
    }

    setSelectedCustomer('')
    setItems([{ item_name: '', quantity: '1', unit_price: '' }])
    setNotice('Utang record saved successfully!')

    await Promise.all([loadTransactions(), loadCustomers()])
    setLoading(false)
  }

  async function openUtangRecords() {
    setPage('Utang Records')
    await loadTransactions()
  }

  async function logout() {
    const { error } = await supabase.auth.signOut()
    if (error) setError(error.message)
    else {
      setPage('Dashboard')
      setNotice('')
      setError('')
    }
  }

  const totalUtang = customers.reduce(
    (sum, customer) => sum + customer.balance,
    0,
  )
  const overdueCount = customers.filter(
    (customer) => customer.status === 'Overdue',
  ).length

  const filteredCustomers = customers.filter((customer) =>
    `${customer.name} ${customer.phone}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  )

  const navigation = [
    { name: 'Dashboard', icon: '▦' },
    { name: 'Customers', icon: '♙' },
    { name: 'Utang Records', icon: '▤' },
    { name: 'Payments', icon: '₱' },
  ]

  if (authLoading) {
    return <div className="auth-page">Loading SukiLedger...</div>
  }

  if (!user) {
    return (
      <div className="auth-page">
        <form className="auth-card" onSubmit={handleAuth}>
          <div className="brand-icon auth-logo">S</div>
          <h1>SukiLedger</h1>
          <p className="auth-subtitle">
            Your sari-sari store, organized.
          </p>
          <h2>
            {authMode === 'login'
              ? 'Welcome back!'
              : 'Create your store account'}
          </h2>
          <label>
            Email address
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
          </label>
          {error && <p className="error-message">{error}</p>}
          {notice && <p className="auth-message">{notice}</p>}
          <button className="primary-button auth-submit" disabled={loading}>
            {loading
              ? 'Please wait...'
              : authMode === 'login'
                ? 'Sign In'
                : 'Create Account'}
          </button>
          <p className="auth-toggle">
            {authMode === 'login'
              ? "Don't have an account?"
              : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'signup' : 'login')
                setError('')
                setNotice('')
              }}
            >
              {authMode === 'login' ? 'Register' : 'Sign In'}
            </button>
          </p>
        </form>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">S</div>
          <div>
            <h2>SukiLedger</h2>
            <p>YOUR STORE, ORGANIZED</p>
          </div>
        </div>

        <div className="store-label">WORKSPACE</div>
        <nav>
          {navigation.map((item) => (
            <button
              key={item.name}
              className={`nav-item ${page === item.name ? 'active' : ''}`}
              onClick={() =>
                item.name === 'Utang Records'
                  ? openUtangRecords()
                  : setPage(item.name)
              }
            >
              <span className="nav-icon">{item.icon}</span>
              {item.name}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="owner-avatar">SO</div>
          <div className="owner-info">
            <strong>Store Owner</strong>
            <p>{user.email}</p>
            <button className="logout-button" onClick={logout}>
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="breadcrumb">Workspace / {page}</p>
            <h1>{page === 'Dashboard' ? 'Store Overview' : page}</h1>
          </div>
          <div className="topbar-right">
            <span className="today-label">STORE MANAGEMENT</span>
            <div className="profile-avatar">SO</div>
          </div>
        </header>

        {error && <p className="error-message page-message">{error}</p>}
        {notice && <p className="auth-message page-message">{notice}</p>}

        {page === 'Dashboard' && (
          <>
            <section className="welcome-banner">
              <div>
                <span className="eyebrow">YOUR DAILY STORE SUMMARY</span>
                <h2>Welcome back, Store Owner!</h2>
                <p>
                  Keep track of your suki, their balances, and daily transactions.
                </p>
              </div>
              <div className="welcome-symbol">₱</div>
            </section>

            <section className="stats-grid">
              <div className="stat-card">
                <div className="stat-top">
                  <span>Total Outstanding Utang</span>
                  <span className="stat-icon orange">₱</span>
                </div>
                <h2>{money(totalUtang)}</h2>
                <p>Across all customer balances</p>
              </div>
              <div className="stat-card">
                <div className="stat-top">
                  <span>Total Customers</span>
                  <span className="stat-icon green">♙</span>
                </div>
                <h2>{customers.length}</h2>
                <p>Registered suki</p>
              </div>
              <div className="stat-card">
                <div className="stat-top">
                  <span>Overdue Customers</span>
                  <span className="stat-icon red">!</span>
                </div>
                <h2>{overdueCount}</h2>
                <p>Customers marked overdue</p>
              </div>
            </section>

            <section className="content-card">
              <div className="section-heading">
                <div>
                  <h3>Customer Balances</h3>
                  <p>Your customers' outstanding utang.</p>
                </div>
                <button
                  className="primary-button"
                  onClick={() => setPage('Customers')}
                >
                  View all customers →
                </button>
              </div>
              {loading ? (
                <p className="no-results">Loading customers...</p>
              ) : (
                <CustomerTable customers={customers.slice(0, 4)} />
              )}
            </section>

            <section className="tip-banner">
              <span className="tip-icon">✓</span>
              <div>
                <strong>A little tip for your store</strong>
                <p>
                  Record every utang and payment to keep your ledger accurate
                  and avoid misunderstandings.
                </p>
              </div>
            </section>
          </>
        )}

        {page === 'Customers' && (
          <section className="content-card">
            <div className="section-heading">
              <div>
                <h3>Your Customers</h3>
                <p>Manage your suki and their current balances.</p>
              </div>
              <button
                className="primary-button"
                onClick={() => setShowForm(!showForm)}
              >
                + Add Customer
              </button>
            </div>

            {showForm && (
              <form className="customer-form" onSubmit={addCustomer}>
                <label>
                  Customer name
                  <input
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter full name"
                  />
                </label>
                <label>
                  Contact number
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="09XXXXXXXXX"
                  />
                </label>
                <div className="form-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </button>
                  <button className="primary-button" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Customer'}
                  </button>
                </div>
              </form>
            )}

            <input
              className="search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer name or contact number..."
            />
            {loading ? (
              <p className="no-results">Loading customers...</p>
            ) : (
              <CustomerTable customers={filteredCustomers} />
            )}
          </section>
        )}

        {page === 'Utang Records' && (
          <section className="content-card">
            <div className="section-heading">
              <div>
                <h3>Utang Records</h3>
                <p>Record multiple items under one customer transaction.</p>
              </div>
              <span className="status pending">New record</span>
            </div>

            <form className="utang-form" onSubmit={saveTransaction}>
              <label>
                Customer
                <select
                  required
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                >
                  <option value="">Select a customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </label>

              <h3>Items</h3>
              {items.map((item, index) => (
                <div className="item-entry" key={index}>
                  <label>
                    Item name
                    <input
                      required
                      value={item.item_name}
                      onChange={(e) =>
                        updateItem(index, 'item_name', e.target.value)
                      }
                      placeholder="e.g. Sardines"
                    />
                  </label>
                  <label>
                    Quantity
                    <input
                      type="number"
                      min="1"
                      step="1"
                      required
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(index, 'quantity', e.target.value)
                      }
                    />
                  </label>
                  <label>
                    Unit price (₱)
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={item.unit_price}
                      onChange={(e) =>
                        updateItem(index, 'unit_price', e.target.value)
                      }
                      placeholder="0.00"
                    />
                  </label>
                  <div className="item-subtotal">
                    <span>Subtotal</span>
                    <strong>
                      {money(
                        (Number(item.quantity) || 0) *
                          (Number(item.unit_price) || 0),
                      )}
                    </strong>
                  </div>
                  {items.length > 1 && (
                    <button
                      className="remove-item-button"
                      type="button"
                      onClick={() => removeItemRow(index)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}

              <button
                className="secondary-button add-item-button"
                type="button"
                onClick={addItemRow}
              >
                + Add another item
              </button>

              <div className="utang-total">
                <span>Total utang</span>
                <strong>{money(transactionTotal)}</strong>
              </div>

              <button
                className="primary-button save-utang-button"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Utang Record'}
              </button>
            </form>

            <div className="saved-records">
              <div className="section-heading">
                <div>
                  <h3>Saved Records</h3>
                  <p>Previously recorded transactions.</p>
                </div>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={loadTransactions}
                  disabled={loading}
                >
                  Refresh
                </button>
              </div>

              {loading ? (
                <p className="no-results">Loading records...</p>
              ) : transactions.length === 0 ? (
                <p className="no-results">No utang records found.</p>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>CUSTOMER</th>
                        <th>DATE</th>
                        <th>TOTAL</th>
                        <th>PAID</th>
                        <th>BALANCE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((record) => (
                        <tr key={record.id}>
                          <td>
                            <strong>{record.customerName}</strong>
                            <p className="record-items">
                              {(record.transaction_items ?? [])
                                .map(
                                  (item) =>
                                    `${item.item_name} × ${item.quantity}`,
                                )
                                .join(', ')}
                            </p>
                          </td>
                          <td>
                            {new Date(
                              record.transaction_date || record.created_at,
                            ).toLocaleDateString('en-PH')}
                          </td>
                          <td>{money(record.total)}</td>
                          <td>{money(record.paid)}</td>
                          <td className="balance-cell">
                            {money(record.balance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

        {page === 'Payments' && (
          <section className="content-card empty-state">
            <div className="empty-icon">₱</div>
            <h3>Payments</h3>
            <p>
              This section will let you record payments and calculate each
              customer's remaining balance.
            </p>
            <p className="muted-note">
              
            </p>
          </section>
        )}

        <footer className="footer">
          SukiLedger © 2026 · A simpler way to manage your store.
        </footer>
      </main>
    </div>
  )
}

function CustomerTable({ customers }) {
  if (!customers.length) {
    return <p className="no-results">No customers found.</p>
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>CUSTOMER</th>
            <th>CONTACT NUMBER</th>
            <th>BALANCE</th>
            <th>STATUS</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr key={customer.id}>
              <td>
                <div className="customer-cell">
                  <div className="customer-avatar">
                    {customer.name
                      .split(' ')
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join('')}
                  </div>
                  <strong>{customer.name}</strong>
                </div>
              </td>
              <td>{customer.phone || '—'}</td>
              <td className="balance-cell">{money(customer.balance)}</td>
              <td>
                <span className={`status ${customer.status.toLowerCase()}`}>
                  {customer.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default App
