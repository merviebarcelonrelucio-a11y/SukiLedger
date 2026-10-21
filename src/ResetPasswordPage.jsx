import { useState } from 'react'
import { supabase } from './supabase'
import './auth.css'

function ResetPasswordPage({ onDone }) {
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const [done, setDone] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setMsg(null)

    if (next.length < 6) {
      setMsg('Dapat hindi bababa sa 6 na character ang bagong password.')
      return
    }
    if (next !== confirm) {
      setMsg('Hindi magkapareho ang dalawang password.')
      return
    }

    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password: next })

    if (error) setMsg(error.message)
    else setDone(true)

    setBusy(false)
  }

  const type = show ? 'text' : 'password'

  return (
    <>
      <div className="awning" aria-hidden="true" />
      <main className="au-page">
        <form className="au" onSubmit={submit}>
          <div className="au-band">
            <span>SukiLedger</span>
            <span className="au-band-note">Bagong password</span>
          </div>

          <div className="au-body">
            <h1 className="au-title">Magtakda ng bagong password</h1>

            {done ? (
              <>
                <p className="au-msg ok" role="status">
                  Napalitan na ang password mo.
                </p>
                <button type="button" className="au-submit" onClick={onDone}>
                  Pumunta sa tindahan
                </button>
              </>
            ) : (
              <>
                <label className="au-label" htmlFor="rp-new">
                  Bagong password
                </label>
                <input
                  id="rp-new"
                  type={type}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  placeholder="At least 6 characters"
                />

                <label className="au-label" htmlFor="rp-confirm">
                  Ulitin ang bagong password
                </label>
                <input
                  id="rp-confirm"
                  type={type}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />

                <label className="au-show">
                  <input
                    type="checkbox"
                    checked={show}
                    onChange={(e) => setShow(e.target.checked)}
                  />
                  Ipakita ang mga password
                </label>

                {msg && <p className="au-msg err">{msg}</p>}

                <button className="au-submit" disabled={busy}>
                  {busy ? 'Sandali lang…' : 'I-save ang bagong password'}
                </button>
              </>
            )}
          </div>
        </form>
      </main>
    </>
  )
}

export default ResetPasswordPage