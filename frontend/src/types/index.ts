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
export type Track = 'quantum-physics' | 'quantum-computing'

export interface Category {
  id: string
  name: string
  slug: string
  description?: string
  color: string
  icon: string
  order?: number
  track?: Track
}

// A branch is a Category enriched with its published-topic count
// (GET /api/concepts/branches/).
export interface Branch extends Category {
  topic_count: number
}

// A formula attached to a concept (nested on the detail endpoint and
// returned flat from the site-wide /api/concepts/formulas/ index).
export interface Formula {
  id: string
  latex: string
  description: string
  symbols: Record<string, string>
  derivation_steps: string[]
  order?: number
  // Present only on the site-wide formula index.
  concept_slug?: string
  concept_title?: string
  branch?: string | null
}

export interface ConceptSearchResult {
  id: string
  title: string
  slug: string
  category: Category
  description: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  rank: number
}

export interface ConceptContent {
  id: string
  level: 'beginner' | 'intermediate' | 'advanced'
  explanation: string
  math_derivation: string
  key_equations: Array<{ label: string; latex: string }>
  further_reading: Array<{ title: string; url: string }>
}

export interface Concept {
  id: string
  title: string
  slug: string
  summary?: string
  description: string
  category: Category
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  order: number
  prerequisites: string[]
  estimated_minutes: number
  view_count: number
  image: string | null
  is_published: boolean
  created_at: string
  updated_at: string
  // The following fields are present only on the detail endpoint.
  history?: string
  related_simulation?: string | null
  formulas?: Formula[]
  // Slugs of topics this one unlocks (downstream prerequisites).
  unlocks?: string[]
  // The per-level explanatory chapters.
  contents?: ConceptContent[]
}

// A cross-cutting glossary term (GET /api/concepts/glossary/). The frontend
// linker resolves `[[slug]]` / `[[slug|surface]]` prose markers to these rows.
export interface GlossaryTerm {
  id: string
  term: string
  slug: string
  definition: string
  // The lesson that defines the term, if any — tooltips deep-link to it.
  concept_slug: string | null
  concept_title: string | null
}

// Per-lesson unlock status computed server-side from the user's visited
// progress (GET /api/concepts/unlocks/). A lesson is `unlocked` once every
// prerequisite has been visited. The server is the source of truth.
export interface LessonUnlock {
  slug: string
  title: string
  category_slug: string | null
  order: number
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  visited: boolean
  unlocked: boolean
  prerequisites: Array<{ slug: string; title: string; visited: boolean }>
  missing_prerequisites: string[]
}

export interface KnowledgeGraphNode {
  id: string
  title: string
  difficulty: string
  category_color: string
  branch_slug: string
  branch_name: string
  connection_count: number
}

export interface KnowledgeGraph {
  nodes: KnowledgeGraphNode[]
  edges: Array<{ source: string; target: string; relationship: string }>
}

// ── Per-user progress ──
export interface TopicProgress {
  concept_slug: string
  concept_title: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  branch_slug: string
  branch_name: string
  bookmarked: boolean
  time_spent_seconds: number
  visited_at: string
}

export interface BranchCompletion {
  name: string
  color: string
  total: number
  visited: number
  percent: number
}

export interface ProgressResponse {
  visited: TopicProgress[]
  bookmarks: TopicProgress[]
  completion: Record<string, BranchCompletion>
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
  // Provided by StandardResultsPagination (see backend/apps/core/pagination.py).
  total_pages: number
  current_page: number
  results: T[]
}

export interface APIError {
  detail?: string
  [key: string]: string | string[] | undefined
}
