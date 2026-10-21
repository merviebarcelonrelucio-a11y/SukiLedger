import { useEffect, useRef, useState } from 'react'
import './utang.css'
import './payments.css'

const SUCCESS_NOTICE = 'Payment recorded successfully!'

const shortDate = (value) =>
  new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })

function PaymentsPage({
  customers,
  transactions,
  customerId,
  setCustomerId,
  transactionId,
  setTransactionId,
  paymentAmount,
  setPaymentAmount,
  savePayment,
  payAll,
  onClear,
  onRefresh,
  loading,
  notice,
  money,
}) {
  const [showStamp, setShowStamp] = useState(false)
  const pendingStamp = useRef(false)

  const isAll = transactionId === 'ALL'
const record = isAll
  ? undefined
  : transactions.find((r) => r.id === transactionId)
const owing = customers.filter((c) => c.balance > 0)
const openRecords = transactions.filter(
  (r) => r.customer_id === customerId && r.balance > 0,
)
const totalOwed =
  Math.round(openRecords.reduce((sum, r) => sum + r.balance, 0) * 100) / 100

const amount = Number(paymentAmount) || 0
  const nowPaying = record ? Math.min(Math.max(amount, 0), record.balance) : 0
  const pct = (n) => (record && record.total > 0 ? (n / record.total) * 100 : 0)

  // Show the stamp only after the payment really saved.
  useEffect(() => {
    if (notice === SUCCESS_NOTICE && pendingStamp.current) {
      pendingStamp.current = false
      setShowStamp(true)
      const timer = setTimeout(() => setShowStamp(false), 1800)
      return () => clearTimeout(timer)
    }
    if (notice !== SUCCESS_NOTICE) {
      // a new attempt starts or an error cleared the notice; keep the flag
      // only while the request is in flight
    }
  }, [notice])

  useEffect(() => {
  if (isAll) setPaymentAmount(String(totalOwed))
}, [isAll, totalOwed, setPaymentAmount])

  function handleSubmit(event) {
  if (isAll) {
    pendingStamp.current = true
    payAll(event)
    return
  }
  pendingStamp.current = !!record && amount >= record.balance
  savePayment(event)
}

  const payments = transactions
    .flatMap((r) =>
      (r.payments ?? []).map((p, index) => ({
        key: `${r.id}-${index}`,
        name: r.customerName,
        date: p.payment_date || r.created_at,
        amount: p.amount,
      })),
    )
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  return (
    <section className="ub">
      <h2 className="ub-title">Bayad</h2>

      <form onSubmit={handleSubmit}>
        <label className="ub-label" htmlFor="pb-customer">
          Sino ang nagbayad?
        </label>
        <select
          id="pb-customer"
          className="ub-select"
          required
          value={customerId}
          onChange={(e) => {
            setCustomerId(e.target.value)
            setTransactionId('')
            setPaymentAmount('')
          }}
        >
          <option value="">Pumili ng suki…</option>
          {owing.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} — {money(c.balance)}
            </option>
          ))}
        </select>
        {owing.length === 0 && (
          <p className="ub-owed">Walang may utang ngayon. Ang bait ng mga suki mo!</p>
        )}

        <label className="ub-label pb-gap" htmlFor="pb-record">
          Alin sa mga utang niya?
        </label>
        <select
          id="pb-record"
          className="pb-select"
          required
          disabled={!customerId}
          value={transactionId}
          onChange={(e) => setTransactionId(e.target.value)}
        >
          <option value="">Pumili ng utang…</option>
          {openRecords.length > 0 && (
  <option value="ALL">
    Bayaran lahat — {money(totalOwed)}
  </option>
)}
          {openRecords.map((r) => (
            <option key={r.id} value={r.id}>
              {shortDate(r.transaction_date || r.created_at)} — natitira {money(r.balance)}
            </option>
          ))}
        </select>

        {record && (
          <div className="pb-meter">
            <div
              className="pb-bar"
              role="img"
              aria-label={`Bayad na ${money(record.paid)} ng ${money(record.total)}`}
            >
              <i className="pb-paid" style={{ width: `${pct(record.paid)}%` }} />
              <i className="pb-now" style={{ width: `${pct(nowPaying)}%` }} />
            </div>
            <p className="pb-legend">
              Kabuuan {money(record.total)} · bayad na {money(record.paid)}
            </p>
            <p className="ub-owed">
              {nowPaying > 0
                ? `Matitira pagkatapos: ${money(record.balance - nowPaying)}`
                : `Natitira: ${money(record.balance)}`}
            </p>
          </div>
        )}

        {isAll && (
  <div className="pb-meter">
    <p className="ub-owed">
      Lahat ng utang: {openRecords.length} na record, kabuuang {money(totalOwed)}
    </p>
  </div>
)}

        <label className="ub-label pb-gap" htmlFor="pb-amount">
          Magkano ang binayad? (₱)
        </label>
        <input
          id="pb-amount"
          className="pb-amount"
          type="number"
          min="0.01"
          step="0.01"
          inputMode="decimal"
          required
          readOnly={isAll}
          value={paymentAmount}
          onChange={(e) => setPaymentAmount(e.target.value)}
          placeholder="0.00"
        />

        <div className="pb-actions">
          <button className="ub-save" disabled={loading}>
            {loading ? 'Isinusulat…' : 'Itala ang bayad'}
          </button>
          <button type="button" className="ub-refresh" onClick={onClear}>
            Burahin
          </button>
        </div>
      </form>

      <div className="ub-head">
        <h3>Mga bayad na</h3>
        <button
          type="button"
          className="ub-refresh"
          onClick={onRefresh}
          disabled={loading}
        >
          I-refresh
        </button>
      </div>

      {payments.length === 0 ? (
        <p className="ub-empty">Wala pang bayad na naitala.</p>
      ) : (
        payments.map((p) => (
          <div className="pb-pay" key={p.key}>
            <span className="ub-name">{p.name}</span>
            <span className="ub-date">{shortDate(p.date)}</span>
            <span className="pb-amt">{money(p.amount)}</span>
          </div>
        ))
      )}

      {showStamp && (
        <div className="pb-stamp-wrap" aria-hidden="true">
          <span className="pb-stamp">BAYAD NA</span>
        </div>
      )}
    </section>
  )
}

export default PaymentsPage