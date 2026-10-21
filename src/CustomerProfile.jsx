import { useMemo } from 'react'
import './utang.css'
import './profile.css'

const OVERDUE_DAYS = 7 // same rule as Dashboard and Customers
const DAY = 86400000

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

const dateLabel = (value) =>
  new Date(value).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

function CustomerProfile({ customer, transactions, onBack, onShowQr, money }) {
  const records = useMemo(
    () => transactions.filter((r) => r.customer_id === customer.id),
    [transactions, customer.id],
  )

  const balance = records.reduce((sum, r) => sum + Math.max(r.balance, 0), 0)

  const oldestDays = useMemo(() => {
    const now = Date.now()
    let oldest = 0
    records.forEach((record) => {
      if (record.balance <= 0) return
      const touched = [
        record.transaction_date || record.created_at,
        ...(record.payments ?? []).map((p) => p.payment_date),
      ]
        .filter(Boolean)
        .map((d) => new Date(d).getTime())
      oldest = Math.max(oldest, Math.floor((now - Math.max(...touched)) / DAY))
    })
    return oldest
  }, [records])

  let tag = { kind: 'open', text: 'May utang' }
  if (balance <= 0) tag = { kind: 'paid', text: 'Bayad na' }
  else if (oldestDays >= OVERDUE_DAYS * 2)
    tag = { kind: 'late', text: `${oldestDays} araw na` }
  else if (oldestDays >= OVERDUE_DAYS)
    tag = { kind: 'warn', text: `${oldestDays} araw na` }

  const [bg, fg] = stickerFor(customer.name)

  return (
    <section className="ub">
      <button type="button" className="ub-refresh pf-back" onClick={onBack}>
        ← Mga Suki
      </button>

      <div className="pf-head">
        <span className="pf-avatar" style={{ background: bg, color: fg }}>
          {initialsOf(customer.name)}
        </span>
        <div className="pf-who">
          <h2 className="pf-name">{customer.name}</h2>
          <p className="pf-phone">{customer.phone || 'Walang contact number'}</p>
        </div>
        <button type="button" className="ub-save pf-qr" onClick={onShowQr}>
          Show QR Code
        </button>
      </div>

      <div className="pf-balance">
        <p className="pf-label">Utang ngayon</p>
        <p className="pf-amount">{money(balance)}</p>
      </div>

      <div className="ub-head">
        <h3>Listahan ng utang</h3>
      </div>

      {records.length === 0 ? (
        <p className="ub-empty">
          Wala pang utang si {customer.name}. Ang bait!
        </p>
      ) : (
        records.map((r) => {
          const done = r.balance <= 0
          const itemText = (r.transaction_items ?? [])
            .map((i) => `${i.item_name} × ${i.quantity}`)
            .join(', ')

          return (
            <div className={`ub-entry${done ? ' paid' : ''}`} key={r.id}>
              <span className="ub-name">
                {dateLabel(r.transaction_date || r.created_at)}
              </span>
              <span className="ub-date">Kabuuan {money(r.total)}</span>
              <span className="ub-items">{itemText}</span>
              <span className="ub-bal">{money(Math.max(r.balance, 0))}</span>
              {done && <span className="ub-stamp">BAYAD NA</span>}
              {(r.payments ?? []).length > 0 && (
                <ul className="pf-pays">
                  {r.payments.map((p, i) => (
                    <li key={i}>
                      Bayad {money(p.amount)} ·{' '}
                      {dateLabel(p.payment_date || r.created_at)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })
      )}
    </section>
  )
}

export default CustomerProfile