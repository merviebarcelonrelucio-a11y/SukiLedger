import { useState } from 'react'
import { supabase } from './supabase'
import './utang.css'
import './account.css'

function AccountPage({ email }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null) // { kind: 'ok' | 'err', text }

  async function submit(event) {
    event.preventDefault()
    setMsg(null)

    if (next.length < 6) {
      setMsg({ kind: 'err', text: 'Dapat hindi bababa sa 6 na character ang bagong password.' })
      return
    }
    if (next !== confirm) {
      setMsg({ kind: 'err', text: 'Hindi magkapareho ang bagong password at ang kumpirmasyon.' })
      return
    }
    if (next === current) {
      setMsg({ kind: 'err', text: 'Dapat iba ang bagong password sa kasalukuyan.' })
      return
    }

    setBusy(true)

    // Check the current password first
    const { error: checkError } = await supabase.auth.signInWithPassword({
      email,
      password: current,
    })

    if (checkError) {
      setMsg({ kind: 'err', text: 'Mali ang kasalukuyang password.' })
      setBusy(false)
      return
    }

    const { error } = await supabase.auth.updateUser({ password: next })

    if (error) {
      setMsg({ kind: 'err', text: error.message })
    } else {
      setCurrent('')
      setNext('')
      setConfirm('')
      setShow(false)
      setMsg({ kind: 'ok', text: 'Napalitan na ang password mo.' })
    }

    setBusy(false)
  }

  const type = show ? 'text' : 'password'

  return (
    <section className="ub">
      <h2 className="ub-title">Account</h2>
      <p className="ac-email">{email}</p>

      <h3 className="ac-h">Palitan ang password</h3>

      <form className="ac-form" onSubmit={submit}>
        <label className="ub-label" htmlFor="ac-current">
          Kasalukuyang password
        </label>
        <input
          id="ac-current"
          type={type}
          required
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />

        <label className="ub-label ac-gap" htmlFor="ac-new">
          Bagong password
        </label>
        <input
          id="ac-new"
          type={type}
          required
          minLength={6}
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          placeholder="At least 6 characters"
        />

        <label className="ub-label ac-gap" htmlFor="ac-confirm">
          Ulitin ang bagong password
        </label>
        <input
          id="ac-confirm"
          type={type}
          required
          minLength={6}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />

        <label className="ac-show">
          <input
            type="checkbox"
            checked={show}
            onChange={(e) => setShow(e.target.checked)}
          />
          Ipakita ang mga password
        </label>

        {msg && (
          <p className={`ac-msg ${msg.kind}`} role="status">
            {msg.text}
          </p>
        )}

        <button className="ub-save" disabled={busy}>
          {busy ? 'Isinusulat…' : 'Palitan ang password'}
        </button>
      </form>
    </section>
  )
}

export default AccountPage