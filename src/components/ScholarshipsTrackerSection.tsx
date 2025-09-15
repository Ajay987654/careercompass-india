"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { GraduationCap, SearchCheck, Clock6, SaveAll, BookOpenCheck, Kanban, University, UsersRound } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"

type Scholarship = {
  id: string
  name: string
  amount: number | string
  eligibility: string
  deadline: string | null
  category: string
  source?: string
  link?: string
  documents?: string[]
}

type Status = "planning" | "in_progress" | "submitted" | "awarded" | "rejected"

type TrackedItem = {
  id: string
  status: Status
  reminderDate?: string | null
  checklist: Record<string, boolean>
  savedAt: string
}

type Props = {
  className?: string
}

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: "planning", label: "Planning" },
  { value: "in_progress", label: "In Progress" },
  { value: "submitted", label: "Submitted" },
  { value: "awarded", label: "Awarded" },
  { value: "rejected", label: "Rejected" },
]

const DEFAULT_DOCS = [
  "Aadhaar Card",
  "Income Certificate",
  "Caste/Category Certificate (if applicable)",
  "Previous Marksheet",
  "Bonafide Student Certificate",
  "Bank Passbook",
]

const LOCAL_KEYS = {
  saved: "cc_scholarships_saved_v1",
  tracked: "cc_scholarships_tracked_v1",
}

export default function ScholarshipsTrackerSection({ className }: Props) {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<string | undefined>(undefined)
  const [eligibility, setEligibility] = useState<string | undefined>(undefined)
  const [amountOrder, setAmountOrder] = useState<"asc" | "desc" | undefined>(undefined)
  const [deadlineWindow, setDeadlineWindow] = useState<"7" | "14" | "30" | "all">("all")

  const [scholarships, setScholarships] = useState<Scholarship[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [tracked, setTracked] = useState<Record<string, TrackedItem>>({})

  const abortRef = useRef<AbortController | null>(null)

  // Load persisted state
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const savedRaw = localStorage.getItem(LOCAL_KEYS.saved)
      const trackedRaw = localStorage.getItem(LOCAL_KEYS.tracked)
      if (savedRaw) {
        const parsed: string[] = JSON.parse(savedRaw)
        setSavedIds(new Set(parsed))
      }
      if (trackedRaw) {
        const parsed: Record<string, TrackedItem> = JSON.parse(trackedRaw)
        setTracked(parsed)
      }
    } catch {
      // ignore
    }
  }, [])

  // Persist savedIds
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      localStorage.setItem(LOCAL_KEYS.saved, JSON.stringify(Array.from(savedIds)))
    } catch {
      // ignore
    }
  }, [savedIds])

  // Persist tracked
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      localStorage.setItem(LOCAL_KEYS.tracked, JSON.stringify(tracked))
    } catch {
      // ignore
    }
  }, [tracked])

  // Fetch scholarships
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      if (abortRef.current) abortRef.current.abort()
      const controller = new AbortController()
      abortRef.current = controller

      try {
        const res = await fetch("/api/scholarships", {
          method: "GET",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
        })
        if (!res.ok) {
          throw new Error(`Failed to fetch scholarships (${res.status})`)
        }
        const data: Scholarship[] = await res.json()
        setScholarships(Array.isArray(data) ? sanitizeScholarships(data) : [])
      } catch (e: any) {
        if (e?.name === "AbortError") return
        setError(
          "We couldn’t load scholarships right now. Please check your connection and try again."
        )
      } finally {
        setLoading(false)
      }
    }
    fetchData()

    return () => {
      if (abortRef.current) abortRef.current.abort()
    }
  }, [])

  const categories = useMemo(() => {
    const set = new Set<string>()
    scholarships.forEach((s) => s.category && set.add(s.category))
    return Array.from(set).sort()
  }, [scholarships])

  const eligibilities = useMemo(() => {
    const set = new Set<string>()
    scholarships.forEach((s) => {
      if (s.eligibility) {
        // Take first clause as a quick filter option
        set.add(s.eligibility.split(/[.;|]/)[0].trim())
      }
    })
    return Array.from(set).slice(0, 12).sort()
  }, [scholarships])

  const filtered = useMemo(() => {
    let list = scholarships.slice()

    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.eligibility || "").toLowerCase().includes(q) ||
          (s.category || "").toLowerCase().includes(q) ||
          String(s.amount).toLowerCase().includes(q)
      )
    }
    if (category) list = list.filter((s) => s.category === category)
    if (eligibility) list = list.filter((s) => (s.eligibility || "").includes(eligibility))

    if (deadlineWindow !== "all") {
      const days = parseInt(deadlineWindow, 10)
      const now = new Date()
      list = list.filter((s) => {
        if (!s.deadline) return false
        const d = new Date(s.deadline)
        if (isNaN(d.getTime())) return false
        const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        return diff >= 0 && diff <= days
      })
    }

    if (amountOrder) {
      list.sort((a, b) => {
        const av = parseAmount(a.amount)
        const bv = parseAmount(b.amount)
        return amountOrder === "asc" ? av - bv : bv - av
      })
    }

    return list
  }, [scholarships, query, category, eligibility, deadlineWindow, amountOrder])

  const savedList = useMemo(
    () => filtered.filter((s) => savedIds.has(s.id)),
    [filtered, savedIds]
  )

  const handleSaveToggle = useCallback(
    (s: Scholarship) => {
      setSavedIds((prev) => {
        const next = new Set(prev)
        if (next.has(s.id)) {
          next.delete(s.id)
          toast("Removed from Tracker", {
            description: `${s.name} has been removed from your tracker.`,
          })
        } else {
          next.add(s.id)
          // Initialize tracked entry if absent
          setTracked((tprev) => {
            if (tprev[s.id]) return tprev
            const checklistDocs = (s.documents && s.documents.length > 0 ? s.documents : DEFAULT_DOCS).reduce(
              (acc, d) => {
                acc[d] = false
                return acc
              },
              {} as Record<string, boolean>
            )
            return {
              ...tprev,
              [s.id]: {
                id: s.id,
                status: "planning",
                reminderDate: suggestReminder(s.deadline),
                checklist: checklistDocs,
                savedAt: new Date().toISOString(),
              },
            }
          })
          toast("Saved to Tracker", {
            description: `${s.name} added. You can manage status and documents in My Tracker.`,
          })
        }
        return next
      })
    },
    [setSavedIds]
  )

  const handleStatusChange = useCallback((id: string, status: Status) => {
    setTracked((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || { id, status: "planning", savedAt: new Date().toISOString(), checklist: {} }),
        status,
      },
    }))
  }, [])

  const handleChecklistToggle = useCallback((id: string, doc: string, checked: boolean) => {
    setTracked((prev) => {
      const current = prev[id]
      if (!current) return prev
      return {
        ...prev,
        [id]: {
          ...current,
          checklist: { ...current.checklist, [doc]: checked },
        },
      }
    })
  }, [])

  const handleReminder = useCallback((s: Scholarship) => {
    const nextDate = suggestReminder(s.deadline)
    setTracked((prev) => ({
      ...prev,
      [s.id]: {
        ...(prev[s.id] || {
          id: s.id,
          status: "planning",
          savedAt: new Date().toISOString(),
          checklist: (s.documents && s.documents.length > 0 ? s.documents : DEFAULT_DOCS).reduce(
            (acc, d) => {
              acc[d] = false
              return acc
            },
            {} as Record<string, boolean>
          ),
        }),
        reminderDate: nextDate,
      },
    }))
    toast("Reminder set", {
      description: nextDate
        ? `We’ll remind you on ${formatDate(nextDate)} to check the application.`
        : "Reminder saved.",
    })
  }, [])

  const now = new Date()
  const renderList = (list: Scholarship[]) => {
    if (loading) {
      return (
        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="bg-card">
              <CardHeader>
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="mt-2 h-4 w-1/2" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
              <CardFooter className="flex items-center gap-2">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-28" />
              </CardFooter>
            </Card>
          ))}
        </div>
      )
    }

    if (error) {
      return (
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Unable to load scholarships</CardTitle>
            <CardDescription className="text-muted-foreground">
              {error}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Try again
            </Button>
          </CardFooter>
        </Card>
      )
    }

    if (list.length === 0) {
      return (
        <div className="flex w-full flex-col items-center justify-center rounded-lg border border-border bg-card p-10 text-center">
          <SearchCheck className="mb-3 h-8 w-8 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">
            No scholarships match your filters. Try adjusting your search.
          </p>
        </div>
      )
    }

    return (
      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((s) => {
          const deadlineDate = s.deadline ? safeDate(s.deadline) : null
          const daysLeft =
            deadlineDate ? Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null
          const urgent = typeof daysLeft === "number" && daysLeft >= 0 && daysLeft <= 7
          const isSaved = savedIds.has(s.id)
          const trackInfo = tracked[s.id]
          const status = trackInfo?.status

          return (
            <Card key={s.id} className="flex h-full flex-col overflow-hidden bg-card">
              <CardHeader className="relative">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary">
                    <GraduationCap className="h-5 w-5 text-primary" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <CardTitle className="text-base sm:text-lg leading-snug break-words">
                      {s.name}
                    </CardTitle>
                    <CardDescription className="mt-1 flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                      {s.category && (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <University className="h-3.5 w-3.5" aria-hidden />
                          {s.category}
                        </span>
                      )}
                      {s.source && (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <UsersRound className="h-3.5 w-3.5" aria-hidden />
                          {s.source}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                </div>
                {urgent && (
                  <Badge variant="destructive" className="absolute right-4 top-4">
                    Due in {daysLeft}d
                  </Badge>
                )}
              </CardHeader>

              <CardContent className="min-w-0 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <InfoItem label="Amount" value={formatAmount(s.amount)} />
                  <InfoItem
                    label="Deadline"
                    value={deadlineDate ? formatDate(deadlineDate) : "Not specified"}
                  />
                </div>
                <div className="rounded-md bg-muted/60 p-3">
                  <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">
                    Eligibility
                  </Label>
                  <p className="text-sm text-foreground line-clamp-3">{s.eligibility}</p>
                </div>
              </CardContent>

              <CardFooter className="mt-auto flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant={isSaved ? "secondary" : "default"}
                    onClick={() => handleSaveToggle(s)}
                    aria-label={isSaved ? "Remove from tracker" : "Save to tracker"}
                  >
                    <SaveAll className="mr-2 h-4 w-4" aria-hidden />
                    {isSaved ? "Saved" : "Save"}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => handleReminder(s)}
                    aria-label="Set reminder"
                  >
                    <Clock6 className="mr-2 h-4 w-4" aria-hidden />
                    Reminder
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Select
                    value={status}
                    onValueChange={(v) => handleStatusChange(s.id, v as Status)}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Set status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {s.link ? (
                    <Button asChild variant="outline">
                      <a
                        href={s.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Apply to ${s.name}`}
                      >
                        <BookOpenCheck className="mr-2 h-4 w-4" aria-hidden />
                        Apply
                      </a>
                    </Button>
                  ) : (
                    <Button variant="outline" disabled aria-disabled>
                      <BookOpenCheck className="mr-2 h-4 w-4" aria-hidden />
                      Apply
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>
          )
        })}
      </div>
    )
  }

  const myTrackerCards = useMemo(() => {
    const list = scholarships.filter((s) => savedIds.has(s.id))
    if (list.length === 0) {
      return (
        <div className="flex w-full flex-col items-center justify-center rounded-lg border border-border bg-card p-10 text-center">
          <Kanban className="mb-3 h-8 w-8 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">
            Your tracker is empty. Save scholarships you’re interested in to manage them here.
          </p>
        </div>
      )
    }

    return (
      <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
        {list.map((s) => {
          const t = tracked[s.id]
          const docs = t?.checklist || (s.documents && s.documents.length > 0
            ? s.documents.reduce((acc, d) => ({ ...acc, [d]: false }), {} as Record<string, boolean>)
            : DEFAULT_DOCS.reduce((acc, d) => ({ ...acc, [d]: false }), {} as Record<string, boolean>))
          const completed = Object.values(docs).filter(Boolean).length
          const total = Object.keys(docs).length
          return (
            <Card key={s.id} className="bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-base sm:text-lg leading-snug break-words">
                      {s.name}
                    </CardTitle>
                    <CardDescription className="mt-1 text-muted-foreground">
                      {formatAmount(s.amount)} • Due {s.deadline ? formatDate(s.deadline) : "N/A"}
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleSaveToggle(s)} aria-label="Remove from tracker">
                    Remove
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">
                    Application status
                  </Label>
                  <Select
                    value={t?.status}
                    onValueChange={(v) => handleStatusChange(s.id, v as Status)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Set status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="mt-4 space-y-2">
                    <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">
                      Reminder
                    </Label>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" onClick={() => handleReminder(s)} aria-label="Set reminder">
                        <Clock6 className="mr-2 h-4 w-4" aria-hidden />
                        {t?.reminderDate ? `On ${formatDate(t.reminderDate)}` : "Set reminder"}
                      </Button>
                      {s.link && (
                        <Button asChild variant="secondary">
                          <a href={s.link} target="_blank" rel="noopener noreferrer">
                            <BookOpenCheck className="mr-2 h-4 w-4" aria-hidden />
                            Open application
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="min-w-0">
                  <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">
                    Document checklist
                  </Label>
                  <div className="max-h-48 space-y-2 overflow-auto pr-1">
                    {Object.keys(docs).map((doc) => {
                      const checked = docs[doc]
                      return (
                        <label key={doc} className="flex cursor-pointer select-none items-start gap-2">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) =>
                              handleChecklistToggle(s.id, doc, Boolean(v))
                            }
                            aria-label={doc}
                          />
                          <span className={cn("text-sm", checked ? "text-muted-foreground line-through" : "")}>
                            {doc}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {completed} of {total} documents completed
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="rounded">
                    {s.category || "General"}
                  </Badge>
                  <Badge variant="outline" className="rounded">
                    {s.source || "Source"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => handleReminder(s)}>
                    <Clock6 className="mr-2 h-4 w-4" aria-hidden />
                    Nudge me
                  </Button>
                  {s.link ? (
                    <Button asChild>
                      <a href={s.link} target="_blank" rel="noopener noreferrer">
                        Apply now
                      </a>
                    </Button>
                  ) : (
                    <Button disabled aria-disabled>
                      Apply
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>
          )
        })}
      </div>
    )
  }, [scholarships, savedIds, tracked, handleChecklistToggle, handleReminder, handleSaveToggle, handleStatusChange])

  return (
    <section
      className={cn(
        "w-full rounded-xl border border-border bg-card/90 p-4 sm:p-6 shadow-sm backdrop-blur",
        className
      )}
      aria-labelledby="scholarships-heading"
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="scholarships-heading" className="text-xl sm:text-2xl font-heading font-semibold tracking-tight">
            Scholarships & Tracker
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Discover scholarships and manage your applications in one place.
          </p>
        </div>
        <span className="hidden sm:inline-flex h-10 w-10 items-center justify-center rounded-md bg-secondary">
          <SearchCheck className="h-5 w-5 text-primary" aria-hidden />
        </span>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-12">
        <div className="md:col-span-4">
          <Label htmlFor="scholarship-search" className="sr-only">
            Search scholarships
          </Label>
          <div className="relative">
            <Input
              id="scholarship-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, amount, eligibility..."
              className="pr-10 bg-card"
            />
            <SearchCheck className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          </div>
        </div>

        <div className="md:col-span-3">
          <Label className="sr-only">Category</Label>
          <Select value={category} onValueChange={(v) => setCategory(v)}>
            <SelectTrigger className="bg-card">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-3">
          <Label className="sr-only">Eligibility</Label>
          <Select value={eligibility} onValueChange={(v) => setEligibility(v)}>
            <SelectTrigger className="bg-card">
              <SelectValue placeholder="Eligibility" />
            </SelectTrigger>
            <SelectContent>
              {eligibilities.map((e) => (
                <SelectItem key={e} value={e}>
                  {e}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-2 grid grid-cols-2 gap-3">
          <div>
            <Label className="sr-only">Amount</Label>
            <Select value={amountOrder} onValueChange={(v) => setAmountOrder(v as "asc" | "desc")}>
              <SelectTrigger className="bg-card">
                <SelectValue placeholder="Amount" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Amount: Low → High</SelectItem>
                <SelectItem value="desc">Amount: High → Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="sr-only">Deadline</Label>
            <Select value={deadlineWindow} onValueChange={(v) => setDeadlineWindow(v as any)}>
              <SelectTrigger className="bg-card">
                <SelectValue placeholder="Deadline" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All deadlines</SelectItem>
                <SelectItem value="30">Due in 30d</SelectItem>
                <SelectItem value="14">Due in 14d</SelectItem>
                <SelectItem value="7">Due in 7d</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Tabs defaultValue="discover" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="discover" className="gap-2">
            <GraduationCap className="h-4 w-4" aria-hidden />
            Discover
          </TabsTrigger>
          <TabsTrigger value="tracker" className="gap-2">
            <Kanban className="h-4 w-4" aria-hidden />
            My Tracker ({savedIds.size})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="discover" className="focus-visible:outline-none">
          {renderList(filtered)}
        </TabsContent>

        <TabsContent value="tracker" className="focus-visible:outline-none">
          {myTrackerCards}
        </TabsContent>
      </Tabs>
    </section>
  )
}

/* ---------- Utils & Subcomponents ---------- */

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="truncate text-sm text-foreground" title={value}>
        {value}
      </p>
    </div>
  )
}

function sanitizeScholarships(list: Scholarship[]): Scholarship[] {
  return list
    .filter((s) => s && s.id && s.name)
    .map((s) => ({
      ...s,
      amount: s.amount ?? 0,
      eligibility: s.eligibility || "Eligibility details not provided",
      category: s.category || "General",
      link: s.link || undefined,
      source: s.source || undefined,
      deadline: s.deadline || null,
      documents: Array.isArray(s.documents) ? s.documents : undefined,
    }))
}

function parseAmount(val: number | string): number {
  if (typeof val === "number") return val
  // Extract digits; handle amounts like "₹50,000" or "50k"
  const clean = val.replace(/[,₹\s]/g, "").toLowerCase()
  if (clean.endsWith("k")) {
    const n = parseFloat(clean.slice(0, -1))
    return isNaN(n) ? 0 : n * 1000
  }
  const n = parseFloat(clean)
  return isNaN(n) ? 0 : n
}

function formatAmount(val: number | string): string {
  const n = parseAmount(val)
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)} Cr`
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)} L`
  return `₹${n.toLocaleString("en-IN")}`
}

function safeDate(d: string | Date): Date {
  const date = d instanceof Date ? d : new Date(d)
  return date
}

function formatDate(d: string | Date): string {
  const date = safeDate(d)
  if (isNaN(date.getTime())) return "Invalid date"
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

function suggestReminder(deadline: string | null | undefined): string | null {
  if (!deadline) return null
  const d = new Date(deadline)
  if (isNaN(d.getTime())) return null
  const reminder = new Date(d)
  reminder.setDate(reminder.getDate() - 5)
  const now = new Date()
  if (reminder < now) {
    // If reminder in past, set for tomorrow 9am
    const t = new Date(now)
    t.setDate(t.getDate() + 1)
    t.setHours(9, 0, 0, 0)
    return t.toISOString()
  }
  return reminder.toISOString()
}