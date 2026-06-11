import { apiClient } from './client'
import type { Conversation, Message, PaginatedResponse } from '@/types'

export const aiApi = {
  listConversations: () =>
    apiClient.get<PaginatedResponse<Conversation>>('/ai/conversations/'),

  createConversation: (data: { concept?: string; difficulty?: 'beginner' | 'intermediate' | 'advanced'; title?: string }) =>
    apiClient.post<Conversation>('/ai/conversations/', data),

  getConversation: (id: string) =>
    apiClient.get<Conversation>(`/ai/conversations/${id}/`),

  deleteConversation: (id: string) =>
    apiClient.delete(`/ai/conversations/${id}/`),

  sendMessage: (conversationId: string, content: string) =>
    apiClient.post<{ user_message_id: string; assistant_message_id: string; status: string }>(
      `/ai/conversations/${conversationId}/messages/`,
      { content }
    ),

  getMessage: (conversationId: string, messageId: string) =>
    apiClient.get<Message>(`/ai/conversations/${conversationId}/messages/${messageId}/`),
}
