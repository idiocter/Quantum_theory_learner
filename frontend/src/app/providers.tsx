'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useState } from 'react'

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#080f1c',
            color: '#e2e8f0',
            border: '1px solid rgba(0, 102, 255, 0.2)',
            fontFamily: 'Inter, sans-serif',
            fontSize: '13px',
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#020408' },
          },
          error: {
            iconTheme: { primary: '#ec4899', secondary: '#020408' },
          },
        }}
      />
    </QueryClientProvider>
  )
}
