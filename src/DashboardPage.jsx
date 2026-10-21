import { useMemo } from 'react'
import './utang.css'
import './dashboard.css'

const OVERDUE_DAYS = 7 // change this one number to adjust the rule
const DAY = 86400000

const shortDate = (value) =>
  new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Magandang umaga'
  if (hour < 13) return 'Magandang tanghali'
  if (hour < 18) return 'Magandang hapon'
  return 'Magandang gabi'
}

function DashboardPage({ customers, transactions, loading, money, onViewAll }) {
  const totalOutstanding = customers.reduce((sum, c) => sum + c.balance, 0)

  const overdue = useMemo(() => {
    const now = Date.now()
    const byCustomer = new Map()

    transactions.forEach((record) => {
      if (record.balance <= 0) return

      const touched = [
        record.transaction_date || record.created_at,
        ...(record.payments ?? []).map((p) => p.payment_date),
      ]
        .filter(Boolean)
        .map((d) => new Date(d).getTime())

      const days = Math.floor((now - Math.max(...touched)) / DAY)
      if (days < OVERDUE_DAYS) return

      const previous = byCustomer.get(record.customer_id)
      if (!previous || days > previous.days) {
        byCustomer.set(record.customer_id, {
          id: record.customer_id,
          name: record.customerName,
          days,
        })
      }
    })

    return [...byCustomer.values()].sort((a, b) => b.days - a.days)
  }, [transactions])

  // This week (Monday start), same rule as your existing code
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7))
  weekStart.setHours(0, 0, 0, 0)

  const newUtang = transactions.reduce(
    (sum, r) =>
      new Date(r.transaction_date || r.created_at) >= weekStart
        ? sum + r.total
        : sum,
    0,
  )
  const paidThisWeek = transactions.reduce(
    (sum, r) =>
      sum +
      (r.payments ?? []).reduce(
        (s, p) =>
          new Date(p.payment_date) >= weekStart ? s + Number(p.amount || 0) : s,
        0,
      ),
    0,
  )
  const widest = Math.max(newUtang, paidThisWeek, 1)

  return (
    <div className="db">
      <h2 className="db-hello">{greeting()}, store owner!</h2>

      <div className="db-top">
        <div className="db-receipt">
          <p className="db-r-head">SUKILEDGER</p>
          <hr className="db-r-sep" />
          <p className="db-r-label">Kabuuang utang ng mga suki</p>
          <p className="db-r-total">{money(totalOutstanding)}</p>
          <hr className="db-r-sep" />
          <p className="db-r-row">
            <span>Mga suki</span>
            <i />
            <span>{customers.length}</span>
          </p>
          <p className="db-r-row">
            <span>Lampas na sa {OVERDUE_DAYS} araw</span>
            <i />
            <span>{overdue.length}</span>
          </p>
        </div>

        <div className="db-week">
          <h3>Ngayong linggo</h3>
          <div className="db-bar-row">
            <div className="db-bar-label">
              <span>Bagong utang</span>
              <span>{money(newUtang)}</span>
            </div>
            <div className="db-track">
              <div
                className="db-fill new"
                style={{ width: `${(newUtang / widest) * 100}%` }}
              />
            </div>
          </div>
          <div className="db-bar-row">
            <div className="db-bar-label">
              <span>Nabayaran</span>
              <span>{money(paidThisWeek)}</span>
            </div>
            <div className="db-track">
              <div
                className="db-fill pay"
                style={{ width: `${(paidThisWeek / widest) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {overdue.length > 0 && (
  <>
    <h3 className="db-h">Dapat singilin</h3>
    <div className="db-tags">
      {overdue.map((c) => (
        <span
          key={c.id}
          className={`db-tag ${c.days >= OVERDUE_DAYS * 2 ? 'late' : 'warn'}`}
        >
          {c.name}, {c.days} araw na
        </span>
      ))}
    </div>
  </>
)}

      <section className="ub db-recent">
        <div className="ub-head db-recent-head">
          <h3>Huling naisulat</h3>
          <button
            type="button"
            className="ub-refresh"
            onClick={onViewAll}
            disabled={loading}
          >
            Lahat ng utang
          </button>
        </div>

        {loading && transactions.length === 0 ? (
          <p className="ub-empty">Binubuklat ang listahan…</p>
        ) : transactions.length === 0 ? (
          <p className="ub-empty">Wala pang utang. Ang bait ng mga suki mo!</p>
        ) : (
          transactions.slice(0, 5).map((record) => {
            const isPaid = record.balance <= 0
            const itemText = (record.transaction_items ?? [])
              .map((i) => `${i.item_name} × ${i.quantity}`)
              .join(', ')

            return (
              <div
                className={`ub-entry${isPaid ? ' paid' : ''}`}
                key={record.id}
              >
                <span className="ub-name">{record.customerName}</span>
                <span className="ub-date">
                  {shortDate(record.transaction_date || record.created_at)}
                </span>
                <span className="ub-items">{itemText}</span>
                <span className="ub-bal">
                  {money(Math.max(record.balance, 0))}
                </span>
                {isPaid && <span className="ub-stamp">BAYAD NA</span>}
              </div>
            )
          })
        )}
      </section>
    </div>
  )
}

export default DashboardPage