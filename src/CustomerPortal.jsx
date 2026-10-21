import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import './utang.css'
import './portal.css'

const money = (amount) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(Number(amount) || 0)

const dateLabel = (value) =>
  new Date(value).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

function CustomerPortal({ token }) {
  const [ledger, setLedger] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ok | notfound | error
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data, error } = await supabase.rpc('get_suki_ledger', {
        p_token: token,
      })
      if (cancelled) return
      if (error) {
        setStatus('error')
      } else if (!data) {
        setStatus('notfound')
      } else {
        setLedger(data)
        setStatus('ok')
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [token, tick])

  function reload() {
    setStatus('loading')
    setTick((n) => n + 1)
  }

  const balance = Number(ledger?.balance) || 0
  const records = ledger?.records ?? []

  return (
    <>
      <div className="awning" aria-hidden="true" />
      <main className="sp-wrap">
        {status === 'loading' && (
          <p className="sp-msg">Binubuklat ang suki card mo…</p>
        )}

        {status === 'notfound' && (
          <section className="ub sp-card">
            <div className="sp-band">
              <span>SukiLedger</span>
              <span className="sp-band-note">Suki card</span>
            </div>
            <div className="sp-body">
              <h1 className="sp-name">Hindi mahanap ang card na ito</h1>
              <p className="sp-label">
                Magtanong sa tindahan para sa bagong QR code o link.
              </p>
            </div>
          </section>
        )}

        {status === 'error' && (
          <section className="ub sp-card">
            <div className="sp-band">
              <span>SukiLedger</span>
              <span className="sp-band-note">Suki card</span>
            </div>
            <div className="sp-body">
              <h1 className="sp-name">Hindi makakonekta</h1>
              <p className="sp-label">Tingnan ang internet mo, tapos subukan ulit.</p>
              <button type="button" className="ub-refresh" onClick={reload}>
                Subukan ulit
              </button>
            </div>
          </section>
        )}

        {status === 'ok' && ledger && (
          <>
            <section className="ub sp-card">
              <div className="sp-band">
                <span>SukiLedger</span>
                <span className="sp-band-note">Suki card</span>
              </div>
              <div className="sp-body">
                <p className="sp-hi">Kumusta,</p>
                <h1 className="sp-name">{ledger.name}</h1>
                <p className="sp-owe">
  <span>Utang mo ngayon</span>
</p>
                <p className="sp-balance">{money(balance)}</p>
              </div>
            </section>

            <section className="ub">
              <div className="ub-head sp-head">
                <h2 className="sp-h2">Listahan mo</h2>
                <button type="button" className="ub-refresh" onClick={reload}>
                  I-refresh
                </button>
              </div>

              {records.length === 0 ? (
                <p className="ub-empty">Wala ka pang utang. Salamat, suki!</p>
              ) : (
                records.map((r) => {
                  const left = Number(r.total) - Number(r.paid)
                  const done = left <= 0
                  const itemText = (r.items ?? [])
                    .map((i) => `${i.name} × ${i.quantity}`)
                    .join(', ')

                  return (
                    <div className={`ub-entry${done ? ' paid' : ''}`} key={r.id}>
                      <span className="ub-name">{dateLabel(r.date)}</span>
                      <span className="ub-date">Kabuuan {money(r.total)}</span>
                      <span className="ub-items">{itemText}</span>
                      <span className="ub-bal">{money(Math.max(left, 0))}</span>
                      {done && <span className="ub-stamp">BAYAD NA</span>}
                      {(r.payments ?? []).length > 0 && (
                        <ul className="sp-pays">
                          {r.payments.map((p, i) => (
                            <li key={i}>
                              Bayad {money(p.amount)} · {dateLabel(p.date)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )
                })
              )}
            </section>
          </>
        )}
      </main>
    </>
  )
}

export default CustomerPortal