import { useEffect, useRef } from 'react'
import { useAuth } from '../AuthContext'

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18A10.97 10.97 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
  )
}

/**
 * Custom-styled sign-in button that keeps the real Google sign-in flow.
 * The official GIS button is rendered invisibly on top of the custom button,
 * so clicks still open Google's account chooser while the visible button
 * matches the page's glass / animated styling.
 */
export default function GlassGoogleButton({
  label = 'Sign in with Google',
  width = 240,
  buttonClassName = '',
  showGoogleIcon = true,
  buttonRef = null,
}) {
  const { gisReady, clientId } = useAuth()
  const ref = useRef(null)

  useEffect(() => {
    if (!gisReady || !ref.current) return
    window.google.accounts.id.renderButton(ref.current, {
      theme: 'outline',
      size: 'large',
      shape: 'pill',
      text: 'signin_with',
      width,
    })
  }, [gisReady, width])

  if (!clientId) {
    return (
      <div
        className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 text-slate-300 text-sm font-semibold border border-white/15 backdrop-blur-md ${buttonClassName}`}
      >
        <GoogleG />
        Google sign-in not configured
      </div>
    )
  }

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold ${buttonClassName}`}
      >
        {showGoogleIcon && <GoogleG />}
        {label}
      </button>
      {/* Invisible official GIS button — preserves the real sign-in flow */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div ref={ref} className="opacity-0" />
      </div>
    </div>
  )
}