import { apiClient } from './client'
import type { User, UserProgress } from '@/types'

export const authApi = {
  register: (data: { username: string; email: string; password: string; password_confirm: string }) =>
    apiClient.post<{ user: User }>('/auth/register/', data),

  login: (data: { username: string; password: string }) =>
    apiClient.post<{ user: User }>('/auth/login/', data),

  logout: () => apiClient.post('/auth/logout/'),

  me: () => apiClient.get<User>('/auth/me/'),

  updateProfile: (data: Partial<Pick<User, 'first_name' | 'last_name' | 'bio'>>) =>
    apiClient.patch<User>('/auth/me/', data),

  changePassword: (data: { old_password: string; new_password: string; new_password_confirm: string }) =>
    apiClient.post('/auth/password/change/', data),

  myProgress: () => apiClient.get<UserProgress>('/auth/progress/'),
}
