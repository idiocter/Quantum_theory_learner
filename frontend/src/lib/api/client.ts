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
let waitQueue: Array<(token: null) => void> = []

function drainQueue(error: unknown) {
  waitQueue.forEach((cb) => cb(null))
  waitQueue = []
  if (error) throw error
}

// Intercept 401 → attempt token refresh once, then retry original request
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const original = error.config as typeof error.config & { _retry?: boolean }

    if (error.response?.status === 401 && original && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          waitQueue.push((err) => {
            if (err) reject(err)
            else resolve(apiClient(original))
          })
        })
      }

      original._retry = true
      isRefreshing = true

      try {
        await apiClient.post('/auth/token/refresh/')
        drainQueue(null)
        return apiClient(original)
      } catch (refreshError) {
        drainQueue(refreshError)
        // Clear auth state — redirect handled by AuthGuard
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('qls:session-expired'))
        }
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
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
