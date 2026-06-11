'use client'
import { use, useState, useCallback } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import AuthGuard from '@/components/auth/AuthGuard'
import { quizzesApi } from '@/lib/api/quizzes'
import { difficultyLabel, cn } from '@/lib/utils'
import type { Question } from '@/types'

function QuestionView({
  q,
  index,
  answer,
  onAnswer,
  submitted,
  result,
}: {
  q: Question
  index: number
  answer: string
  onAnswer: (qid: string, val: string) => void
  submitted: boolean
  result?: { correct: boolean; explanation: string }
}) {
  return (
    <div className={cn('card-quantum p-6 transition-all', submitted && result?.correct && 'border-wave-500/40', submitted && result && !result.correct && 'border-particle-500/40')}>
      <div className="flex items-start gap-3 mb-4">
        <span className="text-xs font-mono text-slate-600 mt-0.5 shrink-0">Q{index + 1}</span>
        <p className="text-sm text-slate-200 leading-relaxed">{q.text}</p>
      </div>

      {q.question_type === 'mcq' || q.question_type === 'true_false' ? (
        <div className="space-y-2 ml-5">
          {q.options.map((opt) => (
            <label
              key={opt.id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                answer === opt.id
                  ? 'border-quantum-500/50 bg-quantum-500/10'
                  : 'border-white/5 hover:border-white/10',
                submitted && 'cursor-default'
              )}
            >
              <input
                type="radio"
                name={q.id}
                value={opt.id}
                checked={answer === opt.id}
                onChange={() => !submitted && onAnswer(q.id, opt.id)}
                disabled={submitted}
                className="accent-quantum-500"
              />
              <span className="text-sm text-slate-300">{opt.text}</span>
            </label>
          ))}
        </div>
      ) : (
        <div className="ml-5">
          <input
            type="number"
            step="any"
            value={answer}
            onChange={(e) => !submitted && onAnswer(q.id, e.target.value)}
            disabled={submitted}
            placeholder="Enter numerical answer..."
            className="input-quantum max-w-xs text-sm"
          />
        </div>
      )}

      {submitted && result && (
        <div className={cn('mt-4 ml-5 p-3 rounded-lg text-xs', result.correct ? 'bg-wave-500/10 border border-wave-500/20 text-wave-400' : 'bg-particle-500/10 border border-particle-500/20 text-particle-400')}>
          <span className="font-semibold">{result.correct ? '✓ Correct' : '✗ Incorrect'}</span>
          {result.explanation && <p className="text-slate-400 mt-1">{result.explanation}</p>}
        </div>
      )}

      {q.hint && !submitted && (
        <details className="ml-5 mt-3">
          <summary className="text-xs text-slate-600 cursor-pointer hover:text-slate-400 transition-colors">Hint</summary>
          <p className="text-xs text-slate-500 mt-1.5 pl-2">{q.hint}</p>
        </details>
      )}
    </div>
  )
}

export default function QuizAttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [attempt, setAttempt] = useState<Awaited<ReturnType<typeof quizzesApi.start>>['data'] | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [results, setResults] = useState<typeof attempt | null>(null)

  const { data: quiz, isLoading } = useQuery({
    queryKey: ['quiz', id],
    queryFn: () => quizzesApi.detail(id).then((r) => r.data),
  })

  const startMutation = useMutation({
    mutationFn: () => quizzesApi.start(id),
    onSuccess: (res) => setAttempt(res.data),
    onError: () => toast.error('Failed to start quiz'),
  })

  const submitMutation = useMutation({
    mutationFn: () => quizzesApi.submit(attempt!.id, answers),
    onSuccess: (res) => {
      setResults(res.data)
      setSubmitted(true)
      toast.success(`Score: ${res.data.score}/${res.data.max_score} (${res.data.percentage?.toFixed(0)}%)`)
    },
    onError: () => toast.error('Failed to submit quiz'),
  })

  const setAnswer = useCallback((qid: string, val: string) => {
    setAnswers((a) => ({ ...a, [qid]: val }))
  }, [])

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="max-w-2xl mx-auto px-6 py-10 space-y-4 animate-pulse">
          <div className="h-8 bg-void-800 rounded w-1/2" />
          <div className="h-32 bg-void-800 rounded" />
          <div className="h-32 bg-void-800 rounded" />
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="max-w-2xl mx-auto px-6 py-10">
        {quiz && (
          <>
            <div className="mb-8">
              <button onClick={() => router.push('/quiz')} className="text-xs text-slate-500 hover:text-slate-300 mb-4 transition-colors">
                ← Back to quizzes
              </button>
              <h1 className="text-2xl font-bold text-white">{quiz.title}</h1>
              <div className="flex items-center gap-3 mt-2">
                <span className={`badge-${quiz.difficulty} text-xs px-2 py-0.5 rounded`}>
                  {difficultyLabel(quiz.difficulty)}
                </span>
                <span className="text-xs text-slate-600">{quiz.time_limit_minutes} min</span>
                <span className="text-xs text-slate-600">{quiz.questions?.length ?? 0} questions</span>
              </div>
            </div>

            {!attempt ? (
              <div className="card-quantum p-8 text-center space-y-4">
                <p className="text-slate-400 text-sm">{quiz.description}</p>
                <button onClick={() => startMutation.mutate()} disabled={startMutation.isPending} className="btn-quantum">
                  {startMutation.isPending ? 'Starting...' : 'Start Quiz'}
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {quiz.questions?.map((q, i) => (
                  <QuestionView
                    key={q.id}
                    q={q}
                    index={i}
                    answer={answers[q.id] ?? ''}
                    onAnswer={setAnswer}
                    submitted={submitted}
                    result={results?.answers?.[q.id]}
                  />
                ))}

                {!submitted ? (
                  <button
                    onClick={() => submitMutation.mutate()}
                    disabled={submitMutation.isPending}
                    className="btn-quantum w-full py-3"
                  >
                    {submitMutation.isPending ? 'Submitting...' : 'Submit Answers'}
                  </button>
                ) : (
                  <div className="card-quantum p-8 text-center space-y-4">
                    <div className={`text-4xl font-mono font-bold ${(results?.percentage ?? 0) >= 70 ? 'text-wave-400' : 'text-particle-400'}`}>
                      {results?.percentage?.toFixed(0)}%
                    </div>
                    <p className="text-slate-400 text-sm">
                      {results?.score}/{results?.max_score} points
                    </p>
                    <div className="flex gap-3 justify-center flex-wrap">
                      <button onClick={() => router.push('/quiz')} className="btn-ghost text-sm">
                        Back to quizzes
                      </button>
                      <button onClick={() => router.push('/dashboard')} className="btn-quantum text-sm">
                        Dashboard
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AuthGuard>
  )
}
