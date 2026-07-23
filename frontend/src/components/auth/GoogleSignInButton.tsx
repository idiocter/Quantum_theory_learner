'use client'
import { useEffect, useRef, useState } from 'react'

const GSI_SRC = 'https://accounts.google.com/gsi/client'
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

interface GoogleCredentialResponse {
  credential: string
}

interface Props {
  onCredential: (credential: string) => void
}

// Script is loaded once per page lifetime — shared across every mount/remount.
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
    script.onerror = () => {
      gsiPromise = null // allow retry on next mount
      reject(new Error('Failed to load Google Identity Services'))
    }
    document.head.appendChild(script)
  })
  return gsiPromise
}

export function GoogleSignInButton({ onCredential }: Props) {
  const buttonRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  // Stable ref so the GIS callback always sees the latest handler without
  // triggering a re-initialize.
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
        if (cancelled || !buttonRef.current || !window.google?.accounts?.id) return

        // Cancel any existing GIS session before re-initializing — prevents the
        // "called multiple times" warning when this component remounts (e.g.
        // when the login page's loading state toggles it in and out of the tree).
        window.google.accounts.id.cancel()

        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response: GoogleCredentialResponse) =>
            callbackRef.current(response.credential),
          use_fedcm_for_prompt: true,
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
      // Cancel the GIS session when the component unmounts so it's clean for
      // the next mount.
      window.google?.accounts?.id?.cancel()
    }
  }, [])

  if (error) {
    return <p className="text-xs text-particle-400 text-center">{error}</p>
  }

  return <div ref={buttonRef} className="flex justify-center" />
}
