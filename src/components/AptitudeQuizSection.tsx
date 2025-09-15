"use client";

import * as React from "react";
import { GraduationCap, SearchCheck, ChartSpline, IterationCw, MessageCircleQuestionMark, Check } from "lucide-react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

type QuizOption = {
  id: string;
  label: string;
  value: string;
};

type QuizQuestion = {
  id: string;
  text: string;
  options: QuizOption[];
};

type Recommendation = {
  stream: "Arts" | "Science" | "Commerce" | "Vocational" | string;
  score: number; // 0-100
  description: string;
  careers: string[];
  rationale?: string;
};

type QuizResult = {
  summary?: string;
  recommendations: Recommendation[];
};

export interface AptitudeQuizSectionProps {
  className?: string;
  questions?: QuizQuestion[];
  onComplete?: (result: QuizResult) => void;
}

const DEFAULT_QUESTIONS: QuizQuestion[] = [
  {
    id: "q1",
    text: "Which kind of activities do you naturally enjoy the most?",
    options: [
      { id: "q1o1", label: "Conducting experiments or solving scientific problems", value: "science" },
      { id: "q1o2", label: "Analyzing markets, managing finances, or entrepreneurship", value: "commerce" },
      { id: "q1o3", label: "Creating art, writing, music, or social studies", value: "arts" },
      { id: "q1o4", label: "Hands-on tasks, technical skills, or learning a trade", value: "vocational" },
    ],
  },
  {
    id: "q2",
    text: "Which subjects have you consistently performed well in or found engaging?",
    options: [
      { id: "q2o1", label: "Mathematics and Physics", value: "science" },
      { id: "q2o2", label: "Accountancy, Business Studies, Economics", value: "commerce" },
      { id: "q2o3", label: "History, Literature, Political Science", value: "arts" },
      { id: "q2o4", label: "Computer Applications, Design, or Technical Drawing", value: "vocational" },
    ],
  },
  {
    id: "q3",
    text: "What kind of career environment appeals to you?",
    options: [
      { id: "q3o1", label: "Research labs, engineering teams, or healthcare settings", value: "science" },
      { id: "q3o2", label: "Corporate, finance, consulting, or business management", value: "commerce" },
      { id: "q3o3", label: "Media, education, public service, or creative industries", value: "arts" },
      { id: "q3o4", label: "Industry workshops, IT support, design studios, or field work", value: "vocational" },
    ],
  },
  {
    id: "q4",
    text: "How do you prefer to approach complex problems?",
    options: [
      { id: "q4o1", label: "Analytically with experiments, models, and data", value: "science" },
      { id: "q4o2", label: "Strategically with market insights and financial analysis", value: "commerce" },
      { id: "q4o3", label: "Critically with multiple perspectives and creative thinking", value: "arts" },
      { id: "q4o4", label: "Practically by building, testing, and iterating", value: "vocational" },
    ],
  },
  {
    id: "q5",
    text: "What motivates you most in learning?",
    options: [
      { id: "q5o1", label: "Discovering how the natural world works", value: "science" },
      { id: "q5o2", label: "Understanding economies, businesses, and markets", value: "commerce" },
      { id: "q5o3", label: "Exploring cultures, ideas, and human behavior", value: "arts" },
      { id: "q5o4", label: "Mastering real-world skills that create tangible outcomes", value: "vocational" },
    ],
  },
];

function getStreamMeta(stream: string) {
  const meta: Record<
    string,
    { color: string; bg: string; border: string; label: string }
  > = {
    Science: {
      color: "text-[#1f2b48]",
      bg: "bg-[#e6f0ff]",
      border: "border-[#d9e7ff]",
      label: "Science",
    },
    Commerce: {
      color: "text-[#1f2b48]",
      bg: "bg-[#f2f6ff]",
      border: "border-[#e4e9f2]",
      label: "Commerce",
    },
    Arts: {
      color: "text-[#1f2b48]",
      bg: "bg-[#eaf1ff]",
      border: "border-[#dfe8ff]",
      label: "Arts & Humanities",
    },
    Vocational: {
      color: "text-[#1f2b48]",
      bg: "bg-[#e9f0fb]",
      border: "border-[#d9e2ef]",
      label: "Vocational/Technical",
    },
  };
  return meta[stream] || {
    color: "text-foreground",
    bg: "bg-accent",
    border: "border-border",
    label: stream,
  };
}

export default function AptitudeQuizSection({
  className,
  questions = DEFAULT_QUESTIONS,
  onComplete,
}: AptitudeQuizSectionProps) {
  const [current, setCurrent] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<QuizResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const total = questions.length;
  const currentQuestion = questions[current];
  const selected = answers[currentQuestion?.id || ""];

  const progressValue = total > 0 ? Math.round(((current + 1) / total) * 100) : 0;

  function handleSelect(value: string) {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
    setError(null);
  }

  function handlePrev() {
    setError(null);
    setCurrent((i) => Math.max(0, i - 1));
  }

  function handleNext() {
    if (!selected) {
      setError("Please select an option to continue.");
      toast.error("Please choose an answer before proceeding.");
      return;
    }
    setError(null);
    setCurrent((i) => Math.min(total - 1, i + 1));
  }

  function resetQuiz() {
    setAnswers({});
    setCurrent(0);
    setSubmitting(false);
    setResult(null);
    setError(null);
  }

  async function handleSubmit() {
    if (!selected) {
      setError("Please select an option to continue.");
      toast.error("Please choose an answer before submitting.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        responses: questions.map((q) => ({
          questionId: q.id,
          answer: answers[q.id],
        })),
      };

      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const msg = await safeParseError(res);
        throw new Error(msg || "Failed to process quiz. Please try again.");
      }

      const data = (await res.json()) as QuizResult | any;

      // Normalize to our QuizResult shape if necessary
      const normalized: QuizResult = normalizeResult(data);

      setResult(normalized);
      onComplete?.(normalized);
      toast.success("Your recommendations are ready!");
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Something went wrong. Please try again.");
      toast.error(e?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const isLast = current === total - 1;

  return (
    <section
      className={["w-full", className || ""].join(" ")}
      aria-label="Aptitude Assessment"
    >
      <div className="w-full max-w-3xl mx-auto">
        <Card className="bg-card shadow-sm border border-border/60 overflow-hidden">
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-primary">
                <GraduationCap className="h-5 w-5" aria-hidden="true" />
              </div>
              <CardTitle className="text-xl sm:text-2xl font-heading">
                Aptitude Assessment
              </CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Answer a few questions to discover the academic stream that best aligns with your strengths and interests.
            </p>
          </CardHeader>

          {!result ? (
            <>
              <CardContent className="space-y-5">
                <div className="space-y-2" aria-live="polite">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      Question {Math.min(current + 1, total)} of {total}
                    </span>
                    <span className="text-xs sm:text-sm text-muted-foreground">{progressValue}%</span>
                  </div>
                  <Progress value={progressValue} className="h-2" />
                </div>

                <div
                  className="rounded-lg border border-border bg-secondary p-4 sm:p-5"
                  role="group"
                  aria-labelledby="question-label"
                >
                  <div id="question-label" className="font-medium sm:text-lg break-words text-foreground">
                    {currentQuestion?.text}
                  </div>
                  <RadioGroup
                    className="mt-4 grid gap-3"
                    value={selected}
                    onValueChange={handleSelect}
                  >
                    {currentQuestion?.options.map((opt) => (
                      <OptionRow key={opt.id} option={opt} name={currentQuestion.id} selected={selected} />
                    ))}
                  </RadioGroup>
                </div>

                {error ? (
                  <div
                    role="alert"
                    className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  >
                    {error}
                  </div>
                ) : null}
              </CardContent>

              <CardFooter className="flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrev}
                  disabled={current === 0 || submitting}
                  className="min-w-[96px]"
                >
                  Back
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={resetQuiz}
                    disabled={submitting}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <IterationCw className="mr-2 h-4 w-4" aria-hidden="true" />
                    Reset
                  </Button>

                  {!isLast ? (
                    <Button type="button" onClick={handleNext} disabled={submitting} className="min-w-[120px]">
                      Next
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="min-w-[120px]"
                    >
                      {submitting ? (
                        <span className="inline-flex items-center gap-2">
                          <ChartSpline className="h-4 w-4 animate-pulse" aria-hidden="true" />
                          Processing...
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2">
                          <SearchCheck className="h-4 w-4" aria-hidden="true" />
                          See Results
                        </span>
                      )}
                    </Button>
                  )}
                </div>
              </CardFooter>
            </>
          ) : (
            <ResultsView result={result} onRetake={resetQuiz} />
          )}
        </Card>
      </div>
    </section>
  );
}

function OptionRow({
  option,
  name,
  selected,
}: {
  option: QuizOption;
  name: string;
  selected?: string;
}) {
  const id = `${name}-${option.id}`;
  const isActive = selected === option.value;
  return (
    <div
      className={[
        "w-full rounded-lg border px-3 py-3 sm:px-4 sm:py-3 transition-colors",
        "bg-card hover:bg-accent/50",
        isActive ? "border-primary ring-1 ring-primary/40 bg-accent" : "border-border",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <RadioGroupItem id={id} value={option.value} className="mt-0.5" />
        <Label
          htmlFor={id}
          className="flex-1 cursor-pointer text-sm sm:text-base text-foreground min-w-0"
        >
          <span className="block break-words">{option.label}</span>
        </Label>
        {isActive ? (
          <Check className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
        ) : null}
      </div>
    </div>
  );
}

function ResultsView({
  result,
  onRetake,
}: {
  result: QuizResult;
  onRetake: () => void;
}) {
  const top = [...(result.recommendations || [])].sort((a, b) => b.score - a.score);
  return (
    <>
      <CardHeader className="space-y-2 border-t border-border/60">
        <div className="flex items-center gap-2">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-primary">
            <SearchCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <CardTitle className="text-xl sm:text-2xl font-heading">
            Your Stream Recommendations
          </CardTitle>
        </div>
        {result.summary ? (
          <p className="text-sm text-muted-foreground">{result.summary}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Based on your responses, here are the streams that best match your interests and strengths.
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid gap-4">
          {top.slice(0, 4).map((rec) => {
            const meta = getStreamMeta(capitalize(rec.stream));
            return (
              <div
                key={rec.stream}
                className={[
                  "rounded-lg border p-4 sm:p-5 bg-card",
                  meta.border,
                ].join(" ")}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={[
                          "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium border",
                          meta.bg,
                          meta.color,
                          meta.border,
                        ].join(" ")}
                        aria-label={`${rec.stream} badge`}
                      >
                        {getStreamLabel(rec.stream)}
                      </span>
                      <span className="text-xs text-muted-foreground">Fit score</span>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <Progress value={clamp(rec.score, 0, 100)} className="h-2 w-48 sm:w-56" />
                      <span className="text-sm font-medium text-foreground tabular-nums">
                        {Math.round(rec.score)}%
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-start gap-2">
                    <MessageCircleQuestionMark className="h-4 w-4 mt-0.5" aria-hidden="true" />
                    <span className="break-words">
                      {rec.rationale || "This recommendation reflects your selected preferences across questions."}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  <p className="text-sm text-foreground break-words">{rec.description}</p>
                  {rec.careers?.length ? (
                    <div className="mt-1">
                      <p className="text-sm font-medium text-foreground">Possible pathways:</p>
                      <ul className="mt-2 grid gap-2 text-sm text-muted-foreground">
                        {rec.careers.slice(0, 6).map((c) => (
                          <li key={c} className="flex items-start gap-2">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary/70" />
                            <span className="break-words">{c}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-lg border border-border bg-secondary p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <ChartSpline className="h-5 w-5 text-primary mt-0.5" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-medium text-foreground">Next steps</p>
              <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                <li className="break-words">
                  Review the top recommendation and explore its subjects for classes 11–12.
                </li>
                <li className="break-words">
                  Compare colleges, boards, and entrance requirements aligned to your chosen stream.
                </li>
                <li className="break-words">
                  Speak with mentors or counselors to validate your choice and plan your roadmap.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between gap-3">
        <Button variant="outline" onClick={onRetake} className="min-w-[120px]">
          Retake Quiz
        </Button>
        <Button
          type="button"
          onClick={() => {
            toast.message("Explore guidance", {
              description: "Use the navigation to explore colleges, exams, and career tracks next.",
            });
          }}
          className="min-w-[160px]"
        >
          Continue
        </Button>
      </CardFooter>
    </>
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function capitalize(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function getStreamLabel(stream: string) {
  const s = capitalize(stream);
  if (s === "Arts") return "Arts & Humanities";
  return s;
}

function normalizeResult(data: any): QuizResult {
  // Expected shape example:
  // {
  //   summary: string,
  //   recommendations: [{ stream: "Science", score: 86, description: "...", careers: ["..."] }]
  // }
  if (data?.recommendations && Array.isArray(data.recommendations)) {
    return {
      summary: data.summary ?? undefined,
      recommendations: data.recommendations.map((r: any) => ({
        stream: r.stream ?? r.name ?? "General",
        score: typeof r.score === "number" ? r.score : Number(r.score ?? 0),
        description: r.description ?? "",
        careers: Array.isArray(r.careers) ? r.careers : [],
        rationale: r.rationale ?? r.reason ?? undefined,
      })),
    };
  }

  // Fallback simple heuristic if API returns minimal info
  const fallback = buildHeuristicResult();
  return fallback;
}

function buildHeuristicResult(): QuizResult {
  // Provide a graceful fallback with balanced recommendations
  return {
    summary:
      "We generated a preliminary recommendation based on your answers. For the best results, please ensure the quiz was submitted with a stable connection.",
    recommendations: [
      {
        stream: "Science",
        score: 75,
        description:
          "Science focuses on analytical thinking, experimentation, and mathematical rigor, preparing you for engineering, medicine, or research.",
        careers: ["Engineer", "Doctor", "Data Scientist", "Researcher", "Biotechnologist", "Pharmacist"],
      },
      {
        stream: "Commerce",
        score: 68,
        description:
          "Commerce emphasizes business, finance, and economics, offering pathways into accounting, management, and entrepreneurship.",
        careers: ["Chartered Accountant", "Investment Analyst", "Business Manager", "Entrepreneur", "Economist"],
      },
      {
        stream: "Arts",
        score: 62,
        description:
          "Arts & Humanities nurtures creativity and critical thinking across literature, social sciences, and communication oriented careers.",
        careers: ["Journalist", "Psychologist", "Designer", "Civil Services", "Teacher", "Content Strategist"],
      },
      {
        stream: "Vocational",
        score: 58,
        description:
          "Vocational tracks build hands-on technical skills for immediate employability in fields like IT support, design, or skilled trades.",
        careers: ["UI/UX Designer", "Technician", "Web Developer", "Animator", "Industrial Designer"],
      },
    ],
  };
}

async function safeParseError(res: Response) {
  try {
    const data = await res.json();
    return data?.error || data?.message;
  } catch {
    return null;
  }
}