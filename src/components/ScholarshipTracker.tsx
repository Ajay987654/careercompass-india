"use client"

import * as React from "react"
import { useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import {
  GraduationCap,
  ListFilter,
  CalendarDays,
  Clock,
  ListChecks,
  FileSearch,
  MailSearch,
  BookMarked,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"

type ScholarshipType =
  | "NSP"
  | "Merit"
  | "Means"
  | "Merit-cum-Means"
  | "Private"
  | "State"

type ApplicationStatus =
  | "not_started"
  | "in_progress"
  | "submitted"
  | "awarded"
  | "rejected"

export interface Scholarship {
  id: string
  title: string
  provider: string
  type: ScholarshipType
  eligibility: string[] // e.g., ["Undergraduate", "SC/ST", "Income < 8L", "Female"]
  awardAmount: string // e.g., "₹50,000/year"
  deadline: string // ISO date string
  applyUrl: string // official portal link
  source?: "NSP" | "Other"
  recommendedScore?: number // for pre-ranked recommendations
  documentsRequired?: string[] // names of docs
  location?: string // state/region if applicable
}

export interface UserProfile {
  educationLevel?: string // "Class 12", "Undergraduate", "Postgraduate"
  category?: string // "General", "SC", "ST", "OBC", "EWS", "Minority"
  gender?: string // "Male", "Female", "Other"
  familyIncome?: number // annual in INR
  state?: string
  interests?: string[]
}

interface ScholarshipTrackerProps {
  className?: string
  scholarships: Scholarship[]
  profile?: UserProfile
  trackedIds?: string[]
  onToggleTrack?: (scholarshipId: string, tracked: boolean) => void
  onUploadDocument?: (scholarshipId: string, file: File) => Promise<void> | void
  onStatusChange?: (scholarshipId: string, status: ApplicationStatus) => void
  onSetReminder?: (scholarshipId: string) => void
}

type FilterState = {
  q: string
  type: ScholarshipType | "All"
  deadline: "All" | "This Month" | "Next 30 Days" | "Closing Soon"
  eligibility: "All" | "Undergraduate" | "Postgraduate" | "SC/ST" | "OBC" | "EWS" | "Female"
  onlyTracked: boolean
}

const defaultFilters: FilterState = {
  q: "",
  type: "All",
  deadline: "All",
  eligibility: "All",
  onlyTracked: false,
}

function daysUntil(dateISO: string) {
  const now = new Date()
  const target = new Date(dateISO)
  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return diff
}

function isWithin(dateISO: string, windowDays: number) {
  const d = daysUntil(dateISO)
  return d >= 0 && d <= windowDays
}

function monthSame(dateISO: string) {
  const now = new Date()
  const d = new Date(dateISO)
  return now.getFullYear() === d.getFullYear() && now.getMonth() === d.getMonth()
}

function getDeadlineBadge(deadlineISO: string) {
  const d = daysUntil(deadlineISO)
  if (d < 0) return { label: "Closed", variant: "destructive" as const }
  if (d <= 3) return { label: `Closing in ${d}d`, variant: "destructive" as const }
  if (d <= 10) return { label: `Due in ${d}d`, variant: "secondary" as const }
  return { label: `Due in ${d}d`, variant: "outline" as const }
}

function relevanceScore(s: Scholarship, profile?: UserProfile) {
  if (!profile) return 0
  let score = 0
  const el = (profile.educationLevel || "").toLowerCase()
  s.eligibility.forEach((e) => {
    const val = e.toLowerCase()
    if (el && val.includes(el)) score += 2
    if (profile.category && val.includes(profile.category.toLowerCase())) score += 2
    if (profile.gender && val.includes(profile.gender.toLowerCase())) score += 1
    if (profile.state && s.location && s.location.toLowerCase() === profile.state.toLowerCase()) score += 2
    if (typeof profile.familyIncome === "number") {
      // naive income matching
      if (val.includes("<") || val.includes("below")) score += 1
    }
  })
  if (s.recommendedScore) score += s.recommendedScore
  return score
}

export default function ScholarshipTracker({
  className,
  scholarships,
  profile,
  trackedIds = [],
  onToggleTrack,
  onUploadDocument,
  onStatusChange,
  onSetReminder,
}: ScholarshipTrackerProps) {
  const [filters, setFilters] = useState<FilterState>(defaultFilters)
  const [tab, setTab] = useState<"all" | "recommended" | "tracked">("all")
  const [statusMap, setStatusMap] = useState<Record<string, ApplicationStatus>>({})
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({})

  const filtered = useMemo(() => {
    let list = scholarships.slice()

    if (filters.q.trim()) {
      const q = filters.q.toLowerCase()
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.provider.toLowerCase().includes(q) ||
          s.eligibility.some((e) => e.toLowerCase().includes(q))
      )
    }

    if (filters.type !== "All") {
      list = list.filter((s) => s.type === filters.type)
    }

    if (filters.eligibility !== "All") {
      const key = filters.eligibility.toLowerCase()
      list = list.filter((s) => s.eligibility.some((e) => e.toLowerCase().includes(key)))
    }

    switch (filters.deadline) {
      case "This Month":
        list = list.filter((s) => monthSame(s.deadline))
        break
      case "Next 30 Days":
        list = list.filter((s) => isWithin(s.deadline, 30))
        break
      case "Closing Soon":
        list = list.filter((s) => isWithin(s.deadline, 7))
        break
    }

    if (filters.onlyTracked) {
      list = list.filter((s) => trackedIds.includes(s.id))
    }

    // Tab scoping
    if (tab === "recommended") {
      list = list
        .map((s) => ({ s, score: relevanceScore(s, profile) }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((x) => x.s)
    } else if (tab === "tracked") {
      list = list.filter((s) => trackedIds.includes(s.id))
    }

    // Sort: closing sooner first
    list.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    return list
  }, [scholarships, filters, trackedIds, tab, profile])

  function handleTrackToggle(id: string) {
    const willTrack = !trackedIds.includes(id)
    onToggleTrack?.(id, willTrack)
    toast.success(willTrack ? "Added to your tracker" : "Removed from tracker")
  }

  function handleUpload(id: string, file?: File) {
    if (!file) return
    const res = onUploadDocument?.(id, file)
    Promise.resolve(res)
      .then(() => toast.success("Document uploaded"))
      .catch(() => toast.error("Upload failed"))
  }

  function triggerUpload(id: string) {
    fileInputs.current[id]?.click()
  }

  function updateStatus(id: string, next: ApplicationStatus) {
    setStatusMap((m) => ({ ...m, [id]: next }))
    onStatusChange?.(id, next)
    toast.message("Application status updated")
  }

  function remind(id: string, title: string) {
    onSetReminder?.(id)
    toast.success(`Reminder set for "${title}"`)
  }

  return (
    <section
      className={cn(
        "w-full bg-card rounded-2xl border border-border shadow-sm",
        "p-4 sm:p-6 md:p-8",
        className
      )}
      aria-label="Scholarship Tracker"
    >
      <div className="flex flex-col gap-4">
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
              <GraduationCap className="h-6 w-6" aria-hidden="true" />
              Scholarships
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Discover, filter, and track scholarships. Get recommendations tailored to your profile.
            </p>
          </div>
          <Badge className="shrink-0" variant="outline">
            <BookMarked className="h-4 w-4 mr-1.5" />
            {trackedIds.length} tracked
          </Badge>
        </header>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="w-full">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-end gap-3 md:gap-4 bg-secondary rounded-xl p-3 sm:p-4 border border-border">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:flex-1 min-w-0">
                <div className="min-w-0">
                  <Label htmlFor="search" className="sr-only">
                    Search scholarships
                  </Label>
                  <div className="relative">
                    <MailSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      value={filters.q}
                      onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                      placeholder="Search scholarships, provider, or eligibility"
                      className="pl-9 bg-card"
                      aria-label="Search scholarships"
                    />
                  </div>
                </div>

                <Select
                  onValueChange={(v) => setFilters((f) => ({ ...f, type: v as ScholarshipType | "All" }))}
                >
                  <SelectTrigger className="bg-card">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All types</SelectItem>
                    <SelectItem value="NSP">NSP</SelectItem>
                    <SelectItem value="Merit">Merit</SelectItem>
                    <SelectItem value="Means">Means</SelectItem>
                    <SelectItem value="Merit-cum-Means">Merit-cum-Means</SelectItem>
                    <SelectItem value="Private">Private</SelectItem>
                    <SelectItem value="State">State</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  onValueChange={(v) =>
                    setFilters((f) => ({ ...f, deadline: v as FilterState["deadline"] }))
                  }
                >
                  <SelectTrigger className="bg-card">
                    <SelectValue placeholder="Deadline" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    <SelectItem value="This Month">This Month</SelectItem>
                    <SelectItem value="Next 30 Days">Next 30 Days</SelectItem>
                    <SelectItem value="Closing Soon">Closing Soon</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  onValueChange={(v) =>
                    setFilters((f) => ({ ...f, eligibility: v as FilterState["eligibility"] }))
                  }
                >
                  <SelectTrigger className="bg-card">
                    <SelectValue placeholder="Eligibility" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    <SelectItem value="Undergraduate">Undergraduate</SelectItem>
                    <SelectItem value="Postgraduate">Postgraduate</SelectItem>
                    <SelectItem value="SC/ST">SC/ST</SelectItem>
                    <SelectItem value="OBC">OBC</SelectItem>
                    <SelectItem value="EWS">EWS</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="onlyTracked"
                    checked={filters.onlyTracked}
                    onCheckedChange={(val) =>
                      setFilters((f) => ({ ...f, onlyTracked: Boolean(val) }))
                    }
                    aria-label="Show only tracked scholarships"
                  />
                  <Label htmlFor="onlyTracked" className="text-sm text-muted-foreground">
                    Only tracked
                  </Label>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => setFilters(defaultFilters)}
                >
                  <ListFilter className="h-4 w-4" />
                  Reset
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <TabsList className="bg-secondary">
                <TabsTrigger value="all" className="text-sm">All</TabsTrigger>
                <TabsTrigger value="recommended" className="text-sm">Recommended</TabsTrigger>
                <TabsTrigger value="tracked" className="text-sm">Tracked</TabsTrigger>
              </TabsList>
              <div className="text-xs text-muted-foreground">
                {filtered.length} result{filtered.length === 1 ? "" : "s"}
              </div>
            </div>
          </div>

          <TabsContent value="all" className="mt-4">
            <ScholarshipGrid
              items={filtered}
              statusMap={statusMap}
              trackedIds={trackedIds}
              onTrackToggle={handleTrackToggle}
              onUpload={handleUpload}
              onTriggerUpload={triggerUpload}
              fileInputs={fileInputs}
              onStatusChange={updateStatus}
              onRemind={remind}
            />
          </TabsContent>

          <TabsContent value="recommended" className="mt-4">
            <ScholarshipGrid
              items={filtered}
              statusMap={statusMap}
              trackedIds={trackedIds}
              onTrackToggle={handleTrackToggle}
              onUpload={handleUpload}
              onTriggerUpload={triggerUpload}
              fileInputs={fileInputs}
              onStatusChange={updateStatus}
              onRemind={remind}
              highlightRecommendation
            />
          </TabsContent>

          <TabsContent value="tracked" className="mt-4">
            <ScholarshipGrid
              items={filtered}
              statusMap={statusMap}
              trackedIds={trackedIds}
              onTrackToggle={handleTrackToggle}
              onUpload={handleUpload}
              onTriggerUpload={triggerUpload}
              fileInputs={fileInputs}
              onStatusChange={updateStatus}
              onRemind={remind}
            />
          </TabsContent>
        </Tabs>
      </div>
    </section>
  )
}

function ScholarshipGrid(props: {
  items: Scholarship[]
  statusMap: Record<string, ApplicationStatus>
  trackedIds: string[]
  onTrackToggle: (id: string) => void
  onUpload: (id: string, f?: File) => void
  onTriggerUpload: (id: string) => void
  fileInputs: React.MutableRefObject<Record<string, HTMLInputElement | null>>
  onStatusChange: (id: string, s: ApplicationStatus) => void
  onRemind: (id: string, title: string) => void
  highlightRecommendation?: boolean
}) {
  const {
    items,
    statusMap,
    trackedIds,
    onTrackToggle,
    onUpload,
    onTriggerUpload,
    fileInputs,
    onStatusChange,
    onRemind,
    highlightRecommendation,
  } = props

  if (items.length === 0) {
    return (
      <Card className="bg-secondary border-dashed">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <FileSearch className="h-5 w-5" /> No scholarships found
          </CardTitle>
          <CardDescription>Try adjusting filters or search keywords.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {items.map((s) => {
        const isTracked = trackedIds.includes(s.id)
        const badge = getDeadlineBadge(s.deadline)
        const status = statusMap[s.id] ?? "not_started"
        return (
          <Card
            key={s.id}
            className={cn(
              "flex flex-col bg-card border-border hover:shadow-md transition-shadow",
              highlightRecommendation ? "outline outline-2 -outline-offset-2 outline-accent" : ""
            )}
          >
            <CardHeader className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base sm:text-lg leading-snug min-w-0">
                  <span className="block truncate">{s.title}</span>
                </CardTitle>
                <Badge variant={badge.variant as any} className="shrink-0">
                  <Clock className="h-3.5 w-3.5 mr-1" />
                  {badge.label}
                </Badge>
              </div>
              <CardDescription className="flex items-center justify-between gap-2">
                <span className="truncate">
                  by {s.provider} {s.source ? `• ${s.source}` : ""}
                </span>
                <Badge variant="outline" className="shrink-0">
                  {s.type}
                </Badge>
              </CardDescription>
            </CardHeader>

            <CardContent className="flex-1 space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Deadline:</span>
                <span className="font-medium">
                  {new Date(s.deadline).toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <ListChecks className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Award:</span>
                <span className="font-medium">{s.awardAmount}</span>
              </div>

              <Separator />

              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Eligibility</div>
                <div className="flex flex-wrap gap-1.5">
                  {s.eligibility.slice(0, 4).map((e) => (
                    <Badge key={e} variant="secondary" className="whitespace-nowrap">
                      {e}
                    </Badge>
                  ))}
                  {s.eligibility.length > 4 && (
                    <Badge variant="outline">+{s.eligibility.length - 4} more</Badge>
                  )}
                </div>
              </div>

              {s.documentsRequired && s.documentsRequired.length > 0 && (
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Documents</div>
                  <div className="flex flex-wrap gap-1.5">
                    {s.documentsRequired.slice(0, 3).map((doc) => (
                      <Badge key={doc} variant="outline" className="whitespace-nowrap">
                        {doc}
                      </Badge>
                    ))}
                    {s.documentsRequired.length > 3 && (
                      <Badge variant="outline">+{s.documentsRequired.length - 3}</Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex flex-col gap-3">
              <div className="flex items-center gap-2 w-full">
                <Select
                  onValueChange={(v) => onStatusChange(s.id, v as ApplicationStatus)}
                  value={status}
                >
                  <SelectTrigger className="bg-secondary/60">
                    <SelectValue placeholder="Set status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started">Not started</SelectItem>
                    <SelectItem value="in_progress">In progress</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="awarded">Awarded</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant={isTracked ? "secondary" : "default"}
                  className="whitespace-nowrap"
                  onClick={() => onTrackToggle(s.id)}
                  aria-pressed={isTracked}
                >
                  <BookMarked className="h-4 w-4 mr-2" />
                  {isTracked ? "Tracked" : "Track"}
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full">
                <Button asChild variant="outline" className="gap-2">
                  <a
                    href={s.applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Apply on official portal for ${s.title}`}
                  >
                    <GraduationCap className="h-4 w-4" />
                    Apply
                  </a>
                </Button>

                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => onRemind(s.id, s.title)}
                >
                  <Clock className="h-4 w-4" />
                  Remind me
                </Button>

                <input
                  ref={(el) => (fileInputs.current[s.id] = el)}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.currentTarget.files?.[0]
                    onUpload(s.id, file)
                    e.currentTarget.value = ""
                  }}
                  aria-hidden="true"
                />
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => onTriggerUpload(s.id)}
                >
                  <ListChecks className="h-4 w-4" />
                  Upload doc
                </Button>
              </div>

              <div className="w-full text-xs text-muted-foreground flex items-center gap-2">
                <FileSearch className="h-3.5 w-3.5" />
                Tip: Review guidelines on the official portal before submitting.
              </div>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}