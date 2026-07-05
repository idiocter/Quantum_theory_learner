import axios, { AxiosError, AxiosResponse } from 'axios'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost/api'

export const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // send httpOnly JWT cookies automatically
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30_000,
})

let isRefreshing = false
let waitQueue: Array<{ resolve: () => void; reject: (error: unknown) => void }> = []

// Release everyone waiting on the in-flight refresh: on success they retry,
// on failure they reject with the refresh error (no spurious retry storm).
function flushQueue(error: unknown) {
  waitQueue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve()))
  waitQueue = []
}

// The refresh endpoint itself must never trigger the refresh flow, or its own
// 401 (expired refresh cookie) would be queued waiting for a refresh that can
// never complete — a deadlock that hangs every subsequent request.
const REFRESH_URL = '/auth/token/refresh/'

// Intercept 401 → attempt token refresh once, then retry original request
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const original = error.config as (AxiosError['config'] & { _retry?: boolean }) | undefined
    const isRefreshCall = original?.url?.includes(REFRESH_URL) ?? false

    if (error.response?.status !== 401 || !original || original._retry || isRefreshCall) {
      return Promise.reject(error)
    }

    // A refresh is already running — wait for it, then retry (or fail with it).
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        waitQueue.push({
          resolve: () => resolve(apiClient(original)),
          reject: (err) => reject(err),
        })
      })
    }

    original._retry = true
    isRefreshing = true

    try {
      await apiClient.post(REFRESH_URL)
      flushQueue(null)
      return apiClient(original)
    } catch (refreshError) {
      flushQueue(refreshError)
      // Session is truly dead — clear auth state; AuthGuard handles the redirect.
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('qls:session-expired'))
      }
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)

export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data
    if (typeof data === 'object' && data !== null) {
      if (typeof data.detail === 'string') return data.detail
      const firstKey = Object.keys(data)[0]
      if (firstKey) {
        const msg = data[firstKey]
        return Array.isArray(msg) ? msg[0] : String(msg)
      }
    }
    return error.message
  }
  return 'An unexpected error occurred.'
}
