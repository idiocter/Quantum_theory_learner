// ── Auth ─────────────────────────────────────────────────────────────────────
export interface User {
  id: string
  username: string
  email: string
  first_name: string
  last_name: string
  avatar: string | null
  bio: string
  role: 'student' | 'instructor' | 'admin'
  date_joined: string
}

export interface UserProgress {
  xp_points: number
  streak_days: number
  last_activity: string | null
  total_quiz_score: number
  quiz_attempts: number
}

// ── Concepts ─────────────────────────────────────────────────────────────────
export interface Category {
  id: string
  name: string
  slug: string
  color: string
  icon: string
}

export interface Concept {
  id: string
  title: string
  slug: string
  description: string
  category: Category
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  prerequisites: string[]
  estimated_minutes: number
  view_count: number
  image: string | null
  is_published: boolean
  created_at: string
  updated_at: string
}

export interface KnowledgeGraph {
  nodes: Array<{ id: string; title: string; difficulty: string; category_color: string }>
  edges: Array<{ source: string; target: string; relationship: string }>
}

// ── Simulations ───────────────────────────────────────────────────────────────
export type SimulationType = 'double_slit' | 'particle_in_box' | 'wavefunction' | 'quantum_tunneling'
export type SimulationStatus = 'queued' | 'running' | 'completed' | 'failed'

export interface SimulationResult {
  id: string
  simulation_type: SimulationType
  status: SimulationStatus
  client_side: boolean
  parameters: Record<string, number | string>
  result_data: Record<string, unknown> | null
  created_at: string
}

// ── Quizzes ───────────────────────────────────────────────────────────────────
export type QuestionType = 'mcq' | 'numerical' | 'true_false'
export type Difficulty = 'beginner' | 'intermediate' | 'advanced'

export interface QuizOption {
  id: string
  text: string
}

export interface Question {
  id: string
  question_type: QuestionType
  text: string
  hint: string
  options: QuizOption[]
  points: number
  order: number
}

export interface Quiz {
  id: string
  title: string
  difficulty: Difficulty
  description: string
  time_limit_minutes: number
  question_count?: number
  questions?: Question[]
}

export interface QuizAttempt {
  id: string
  quiz: string
  quiz_title: string
  score: number
  max_score: number
  percentage: number
  status: 'in_progress' | 'completed' | 'abandoned'
  answers: Record<string, { submitted: string; correct: boolean; explanation: string }>
  started_at: string
  completed_at: string | null
}

// ── AI Tutor ─────────────────────────────────────────────────────────────────
export type MessageRole = 'user' | 'assistant'
export type MessageStatus = 'pending' | 'completed' | 'error'

export interface Message {
  id: string
  role: MessageRole
  content: string
  status: MessageStatus
  input_tokens: number
  output_tokens: number
  created_at: string
}

export interface Conversation {
  id: string
  title: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  concept: string | null
  concept_title: string | null
  total_tokens_used: number
  message_count?: number
  messages?: Message[]
  created_at: string
  updated_at: string
}

// ── API responses ─────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface APIError {
  detail?: string
  [key: string]: string | string[] | undefined
}
