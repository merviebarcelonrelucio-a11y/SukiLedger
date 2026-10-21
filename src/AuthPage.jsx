import { useState } from 'react'
import { supabase } from './supabase'
import './auth.css'

function EyeIcon({ off }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
      {off && <line x1="3" y1="3" x2="21" y2="21" />}
    </svg>
  )
}

function AuthPage({
  authMode,
  setAuthMode,
  email,
  setEmail,
  password,
  setPassword,
  handleAuth,
  loading,
  error,
  setError,
  notice,
  setNotice,
}) {
  const [showPassword, setShowPassword] = useState(false)
  const [resetBusy, setResetBusy] = useState(false)
  const [resetMsg, setResetMsg] = useState(null) // { kind: 'ok' | 'err', text }

  const isLogin = authMode === 'login'
  const isForgot = authMode === 'forgot'
  const busy = isForgot ? resetBusy : loading

  function go(mode) {
    setAuthMode(mode)
    setShowPassword(false)
    setResetMsg(null)
    setError('')
    setNotice('')
  }

  async function sendReset(event) {
    event.preventDefault()
    setResetMsg(null)
    setResetBusy(true)

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: window.location.origin },
    )

    if (resetError) {
      setResetMsg({ kind: 'err', text: resetError.message })
    } else {
      setResetMsg({
        kind: 'ok',
        text: 'Kung may account sa email na iyon, napadalhan na namin ng link. Tingnan ang inbox (at ang spam).',
      })
    }

    setResetBusy(false)
  }

  const title = isForgot
    ? 'Nakalimutan ang password?'
    : isLogin
      ? 'Buksan ang tindahan'
      : 'Gumawa ng account ng tindahan'

  return (
    <>
      <div className="awning" aria-hidden="true" />
      <main className="au-page">
        <form className="au" onSubmit={isForgot ? sendReset : handleAuth}>
          <div className="au-band">
            <span>SukiLedger</span>
            <span className="au-band-note">Store owner</span>
          </div>

          <div className="au-body">
            <h1 className="au-title">{title}</h1>

            {isForgot && (
              <p className="au-hint">
                Ilagay ang email ng account mo. Padadalhan ka namin ng link para
                magpalit ng password.
              </p>
            )}

            <label className="au-label" htmlFor="au-email">
              Email address
            </label>
            <input
              id="au-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />

            {!isForgot && (
              <>
                <label className="au-label" htmlFor="au-password">
                  Password
                </label>
                <div className="au-pw">
                  <input
                    id="au-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                  />
                  <button
                    type="button"
                    className="au-eye"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={
                      showPassword ? 'Itago ang password' : 'Ipakita ang password'
                    }
                    aria-pressed={showPassword}
                  >
                    <EyeIcon off={showPassword} />
                  </button>
                </div>

                {isLogin && (
                  <button
                    type="button"
                    className="au-forgot"
                    onClick={() => go('forgot')}
                  >
                    Nakalimutan ang password?
                  </button>
                )}
              </>
            )}

            {!isForgot && error && <p className="au-msg err">{error}</p>}
            {!isForgot && notice && <p className="au-msg ok">{notice}</p>}
            {isForgot && resetMsg && (
              <p className={`au-msg ${resetMsg.kind}`} role="status">
                {resetMsg.text}
              </p>
            )}

            <button className="au-submit" disabled={busy}>
              {busy
                ? 'Sandali lang…'
                : isForgot
                  ? 'Ipadala ang link'
                  : isLogin
                    ? 'Mag-sign in'
                    : 'Gumawa ng account'}
            </button>

            {isForgot ? (
              <p className="au-toggle">
                <button type="button" onClick={() => go('login')}>
                  ← Bumalik sa sign in
                </button>
              </p>
            ) : (
              <p className="au-toggle">
                {isLogin ? 'Wala pang account?' : 'May account na?'}{' '}
                <button
                  type="button"
                  onClick={() => go(isLogin ? 'signup' : 'login')}
                >
                  {isLogin ? 'Mag-register' : 'Mag-sign in'}
                </button>
              </p>
            )}
          </div>
        </form>
      </main>
    </>
  )
}

export default AuthPage