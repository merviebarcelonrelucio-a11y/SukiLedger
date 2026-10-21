import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import './App.css'
import './shell.css'
import UtangRecords from './UtangRecords'
import PaymentsPage from './PaymentsPage'
import DashboardPage from './DashboardPage'
import CustomersPage from './CustomersPage'
import CustomerPortal from './CustomerPortal'
import CustomerProfile from './CustomerProfile'
import QrPage from './QrPage'
import AuthPage from './AuthPage'
import AccountPage from './AccountPage'
import ResetPasswordPage from './ResetPasswordPage'

const money = (amount) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(Number(amount) || 0)

const sukiLink = (customer) =>
  `${window.location.origin}/?suki=${customer.qrToken}`

function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const PAGES = ['Dashboard', 'Customers', 'Utang Records', 'Payments', 'Account']

const [page, setPage] = useState(() => {
  try {
    const saved = localStorage.getItem('sukiPage')
    return PAGES.includes(saved) ? saved : 'Dashboard'
  } catch {
    return 'Dashboard'
  }
})
  const [customers, setCustomers] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [utangCustomerId, setUtangCustomerId] = useState('')
  const [showQrCode, setShowQrCode] = useState(false)
  const [transactions, setTransactions] = useState([])
  const [weeklyPayments, setWeeklyPayments] = useState(0)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [linkCopied, setLinkCopied] = useState(false)
  const [phone, setPhone] = useState('')
  const [items, setItems] = useState([
    { item_name: '', quantity: '1', unit_price: '' },
  ])
  const [selectedPaymentCustomer, setSelectedPaymentCustomer] = useState('')
const [selectedPaymentTransaction, setSelectedPaymentTransaction] = useState('')
const [paymentAmount, setPaymentAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMode, setAuthMode] = useState('login')
  const [recovery, setRecovery] = useState(() =>
  window.location.hash.includes('type=recovery'),
)

  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) setError(error.message)
      setUser(data?.session?.user ?? null)
      setAuthLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === 'PASSWORD_RECOVERY') setRecovery(true)
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

useEffect(() => {
  if (!user) {
    setCustomers([])
    setTransactions([])
    setWeeklyPayments(0)
    return
  }

  loadCustomers()
  loadTransactions()
}, [user])

useEffect(() => {
  setNotice('')
  setError('')
}, [page])

useEffect(() => {
  try {
    localStorage.setItem('sukiPage', page)
  } catch {
    // ignore if the browser blocks storage
  }
}, [page])

  async function loadCustomers() {
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('customers')
      .select('id, full_name, contact_number, qr_token')
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
          qrToken: customer.qr_token,
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
        payments ( amount, payment_date )
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

const now = new Date()
const startOfWeek = new Date(now)
const dayOfWeek = (now.getDay() + 6) % 7

startOfWeek.setDate(now.getDate() - dayOfWeek)
startOfWeek.setHours(0, 0, 0, 0)

const weeklyTotal = records.reduce((sum, record) => {
  return sum + (record.payments ?? []).reduce((paymentSum, payment) => {
    const paymentDate = new Date(payment.payment_date)

    if (paymentDate >= startOfWeek && paymentDate <= now) {
      return paymentSum + Number(payment.amount || 0)
    }

    return paymentSum
  }, 0)
}, 0)

setWeeklyPayments(weeklyTotal)
setLoading(false)
  }

  
function downloadCustomerQR() {
  const svg = document.querySelector('.qr-code-container svg')

  if (!svg || !selectedCustomer) {
    return
  }

  const svgData = new XMLSerializer().serializeToString(svg)
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  const image = new Image()

  canvas.width = 660
  canvas.height = 660

  image.onload = () => {
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)

    const link = document.createElement('a')
    link.download = `SukiLedger-QR-${selectedCustomer.name.replace(/[^a-z0-9]/gi, '-')}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  image.src =
    'data:image/svg+xml;charset=utf-8,' +
    encodeURIComponent(svgData)
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
    if (phone && !/^\d{11}$/.test(phone)) {
  setError('Contact number must be exactly 11 digits.')
  return
}

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

  async function deleteCustomer(customer) {
  setError('')
  setNotice('')
  setLoading(true)

  const { error } = await supabase.rpc('delete_customer', {
    p_customer_id: customer.id,
  })

  if (error) {
    setError(error.message)
    setLoading(false)
    return
  }

  setNotice('Customer deleted successfully!')
  setLoading(false)

  loadCustomers()
  loadTransactions()
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

    if (!utangCustomerId) {
      setError('Please select a customer.')
      return
    }

    if (
      items.length === 0 ||
      items.some(
        (item) =>
          !item.item_name.trim() ||
          !Number.isFinite(Number(item.quantity)) ||
          Number(item.quantity) <= 0 ||
          item.unit_price === '' ||
          !Number.isFinite(Number(item.unit_price)) ||
          Number(item.unit_price) < 0,
      )
    ) {
      setError(
        'Enter an item name, a quantity above zero (decimals allowed), and a valid non-negative price for every item.',
      )
      return
    }

    setLoading(true)

    const { data: transaction, error: transactionError } =
      await supabase
        .from('transactions')
        .insert({
          customer_id: utangCustomerId,
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

    setUtangCustomerId('')
    setItems([{ item_name: '', quantity: '1', unit_price: '' }])
    setNotice('Utang record saved successfully!')
    setLoading(false)

    loadTransactions()
    loadCustomers()
  }

  async function openUtangRecords() {
    setPage('Utang Records')
    await loadTransactions()
  }

  
async function openPayments() {
  setPage('Payments')
  setError('')
  setNotice('')
  await loadTransactions()
}

async function savePayment(event) {
  event.preventDefault()
  setError('')
  setNotice('')

  const amount = Number(paymentAmount)

  if (!selectedPaymentCustomer || !selectedPaymentTransaction) {
    setError('Please select a customer and an utang record.')
    return
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    setError('Enter a payment amount greater than zero.')
    return
  }

  const transaction = transactions.find(
    (record) =>
      record.id === selectedPaymentTransaction &&
      record.customer_id === selectedPaymentCustomer
  )

  if (!transaction) {
    setError('The selected utang record could not be found. Refresh the page and try again.')
    return
  }

  if (transaction.balance <= 0) {
    setError('This utang record has no remaining balance.')
    return
  }

  if (amount > transaction.balance) {
    setError(
      `The payment cannot exceed the remaining balance of ${money(transaction.balance)}.`
    )
    return
  }

  setLoading(true)

  try {
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        transaction_id: transaction.id,
        amount,
        payment_date: new Date().toISOString(),
      })

    if (paymentError) throw paymentError

    setPaymentAmount('')
    setSelectedPaymentTransaction('')
    setNotice('Payment recorded successfully!')

    await Promise.all([loadTransactions(), loadCustomers()])
  } catch (err) {
    setError(err.message || 'Unable to save payment.')
  } finally {
    setLoading(false)
  }
}

async function payAllBalances(event) {
  event.preventDefault()
  setError('')
  setNotice('')

  if (!selectedPaymentCustomer) {
    setError('Please select a customer.')
    return
  }

  const open = transactions.filter(
    (record) =>
      record.customer_id === selectedPaymentCustomer && record.balance > 0
  )

  if (open.length === 0) {
    setError('This customer has no remaining balance.')
    return
  }

  setLoading(true)

  try {
    const paidAt = new Date().toISOString()

    const { error: paymentError } = await supabase.from('payments').insert(
      open.map((record) => ({
        transaction_id: record.id,
        amount: Math.round(record.balance * 100) / 100,
        payment_date: paidAt,
      }))
    )

    if (paymentError) throw paymentError

    setPaymentAmount('')
    setSelectedPaymentTransaction('')
    setNotice('Payment recorded successfully!')
    setLoading(false)

    loadTransactions()
    loadCustomers()
  } catch (err) {
    setError(err.message || 'Unable to save payment.')
    setLoading(false)
  }
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

  const portalToken = new URLSearchParams(window.location.search).get('suki')
if (portalToken) {
  return <CustomerPortal token={portalToken} />
}

  if (authLoading) {
    return (
  <div className="au-page">
    <p className="au-loading">Binubuklat ang tindahan…</p>
  </div>
)
  }

if (recovery && user) {
  return (
    <ResetPasswordPage
      onDone={() => {
        setRecovery(false)
        window.history.replaceState(null, '', window.location.pathname)
        setPage('Dashboard')
      }}
    />
  )
}

    if (!user) {
    return (
      <AuthPage
        authMode={authMode}
        setAuthMode={setAuthMode}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        handleAuth={handleAuth}
        loading={loading}
        error={error}
        setError={setError}
        notice={notice}
        setNotice={setNotice}
      />
    )
  }

  return (
    <div className="app-shell">
      <div className="awning" aria-hidden="true" />
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">S</div>
          <div>
            <h2>SukiLedger</h2>
          </div>
        </div>

        <div className="store-label">WORKSPACE</div>
        <nav>
          {navigation.map((item) => (
            <button
              key={item.name}
              className={`nav-item ${page === item.name ? 'active' : ''}`}
              onClick={() => {
  if (item.name === 'Utang Records') {
    openUtangRecords()
  } else if (item.name === 'Payments') {
    openPayments()
  } else {
    if (item.name === 'Customers') {
      setSelectedCustomer(null)
      setShowQrCode(false)
    }
    setPage(item.name)
  }
}}
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
            <button className="logout-button" onClick={() => setPage('Account')}>
  Change password
</button>
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
            {!['Dashboard', 'Utang Records', 'Payments', 'Customers', 'Account'].includes(page) && (
  <h1>{page === 'Dashboard' ? 'Store Overview' : page}</h1>
)}
          </div>
          <div className="topbar-right">
            <button className="logout-button topbar-logout" onClick={() => setPage('Account')}>Password</button>
            <button className="logout-button topbar-logout" onClick={logout}>Sign out</button>
            <span className="today-label">STORE MANAGEMENT</span>
            <div className="profile-avatar">SO</div>
          </div>
        </header>

        {error && <p className="error-message page-message">{error}</p>}
        {notice && <p className="auth-message page-message">{notice}</p>}

        {page === 'Dashboard' && (
  <DashboardPage
    customers={customers}
    transactions={transactions}
    loading={loading}
    money={money}
    onViewAll={openUtangRecords}
  />
)}

        {page === 'Customers' && (
  <section>
    {selectedCustomer ? (
      showQrCode ? (
        <QrPage
          customer={selectedCustomer}
          link={sukiLink(selectedCustomer)}
          copied={linkCopied}
          onBack={() => setShowQrCode(false)}
          onCopy={() =>
            navigator.clipboard
              .writeText(sukiLink(selectedCustomer))
              .then(() => {
                setLinkCopied(true)
                setTimeout(() => setLinkCopied(false), 1500)
              })
          }
          onDownload={downloadCustomerQR}
        />
      ) : (
        <CustomerProfile
          customer={selectedCustomer}
          transactions={transactions}
          onBack={() => {
            setShowQrCode(false)
            setSelectedCustomer(null)
          }}
          onShowQr={() => setShowQrCode(true)}
          money={money}
        />
      )
    ) : (
      <CustomersPage
        customers={filteredCustomers}
        allCustomersCount={customers.length}
        transactions={transactions}
        search={search}
        setSearch={setSearch}
        showForm={showForm}
        setShowForm={setShowForm}
        customerName={customerName}
        setCustomerName={setCustomerName}
        phone={phone}
        setPhone={setPhone}
        addCustomer={addCustomer}
        onDeleteCustomer={deleteCustomer}
        loading={loading}
        onCustomerClick={(customer) => setSelectedCustomer(customer)}
        money={money}
      />
    )}
  </section>
)}

        {page === 'Utang Records' && (
  <UtangRecords
    customers={customers}
    transactions={transactions}
    items={items}
    setItems={setItems}
    customerId={utangCustomerId}
    setCustomerId={setUtangCustomerId}
    updateItem={updateItem}
    addItemRow={addItemRow}
    removeItemRow={removeItemRow}
    transactionTotal={transactionTotal}
    saveTransaction={saveTransaction}
    loadTransactions={loadTransactions}
    loading={loading}
    money={money}
  />
)}
        
{page === 'Payments' && (
  <PaymentsPage
    customers={customers}
    transactions={transactions}
    customerId={selectedPaymentCustomer}
    setCustomerId={setSelectedPaymentCustomer}
    transactionId={selectedPaymentTransaction}
    setTransactionId={setSelectedPaymentTransaction}
    paymentAmount={paymentAmount}
    setPaymentAmount={setPaymentAmount}
    savePayment={savePayment}
    payAll={payAllBalances}
    onClear={() => {
      setSelectedPaymentCustomer('')
      setSelectedPaymentTransaction('')
      setPaymentAmount('')
      setError('')
      setNotice('')
    }}
    onRefresh={openPayments}
    loading={loading}
    notice={notice}
    money={money}
  />
)}

{page === 'Account' && <AccountPage email={user.email} />}

      </main>
    </div>
  )
  
}

function CustomerTable({ customers, onCustomerClick }) {
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
            <tr
  key={customer.id}
  onClick={() => onCustomerClick(customer)}
  style={{ cursor: 'pointer' }}
>
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
