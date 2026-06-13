import { apiClient } from './client'
import type { User, UserProgress } from '@/types'

export const authApi = {
  // Google is the only sign-in method. `credential` is the ID token returned
  // by Google Identity Services on the client.
  google: (credential: string) =>
    apiClient.post<{ user: User; created: boolean }>('/auth/google/', { credential }),

  logout: () => apiClient.post('/auth/logout/'),

  me: () => apiClient.get<User>('/auth/me/'),

  updateProfile: (data: Partial<Pick<User, 'first_name' | 'last_name' | 'bio'>>) =>
    apiClient.patch<User>('/auth/me/', data),

  myProgress: () => apiClient.get<UserProgress>('/auth/progress/'),
}
