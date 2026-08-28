import { createContext, useContext, useEffect, useState, useCallback } from 'react'

// Google Identity Services client ID (public — safe to ship in the bundle).
// Create it in Google Cloud Console → APIs & Services → Credentials → OAuth client ID (Web application).
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

const AuthContext = createContext(null)

// Decode the JWT payload of a Google ID token (client-side, no verification needed for demo)
function decodeJwt(token) {
  try {
    const payload = token.split('.')[1]
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(decodeURIComponent(escape(atob(base64))))
  } catch {
    return null
  }
}

const USER_KEY = 'oa_user'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY)) || null
    } catch {
      return null
    }
  })
  const [gisReady, setGisReady] = useState(false)

  useEffect(() => {
    if (!CLIENT_ID) return
    const init = () => {
      if (!window.google?.accounts?.id) return
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: (resp) => {
          const profile = decodeJwt(resp.credential)
          if (profile) {
            const u = {
              sub: profile.sub,
              email: profile.email,
              name: profile.name,
              picture: profile.picture,
            }
            setUser(u)
            localStorage.setItem(USER_KEY, JSON.stringify(u))
          }
        },
      })
      setGisReady(true)
    }
    // The GIS script is loaded async from index.html
    if (window.google?.accounts?.id) init()
    else window.addEventListener('load', init)
    return () => window.removeEventListener('load', init)
  }, [])

  const signOut = useCallback(() => {
    setUser(null)
    localStorage.removeItem(USER_KEY)
    if (window.google?.accounts?.id) window.google.accounts.id.disableAutoSelect()
  }, [])

  return (
    <AuthContext.Provider value={{ user, gisReady, clientId: CLIENT_ID, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}