import { useMemo, useState } from 'react'
import './utang.css'
import './customers.css'

const OVERDUE_DAYS = 7 // same rule as the Dashboard
const DAY = 86400000

// [background, text color]
const STICKERS = [
  ['#F2B533', '#1f1a17'],
  ['#E4472B', '#ffffff'],
  ['#3E7CB1', '#ffffff'],
  ['#2A7A5A', '#ffffff'],
  ['#F4A6C0', '#1f1a17'],
  ['#8E6BBF', '#ffffff'],
]

function stickerFor(name) {
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return STICKERS[hash % STICKERS.length]
}

const initialsOf = (name) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?'

function TrashIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M6 6l1 14h10l1-14" />
      <path d="M10 11v5M14 11v5" />
    </svg>
  )
}

function CustomersPage({
  customers,
  allCustomersCount,
  transactions,
  search,
  setSearch,
  showForm,
  setShowForm,
  customerName,
  setCustomerName,
  phone,
  setPhone,
  addCustomer,
  onDeleteCustomer,
  loading,
  onCustomerClick,
  money,
}) {
  const [confirm, setConfirm] = useState(null)

  // oldest "untouched" open utang per customer, in days
  const overdueDays = useMemo(() => {
    const now = Date.now()
    const map = new Map()

    transactions.forEach((record) => {
      if (record.balance <= 0) return
      const touched = [
        record.transaction_date || record.created_at,
        ...(record.payments ?? []).map((p) => p.payment_date),
      ]
        .filter(Boolean)
        .map((d) => new Date(d).getTime())
      const days = Math.floor((now - Math.max(...touched)) / DAY)
      if (days > (map.get(record.customer_id) ?? -1)) {
        map.set(record.customer_id, days)
      }
    })

    return map
  }, [transactions])

  function tagFor(customer) {
    if (customer.balance <= 0) return { kind: 'paid', text: 'Bayad na' }
    const days = overdueDays.get(customer.id) ?? 0
    if (days >= OVERDUE_DAYS * 2) return { kind: 'late', text: `${days} araw na` }
    if (days >= OVERDUE_DAYS) return { kind: 'warn', text: `${days} araw na` }
    return { kind: 'open', text: 'May utang' }
  }

  async function handleDelete(customer) {
    await onDeleteCustomer(customer)
    setConfirm(null)
  }

  return (
    <section className="ub">
      <div className="cl-head">
        <div>
          <h2 className="ub-title">Mga Suki</h2>
        </div>
        {!showForm && (
          <button
            type="button"
            className="ub-save cl-add"
            onClick={() => setShowForm(true)}
          >
            + Bagong suki
          </button>
        )}
      </div>

      {showForm && (
        <form className="cl-form" onSubmit={addCustomer}>
          <div>
            <label className="ub-label" htmlFor="cl-name">
              Pangalan ng suki
            </label>
            <input
              id="cl-name"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Buong pangalan"
            />
          </div>
          <div>
            <label className="ub-label" htmlFor="cl-phone">
              Contact number
            </label>
            <input
              id="cl-phone"
              type="tel"
              inputMode="numeric"
              maxLength={11}
              pattern="[0-9]{11}"
              title="11 digits lang (hal. 09123456789)"
              value={phone}
              onChange={(e) =>
                setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))
              }
              placeholder="09XXXXXXXXX"
            />
          </div>
          <div className="cl-form-actions">
            <button
              type="button"
              className="ub-refresh"
              onClick={() => setShowForm(false)}
            >
              Kanselahin
            </button>
            <button className="ub-save" disabled={loading}>
              {loading ? 'Isinusulat…' : 'Isulat ang suki'}
            </button>
          </div>
        </form>
      )}

      <label className="ub-label" htmlFor="cl-search">
        Hanapin ang suki
      </label>
      <input
        id="cl-search"
        className="cl-search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Pangalan o contact number…"
      />

      {loading && allCustomersCount === 0 ? (
        <p className="ub-empty">Binubuklat ang listahan…</p>
      ) : customers.length === 0 ? (
        <p className="ub-empty">
          {allCustomersCount === 0
            ? 'Wala pang suki. Idagdag ang una mong suki!'
            : 'Walang nakitang suki.'}
        </p>
      ) : (
        customers.map((customer) => {
          const [bg, fg] = stickerFor(customer.name)
          const tag = tagFor(customer)
          const asking = confirm?.id === customer.id

          return (
            <div key={customer.id}>
              <div className="cl-item">
                <button
                  type="button"
                  className="cl-row"
                  onClick={() => onCustomerClick(customer)}
                >
                  <span
                    className="cl-avatar"
                    style={{ background: bg, color: fg }}
                  >
                    {initialsOf(customer.name)}
                  </span>
                  <span className="cl-who">
                    <span className="ub-name">{customer.name}</span>
                    <span className="cl-phone">
                      {customer.phone || 'Walang number'}
                    </span>
                  </span>
                  <span className="cl-money">
                    <span className="cl-bal">{money(customer.balance)}</span>
                    {tag.kind !== 'paid' && (
  <span className={`cl-tag ${tag.kind}`}>{tag.text}</span>
)}
                  </span>
                </button>
                <button
                  type="button"
                  className="cl-del"
                  aria-label={`Burahin si ${customer.name}`}
                  onClick={() => setConfirm(customer)}
                  disabled={loading}
                >
                  <TrashIcon />
                </button>
              </div>

              {asking && (
                <div className="cl-confirm" role="alertdialog">
                  <p className="cl-confirm-title">
                    Burahin si {customer.name}?
                  </p>
                  <p className="cl-confirm-text">
                    Mabubura rin ang lahat ng utang at bayad niya. Hindi na ito
                    maibabalik.
                    {customer.balance > 0 &&
                      ` May utang pa siya na ${money(customer.balance)}.`}
                  </p>
                  <div className="cl-confirm-actions">
                    <button
                      type="button"
                      className="ub-refresh"
                      onClick={() => setConfirm(null)}
                      disabled={loading}
                    >
                      Kanselahin
                    </button>
                    <button
                      type="button"
                      className="ub-save"
                      onClick={() => handleDelete(customer)}
                      disabled={loading}
                    >
                      {loading ? 'Binubura…' : 'Oo, burahin'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })
      )}
    </section>
  )
}

export default CustomersPage