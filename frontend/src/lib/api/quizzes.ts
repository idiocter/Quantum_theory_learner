import { apiClient } from './client'
import type { PaginatedResponse, Quiz, QuizAttempt } from '@/types'

export const quizzesApi = {
  list: (params?: { difficulty?: string; concept?: string; page?: number }) =>
    apiClient.get<PaginatedResponse<Quiz>>('/quizzes/', { params }),

  detail: (id: string) => apiClient.get<Quiz>(`/quizzes/${id}/`),

  start: (id: string) => apiClient.post<QuizAttempt>(`/quizzes/${id}/start/`),

  submit: (attemptId: string, answers: Record<string, string>) =>
    apiClient.post<QuizAttempt>(`/quizzes/attempts/${attemptId}/submit/`, { answers }),

  myAttempts: (params?: { page?: number }) =>
    apiClient.get<PaginatedResponse<QuizAttempt>>('/quizzes/my-attempts/', { params }),
}
