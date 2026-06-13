'use client'
import { useEffect, useRef, useState } from 'react'

const GSI_SRC = 'https://accounts.google.com/gsi/client'
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

interface GoogleCredentialResponse {
  credential: string
}

interface Props {
  /** Called with the Google ID token when the user completes sign-in. */
  onCredential: (credential: string) => void
}

// Load the Google Identity Services script once, shared across mounts.
let gsiPromise: Promise<void> | null = null
function loadGsi(): Promise<void> {
  if (gsiPromise) return gsiPromise
  gsiPromise = new Promise<void>((resolve, reject) => {
    if (typeof window !== 'undefined' && window.google?.accounts?.id) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = GSI_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'))
    document.head.appendChild(script)
  })
  return gsiPromise
}

export function GoogleSignInButton({ onCredential }: Props) {
  const buttonRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  // Keep the latest callback without re-initializing GIS on every render.
  const callbackRef = useRef(onCredential)
  callbackRef.current = onCredential

  useEffect(() => {
    if (!CLIENT_ID) {
      setError('Google sign-in is not configured (missing NEXT_PUBLIC_GOOGLE_CLIENT_ID).')
      return
    }

    let cancelled = false
    loadGsi()
      .then(() => {
        if (cancelled || !buttonRef.current || !window.google) return
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response: GoogleCredentialResponse) => callbackRef.current(response.credential),
        })
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'filled_black',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          width: 320,
        })
      })
      .catch(() => {
        if (!cancelled) setError('Could not load Google sign-in. Check your connection and retry.')
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return <p className="text-xs text-particle-400 text-center">{error}</p>
  }

  return <div ref={buttonRef} className="flex justify-center" />
}
