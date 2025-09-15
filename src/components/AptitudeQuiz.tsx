"use client"

import * as React from "react"
import { Clock, LoaderCircle, CircleCheckBig, SquareCheck, ChartSpline, MousePointer2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"

type Option = {
  id: string
  label: string
  value: string
}

export type QuizQuestion = {
  id: string
  prompt: string
  options: Option[]
  hint?: string
}

export type QuizResults = {
  streamScores: Record<"Arts" | "Science" | "Commerce" | "Vocational", number>
  summary: string
  recommended: ("Arts" | "Science" | "Commerce" | "Vocational")[]
}

type Phase = "quiz" | "review" | "submitting" | "result"

export interface AptitudeQuizProps {
  questions: QuizQuestion[]
  durationSec?: number
  allowSkip?: boolean
  autoSubmitOnTime?: boolean
  initialAnswers?: Record<string, string>
  onSubmit?: (answers: Record<string, string>) => Promise<QuizResults>
  className?: string
  style?: React.CSSProperties
  layout?: "compact" | "full"
}

function formatTime(totalSeconds: number) {
  const m = Math.max(0, Math.floor(totalSeconds / 60))
  const s = Math.max(0, totalSeconds % 60)
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
}

const DEFAULT_DURATION = 12 * 60 // 12 minutes

export default function AptitudeQuiz({
  questions,
  durationSec = DEFAULT_DURATION,
  allowSkip = true,
  autoSubmitOnTime = true,
  initialAnswers,
  onSubmit,
  className,
  style,
  layout = "full",
}: AptitudeQuizProps) {
  const total = questions.length
  const [phase, setPhase] = React.useState<Phase>("quiz")
  const [index, setIndex] = React.useState(0)
  const [answers, setAnswers] = React.useState<Record<string, string>>(() => initialAnswers ?? {})
  const [remaining, setRemaining] = React.useState(durationSec)
  const [isMounted, setIsMounted] = React.useState(false)
  const [results, setResults] = React.useState<QuizResults | null>(null)
  const current = questions[index]

  // Mount guard to avoid hydration mismatch for timer
  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  // Timer
  React.useEffect(() => {
    if (!isMounted || phase === "result" || phase === "submitting") return
    if (remaining <= 0) {
      toast.warning("Time's up. Review and submit your answers.")
      if (autoSubmitOnTime) {
        handleSubmit()
      } else {
        setPhase("review")
      }
      return
    }
    const t = setInterval(() => {
      setRemaining((r) => (r > 0 ? r - 1 : 0))
    }, 1000)
    return () => clearInterval(t)
  }, [isMounted, phase, remaining, autoSubmitOnTime])

  const progress = total > 0 ? Math.round(((index + 1) / total) * 100) : 0
  const answeredCount = Object.keys(answers).length
  const canGoNext = allowSkip || !!answers[current?.id]
  const allAnswered = questions.every((q) => !!answers[q.id])

  function selectOption(qid: string, val: string) {
    setAnswers((prev) => ({ ...prev, [qid]: val }))
  }

  function goNext() {
    if (index < total - 1 && canGoNext) setIndex((i) => i + 1)
  }

  function goPrev() {
    if (index > 0) setIndex((i) => i - 1)
  }

  function jumpTo(i: number) {
    setIndex(i)
    setPhase("quiz")
  }

  function handleReview() {
    setPhase("review")
  }

  async function handleSubmit() {
    setPhase("submitting")
    const toastId = toast.loading("Analyzing your responses...")
    try {
      const res = onSubmit ? await onSubmit(answers) : await mockEvaluate(answers)
      setResults(res)
      setPhase("result")
      toast.success("Results ready", { id: toastId })
    } catch (e) {
      console.error(e)
      setPhase("review")
      toast.error("Failed to process results. Please try again.", { id: toastId })
    }
  }

  // Keyboard support for quick navigation
  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!current) return
    if (e.key === "ArrowRight") {
      e.preventDefault()
      goNext()
    } else if (e.key === "ArrowLeft") {
      e.preventDefault()
      goPrev()
    }
  }

  return (
    <Card
      className={cn(
        "bg-card text-card-foreground border border-border shadow-sm rounded-2xl",
        layout === "compact" ? "p-3 sm:p-4" : "p-4 sm:p-6",
        className
      )}
      style={style}
      onKeyDown={onKeyDown}
      role="group"
      aria-label="Aptitude assessment"
    >
      <CardHeader className="p-0 mb-4 sm:mb-6">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base sm:text-lg md:text-xl truncate">
              Career Aptitude Assessment
            </CardTitle>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Determine your best-fit stream: Arts, Science, Commerce, or Vocational
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "inline-flex items-center rounded-full bg-secondary text-foreground px-2.5 py-1",
                "text-xs sm:text-sm"
              )}
              aria-live="polite"
            >
              <Clock className="h-4 w-4 mr-1.5 text-foreground/80" aria-hidden="true" />
              <span className={remaining <= 30 ? "text-destructive font-semibold" : ""}>
                {formatTime(remaining)}
              </span>
            </div>
            <div
              className="hidden sm:inline-flex items-center rounded-full bg-accent text-foreground px-2.5 py-1 text-xs"
              aria-label="Progress"
            >
              <span className="font-medium">{index + 1}</span>
              <span className="mx-1 text-muted-foreground">/</span>
              <span className="text-muted-foreground">{total}</span>
            </div>
          </div>
        </div>

        <div className="mt-3 sm:mt-4">
          <Progress value={progress} className="h-2 bg-muted" />
          <div className="mt-1.5 flex justify-between text-[11px] sm:text-xs text-muted-foreground">
            <span>{answeredCount} answered</span>
            <span>{progress}%</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {phase === "quiz" && current && (
          <div className="space-y-5 sm:space-y-6">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                Question {index + 1} of {total}
              </div>
              <h3 className="text-lg sm:text-xl font-semibold leading-snug break-words">
                {current.prompt}
              </h3>
              {current.hint ? (
                <p className="text-sm text-muted-foreground">{current.hint}</p>
              ) : null}
            </div>

            <div
              role="radiogroup"
              aria-label={`Options for question ${index + 1}`}
              className="grid gap-2"
            >
              {current.options.map((opt) => {
                const selected = answers[current.id] === opt.value
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => selectOption(current.id, opt.value)}
                    className={cn(
                      "w-full text-left rounded-xl border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      "px-3 sm:px-4 py-3 sm:py-3.5",
                      selected
                        ? "bg-foreground text-primary-foreground border-foreground"
                        : "bg-card border-border hover:bg-secondary"
                    )}
                    aria-checked={selected}
                    role="radio"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "mt-0.5 inline-flex items-center justify-center rounded-md border",
                          selected ? "bg-primary-foreground/10 border-primary-foreground" : "bg-card border-border",
                          "h-5 w-5 shrink-0"
                        )}
                        aria-hidden="true"
                      >
                        {selected ? (
                          <CircleCheckBig className="h-4 w-4" />
                        ) : (
                          <SquareCheck className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className={cn("text-sm sm:text-base", selected ? "text-primary-foreground" : "")}>
                          {opt.label}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                onClick={goPrev}
                disabled={index === 0}
                className="bg-card"
              >
                Prev
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={handleReview}
                  className="hidden sm:inline-flex"
                >
                  Review answers
                </Button>

                {index < total - 1 ? (
                  <Button onClick={goNext} disabled={!canGoNext} className="gap-2">
                    <MousePointer2 className="h-4 w-4" aria-hidden="true" />
                    Next
                  </Button>
                ) : (
                  <Button
                    onClick={() => setPhase("review")}
                    disabled={!allowSkip && !allAnswered}
                    className="gap-2"
                  >
                    Review & Submit
                  </Button>
                )}
              </div>
            </div>

            <Separator className="my-2" />

            <ReviewStrip
              questions={questions}
              answers={answers}
              onJump={jumpTo}
            />
          </div>
        )}

        {phase === "review" && (
            <ReviewPanel
              questions={questions}
              answers={answers}
              onBack={() => setPhase("quiz")}
              onSubmit={handleSubmit}
              onJump={jumpTo}
              allAnswered={allAnswered}
              allowSubmitWhenUnanswered={allowSkip}
              remaining={remaining}
            />
        )}

        {phase === "submitting" && (
          <div className="flex flex-col items-center justify-center text-center py-16">
            <LoaderCircle className="h-8 w-8 animate-spin text-foreground/80" aria-hidden="true" />
            <p className="mt-4 text-sm text-muted-foreground">Crunching numbers and matching your strengths…</p>
          </div>
        )}

        {phase === "result" && results && (
          <ResultsPanel results={results} onRetake={() => handleRetake()} />
        )}
      </CardContent>
    </Card>
  )

  function handleRetake() {
    setAnswers({})
    setIndex(0)
    setResults(null)
    setRemaining(durationSec)
    setPhase("quiz")
  }
}

function ReviewStrip({
  questions,
  answers,
  onJump,
}: {
  questions: QuizQuestion[]
  answers: Record<string, string>
  onJump: (i: number) => void
}) {
  return (
    <div className="rounded-xl border border-border bg-secondary/50">
      <div className="px-3 sm:px-4 py-2 text-xs text-muted-foreground">
        Quick review
      </div>
      <Separator />
      <div className="p-2">
        <div className="flex flex-wrap gap-2">
          {questions.map((q, i) => {
            const answered = !!answers[q.id]
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => onJump(i)}
                className={cn(
                  "inline-flex items-center justify-center h-8 w-8 rounded-lg border text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  answered
                    ? "bg-foreground text-primary-foreground border-foreground"
                    : "bg-card border-border hover:bg-secondary"
                )}
                aria-label={`Jump to question ${i + 1} ${answered ? "(answered)" : "(unanswered)"}`}
              >
                {i + 1}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ReviewPanel({
  questions,
  answers,
  onBack,
  onSubmit,
  onJump,
  allAnswered,
  allowSubmitWhenUnanswered,
  remaining,
}: {
  questions: QuizQuestion[]
  answers: Record<string, string>
  onBack: () => void
  onSubmit: () => void
  onJump: (i: number) => void
  allAnswered: boolean
  allowSubmitWhenUnanswered: boolean
  remaining: number
}) {
  const unanswered = questions.filter((q) => !answers[q.id]).length

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h3 className="text-lg sm:text-xl font-semibold">Review your answers</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {unanswered === 0 ? "All questions answered." : `${unanswered} unanswered. You can jump to any question to complete it.`}
          </p>
        </div>
        <div className="inline-flex items-center rounded-full bg-secondary px-3 py-1.5 text-xs">
          <Clock className="h-4 w-4 mr-1.5" /> Time left:{" "}
          <span className={cn("ml-1", remaining <= 30 ? "text-destructive font-semibold" : "")}>
            {formatTime(remaining)}
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <ScrollArea className="max-h-[48vh]">
          <div className="divide-y">
            {questions.map((q, i) => {
              const selected = q.options.find((o) => o.value === answers[q.id])
              return (
                <div key={q.id} className="p-3 sm:p-4">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => onJump(i)}
                      className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-secondary text-xs font-medium hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`Go to question ${i + 1}`}
                    >
                      {i + 1}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm sm:text-base font-medium leading-snug">{q.prompt}</div>
                      <div className="mt-1.5 text-sm">
                        {selected ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-1">
                            <CircleCheckBig className="h-4 w-4" aria-hidden="true" />
                            <span className="break-words">{selected.label}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">No answer selected</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack} className="bg-card">
          Back to questions
        </Button>
        <Button
          onClick={onSubmit}
          disabled={!allowSubmitWhenUnanswered && !allAnswered}
          className="gap-2"
        >
          <ChartSpline className="h-4 w-4" aria-hidden="true" />
          Submit and view results
        </Button>
      </div>
    </div>
  )
}

function ResultsPanel({
  results,
  onRetake,
}: {
  results: QuizResults
  onRetake: () => void
}) {
  const streams: ("Arts" | "Science" | "Commerce" | "Vocational")[] = ["Arts", "Science", "Commerce", "Vocational"]
  const maxScore = Math.max(...streams.map((s) => results.streamScores[s] ?? 0)) || 1

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg sm:text-xl font-semibold">Your results</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Based on your responses, here are your fit scores across streams.
          </p>
        </div>
        <div className="hidden sm:flex items-center rounded-full bg-accent px-3 py-1.5 text-xs">
          <CircleCheckBig className="h-4 w-4 mr-1.5" aria-hidden="true" />
          Completed
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
        <div className="space-y-3">
          {streams.map((s, idx) => {
            const score = results.streamScores[s] ?? 0
            const pct = Math.round((score / maxScore) * 100)
            const color =
              s === "Science" ? "bg-chart-3" :
              s === "Commerce" ? "bg-chart-4" :
              s === "Vocational" ? "bg-chart-2" :
              "bg-chart-5"
            return (
              <div key={s} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{s}</span>
                  <span className="text-muted-foreground">{pct}%</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500 ease-out", color)}
                    style={{ width: `${pct}%` }}
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    role="progressbar"
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-secondary/50 p-3 sm:p-4">
        <h4 className="font-semibold text-sm sm:text-base">Recommendations</h4>
        <p className="text-sm text-muted-foreground mt-1">
          {results.summary}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {results.recommended.map((r) => (
            <span
              key={r}
              className="inline-flex items-center rounded-full bg-foreground text-primary-foreground px-3 py-1 text-xs"
            >
              {r}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onRetake} className="bg-card">
          Retake assessment
        </Button>
        <div className="text-xs text-muted-foreground">
          Tip: Scroll to explore colleges and scholarships next.
        </div>
      </div>
    </div>
  )
}

// Mock evaluation as a graceful fallback
async function mockEvaluate(answers: Record<string, string>): Promise<QuizResults> {
  await new Promise((r) => setTimeout(r, 1200))
  // Simple scoring heuristic for demo purposes only
  const buckets: Record<"Arts" | "Science" | "Commerce" | "Vocational", number> = {
    Arts: 0,
    Science: 0,
    Commerce: 0,
    Vocational: 0,
  }
  Object.values(answers).forEach((val) => {
    const v = val.toLowerCase()
    if (v.includes("logic") || v.includes("math") || v.includes("science")) buckets.Science += 2
    else if (v.includes("business") || v.includes("finance") || v.includes("commerce")) buckets.Commerce += 2
    else if (v.includes("creative") || v.includes("art") || v.includes("design") || v.includes("language")) buckets.Arts += 2
    else buckets.Vocational += 1
  })
  const sorted = (Object.keys(buckets) as (keyof typeof buckets)[]).sort((a, b) => buckets[b] - buckets[a])
  return {
    streamScores: buckets,
    summary: `You show strengths aligned with ${sorted[0]}${sorted[1] ? ` and ${sorted[1]}` : ""}. Explore related subjects and projects to validate your interest.`,
    recommended: sorted.slice(0, 2) as ("Arts" | "Science" | "Commerce" | "Vocational")[],
  }
}