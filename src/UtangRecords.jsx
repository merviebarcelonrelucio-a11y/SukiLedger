import { useEffect, useRef, useState } from 'react'
import './utang.css'

const STORAGE_KEY = 'sukiQuickItems'

const DEFAULT_QUICK = [
  { item_name: 'Sardinas', unit_price: 30 },
  { item_name: 'Pancit Canton', unit_price: 18 },
  { item_name: 'Kape twin pack', unit_price: 16 },
  { item_name: 'Itlog', unit_price: 10 },
  { item_name: 'Marlboro', unit_price: 11 },
  { item_name: 'Gin', unit_price: 85 },
]

function loadQuick() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (
      Array.isArray(saved) &&
      saved.every(
        (i) =>
          i &&
          typeof i.item_name === 'string' &&
          Number.isFinite(Number(i.unit_price)),
      )
    ) {
      return saved
    }
  } catch {
    // fall through to the defaults
  }
  return DEFAULT_QUICK
}

// Makes the total tick up/down like a cash register.
function CountUp({ value, format }) {
  const [shown, setShown] = useState(value)
  const current = useRef(value)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      current.current = value
      setShown(value)
      return
    }
    const begin = current.current
    const start = performance.now()
    let raf
    const step = (now) => {
      const k = Math.min(1, (now - start) / 350)
      current.current = begin + (value - begin) * k
      setShown(current.current)
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value])

  return <>{format(shown)}</>
}

function UtangRecords({
  customers,
  transactions,
  items,
  setItems,
  customerId,
  setCustomerId,
  updateItem,
  addItemRow,
  removeItemRow,
  transactionTotal,
  saveTransaction,
  loadTransactions,
  loading,
  money,
}) {
  const customer = customers.find((c) => c.id === customerId)

  const [quick, setQuick] = useState(loadQuick)
  const [editing, setEditing] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(quick))
    } catch {
      // ignore if the browser blocks storage
    }
  }, [quick])

  function addQuickItem(q) {
    setItems((current) => {
      const onlyEmptyRow =
        current.length === 1 &&
        !current[0].item_name.trim() &&
        current[0].unit_price === ''
      const row = {
        item_name: q.item_name,
        quantity: '1',
        unit_price: String(q.unit_price),
      }
      return onlyEmptyRow ? [row] : [...current, row]
    })
  }

  function saveQuickItem() {
    const name = newName.trim()
    const price = Number(newPrice)
    if (!name || newPrice === '' || !Number.isFinite(price) || price < 0) return

    setQuick((current) => {
      const exists = current.some(
        (i) => i.item_name.toLowerCase() === name.toLowerCase(),
      )
      return exists
        ? current.map((i) =>
            i.item_name.toLowerCase() === name.toLowerCase()
              ? { ...i, unit_price: price }
              : i,
          )
        : [...current, { item_name: name, unit_price: price }]
    })
    setNewName('')
    setNewPrice('')
  }

  function removeQuickItem(name) {
    setQuick((current) => current.filter((i) => i.item_name !== name))
  }

  // Enter in these boxes adds the item instead of saving the whole utang
  const onEnter = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveQuickItem()
    }
  }

  return (
    <section className="ub">
      <h2 className="ub-title">Listahan ng Utang</h2>

      <form onSubmit={saveTransaction}>
        <label className="ub-label" htmlFor="ub-customer">
          Sino ang suki?
        </label>
        <select
          id="ub-customer"
          className="ub-select"
          required
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
        >
          <option value="">Pumili ng suki…</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <p className="ub-owed" aria-live="polite">
          {customer &&
            (customer.balance > 0
              ? `May utang pa: ${money(customer.balance)}`
              : 'Wala pang utang.')}
        </p>

        <div className="qk-head">
          <span className="qk-title">Madalas kunin</span>
          <button
            type="button"
            className="qk-edit"
            onClick={() => setEditing((current) => !current)}
          >
            {editing ? 'Tapos na' : 'I-edit'}
          </button>
        </div>
        <p className="qk-hint">
          {editing
            ? 'Pindutin ang × para alisin, o magdagdag ng sarili mong item.'
            : 'Tap para idagdag sa listahan.'}
        </p>

        <div className="ub-chips">
          {quick.length === 0 && !editing && (
            <p className="qk-hint">
              Wala pang madalas na item. Pindutin ang I-edit para magdagdag.
            </p>
          )}
          {quick.map((q) =>
            editing ? (
              <span className="ub-chip qk-chip-edit" key={q.item_name}>
                {q.item_name} ₱{q.unit_price}
                <button
                  type="button"
                  className="qk-remove"
                  aria-label={`Alisin ang ${q.item_name}`}
                  onClick={() => removeQuickItem(q.item_name)}
                >
                  ×
                </button>
              </span>
            ) : (
              <button
                type="button"
                className="ub-chip"
                key={q.item_name}
                onClick={() => addQuickItem(q)}
              >
                {q.item_name} ₱{q.unit_price}
              </button>
            ),
          )}
        </div>

        {editing && (
          <div className="qk-add">
            <input
              aria-label="Pangalan ng item"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={onEnter}
              placeholder="Pangalan (hal. Kape)"
            />
            <input
              aria-label="Presyo"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              onKeyDown={onEnter}
              placeholder="Presyo"
            />
            <button type="button" className="ub-refresh" onClick={saveQuickItem}>
              + Idagdag
            </button>
          </div>
        )}

        <div className="ub-cols" aria-hidden="true">
          <span>Item</span>
          <span>Dami</span>
          <span>Presyo</span>
          <span>Halaga</span>
          <span />
        </div>

        {items.map((item, index) => (
          <div className="ub-row" key={index}>
            <label className="ub-field">
              <span className="ub-fl">Item</span>
              <input
                aria-label="Item name"
                required
                value={item.item_name}
                onChange={(e) => updateItem(index, 'item_name', e.target.value)}
                placeholder="hal. Sardines"
              />
            </label>
            <label className="ub-field">
              <span className="ub-fl">Dami</span>
              <input
                aria-label="Quantity"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                required
                value={item.quantity}
                onChange={(e) => updateItem(index, 'quantity', e.target.value)}
              />
            </label>
            <label className="ub-field">
              <span className="ub-fl">Presyo</span>
              <input
                aria-label="Unit price"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                required
                value={item.unit_price}
                onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                placeholder="0.00"
              />
            </label>
            <div className="ub-sum">
              <span className="ub-fl">Halaga</span>
              {money(
                (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
              )}
            </div>
            {items.length > 1 ? (
              <button
                type="button"
                className="ub-x"
                aria-label="Alisin ang item"
                onClick={() => removeItemRow(index)}
              >
                ×
              </button>
            ) : (
              <span />
            )}
          </div>
        ))}

        <button type="button" className="ub-add" onClick={addItemRow}>
          + Dagdag na item
        </button>

        <div className="ub-total">
          <span>Kabuuang utang</span>
          <b>
            <CountUp value={transactionTotal} format={money} />
          </b>
        </div>

        <button className="ub-save" disabled={loading}>
          {loading ? 'Isinusulat…' : 'Isulat sa listahan'}
        </button>
      </form>

      <div className="ub-head">
        <h3>Mga naisulat na</h3>
        <button
          type="button"
          className="ub-refresh"
          onClick={loadTransactions}
          disabled={loading}
        >
          I-refresh
        </button>
      </div>

      {loading && transactions.length === 0 ? (
        <p className="ub-empty">Binubuklat ang listahan…</p>
      ) : transactions.length === 0 ? (
        <p className="ub-empty">Wala pang utang. Ang bait ng mga suki mo!</p>
      ) : (
        transactions.map((record) => {
          const isPaid = record.balance <= 0
          const date = new Date(
            record.transaction_date || record.created_at,
          ).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
          const itemText = (record.transaction_items ?? [])
            .map((i) => `${i.item_name} × ${i.quantity}`)
            .join(', ')

          return (
            <div className={`ub-entry${isPaid ? ' paid' : ''}`} key={record.id}>
              <span className="ub-name">{record.customerName}</span>
              <span className="ub-date">{date}</span>
              <span className="ub-items">{itemText}</span>
              <span className="ub-bal">{money(Math.max(record.balance, 0))}</span>
              {isPaid ? (
                <span className="ub-stamp">BAYAD NA</span>
              ) : (
                record.paid > 0 && (
                  <span className="ub-tot">
                    Kabuuan {money(record.total)} · bayad {money(record.paid)}
                  </span>
                )
              )}
            </div>
          )
        })
      )}
    </section>
  )
}

export default UtangRecords