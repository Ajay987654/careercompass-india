"use client"

import * as React from "react"
import { GraduationCap, Briefcase, Bookmark, BookOpenCheck, ArrowDownNarrowWide, ChartSpline, SquareMenu } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

type CourseLink = {
  name: string
  provider: string
  href: string
}

export type CareerRecommendation = {
  id: string
  title: string
  stream: string
  summary: string
  fitScore: number // 0-100
  explanation: string
  skills: string[]
  courses: CourseLink[]
  paths: string[]
}

type SortKey = "fit-desc" | "name-asc" | "stream-asc"

export interface CareerRecommendationsProps {
  className?: string
  items?: CareerRecommendation[]
  initialBookmarkedIds?: string[]
  defaultExpandedIds?: string[]
  onBookmarkChange?: (bookmarkedIds: string[]) => void
}

const defaultItems: CareerRecommendation[] = [
  {
    id: "eng-ai",
    title: "Computer Science & AI",
    stream: "Engineering",
    summary:
      "Blend of software engineering and machine learning, ideal for analytical thinkers who enjoy building data-driven systems.",
    fitScore: 92,
    explanation:
      "Your quiz shows high logical reasoning and quantitative aptitude, strong persistence, and curiosity—traits aligned with AI/ML research and engineering roles. You also indicated enjoyment of problem-solving and building tools, a strong fit for this stream.",
    skills: ["Python", "Data Structures", "Linear Algebra", "ML Fundamentals", "Git", "Problem Solving"],
    courses: [
      { name: "Machine Learning", provider: "Coursera (Andrew Ng)", href: "https://www.coursera.org/learn/machine-learning" },
      { name: "NPTEL: Data Structures & Algorithms", provider: "NPTEL", href: "https://nptel.ac.in/courses/106/102/106102064" },
      { name: "Deep Learning Specialization", provider: "Coursera", href: "https://www.coursera.org/specializations/deep-learning" },
    ],
    paths: ["ML Engineer", "Data Scientist", "Research Engineer", "Product Engineer (AI)"],
  },
  {
    id: "design-ux",
    title: "User Experience (UX) Design",
    stream: "Design",
    summary:
      "Human-centered design focusing on research, interaction design, and visual communication to craft intuitive digital products.",
    fitScore: 84,
    explanation:
      "Your empathy scores and creativity indicators were high. You also prefer collaborative environments and iterative work, aligning with UX research and design practices.",
    skills: ["User Research", "Wireframing", "Figma", "Information Architecture", "Accessibility", "Prototyping"],
    courses: [
      { name: "Google UX Design Certificate", provider: "Coursera", href: "https://www.coursera.org/professional-certificates/google-ux-design" },
      { name: "Human-Computer Interaction", provider: "Coursera", href: "https://www.coursera.org/learn/human-computer-interaction" },
    ],
    paths: ["UX Designer", "Product Designer", "UX Researcher", "Interaction Designer"],
  },
  {
    id: "commerce-fin",
    title: "Finance & Analytics",
    stream: "Commerce",
    summary:
      "Quantitative finance with emphasis on markets, financial modeling, and business analytics for data-driven decision making.",
    fitScore: 76,
    explanation:
      "You show strong numerical reasoning and risk evaluation tendencies. Interest in business case studies indicates a good match for finance and analytics.",
    skills: ["Excel Modeling", "Statistics", "SQL", "Financial Accounting", "Power BI", "Presentation"],
    courses: [
      { name: "Financial Markets", provider: "Coursera (Yale)", href: "https://www.coursera.org/learn/financial-markets-global" },
      { name: "Google Data Analytics Certificate", provider: "Coursera", href: "https://www.coursera.org/professional-certificates/google-data-analytics" },
    ],
    paths: ["Business Analyst", "Financial Analyst", "Risk Analyst", "Equity Research"],
  },
]

const allStreamsFromItems = (items: CareerRecommendation[]) => {
  const set = new Set(items.map((i) => i.stream))
  return Array.from(set)
}

export default function CareerRecommendations({
  className,
  items = defaultItems,
  initialBookmarkedIds = [],
  defaultExpandedIds = [],
  onBookmarkChange,
}: CareerRecommendationsProps) {
  const [query, setQuery] = React.useState("")
  const [sort, setSort] = React.useState<SortKey>("fit-desc")
  const [selectedStreams, setSelectedStreams] = React.useState<string[]>([])
  const [minFit, setMinFit] = React.useState<number | null>(null)
  const [bookmarked, setBookmarked] = React.useState<Set<string>>(new Set(initialBookmarkedIds))
  const [compareSet, setCompareSet] = React.useState<Set<string>>(new Set())
  const [showBookmarksOnly, setShowBookmarksOnly] = React.useState(false)
  const streams = React.useMemo(() => allStreamsFromItems(items), [items])

  const toggleBookmark = (id: string, title: string) => {
    setBookmarked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        toast("Removed bookmark", { description: `${title} removed from saved` })
      } else {
        next.add(id)
        toast("Saved", { description: `${title} added to bookmarks` })
      }
      onBookmarkChange?.(Array.from(next))
      return next
    })
  }

  const toggleCompare = (id: string, title: string) => {
    setCompareSet((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        if (next.size >= 3) {
          toast.error("You can compare up to 3 options")
          return prev
        }
        next.add(id)
        toast("Added to comparison", { description: title })
      }
      return next
    })
  }

  const clearFilters = () => {
    setQuery("")
    setSelectedStreams([])
    setMinFit(null)
    setShowBookmarksOnly(false)
    setSort("fit-desc")
  }

  const filtered = React.useMemo(() => {
    let data = [...items]
    if (query.trim()) {
      const q = query.toLowerCase()
      data = data.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.stream.toLowerCase().includes(q) ||
          i.summary.toLowerCase().includes(q) ||
          i.skills.some((s) => s.toLowerCase().includes(q)),
      )
    }
    if (selectedStreams.length) {
      data = data.filter((i) => selectedStreams.includes(i.stream))
    }
    if (minFit !== null) {
      data = data.filter((i) => i.fitScore >= minFit)
    }
    if (showBookmarksOnly) {
      data = data.filter((i) => bookmarked.has(i.id))
    }
    switch (sort) {
      case "fit-desc":
        data.sort((a, b) => b.fitScore - a.fitScore)
        break
      case "name-asc":
        data.sort((a, b) => a.title.localeCompare(b.title))
        break
      case "stream-asc":
        data.sort((a, b) => a.stream.localeCompare(b.stream) || b.fitScore - a.fitScore)
        break
    }
    return data
  }, [items, query, selectedStreams, minFit, showBookmarksOnly, sort, bookmarked])

  const compareItems = filtered.filter((i) => compareSet.has(i.id)).slice(0, 3)

  return (
    <section className={cn("w-full bg-background", className)} aria-label="Career recommendations">
      <div className="w-full max-w-full">
        <header className="mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight">Your Personalized Career Recommendations</h2>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                Based on your aptitude quiz results. Explore streams, compare options, and take your next steps.
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 rounded-lg bg-card border border-border p-3">
              <ChartSpline className="size-5 text-foreground" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Top match</p>
                <p className="text-sm font-medium">{items.sort((a, b) => b.fitScore - a.fitScore)[0]?.title ?? "—"}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="rounded-xl border border-border bg-card p-3 sm:p-4 mb-5">
          <div className="flex flex-col md:flex-row md:items-end gap-3">
            <div className="flex-1 min-w-0">
              <Label htmlFor="search" className="sr-only">
                Search recommendations
              </Label>
              <div className="relative">
                <Input
                  id="search"
                  placeholder="Search by title, stream, or skill..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pr-24 bg-secondary/50"
                />
                <div className="absolute right-1 top-1/2 -translate-y-1/2 text-xs text-muted-foreground px-2 py-1 rounded-md bg-secondary">
                  {filtered.length} results
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:flex items-center gap-3">
              <div className="min-w-[160px]">
                <Label className="text-xs text-muted-foreground">Sort</Label>
                <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                  <SelectTrigger className="bg-secondary/50">
                    <ArrowDownNarrowWide className="mr-2 size-4" aria-hidden="true" />
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fit-desc">Best match</SelectItem>
                    <SelectItem value="name-asc">Name A–Z</SelectItem>
                    <SelectItem value="stream-asc">Stream A–Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="min-w-[160px]">
                <Label className="text-xs text-muted-foreground">Minimum fit</Label>
                <Select
                  value={minFit !== null ? String(minFit) : undefined}
                  onValueChange={(v) => setMinFit(Number(v))}
                >
                  <SelectTrigger className="bg-secondary/50">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Any</SelectItem>
                    <SelectItem value="60">60%</SelectItem>
                    <SelectItem value="70">70%</SelectItem>
                    <SelectItem value="80">80%</SelectItem>
                    <SelectItem value="90">90%</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="min-w-[180px]">
                <Label className="text-xs text-muted-foreground">Streams</Label>
                <div className="flex flex-wrap gap-2 rounded-md border border-border bg-secondary/30 px-2 py-2">
                  {streams.map((s) => {
                    const active = selectedStreams.includes(s)
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() =>
                          setSelectedStreams((prev) =>
                            prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
                          )
                        }
                        className={cn(
                          "text-xs px-2.5 py-1 rounded-full border transition-colors",
                          active
                            ? "bg-foreground text-primary-foreground border-foreground"
                            : "bg-card text-foreground border-border hover:bg-secondary",
                        )}
                        aria-pressed={active}
                        aria-label={`Filter stream ${s}`}
                      >
                        {s}
                      </button>
                    )
                  })}
                  {streams.length === 0 && (
                    <span className="text-xs text-muted-foreground">No streams</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 border border-border rounded-md px-3 py-2 bg-secondary/30">
                <Switch
                  id="bookmarks-only"
                  checked={showBookmarksOnly}
                  onCheckedChange={setShowBookmarksOnly}
                />
                <Label htmlFor="bookmarks-only" className="text-sm">
                  Bookmarked only
                </Label>
              </div>

              <Button variant="ghost" onClick={clearFilters} className="justify-self-start">
                Reset
              </Button>
            </div>
          </div>
        </div>

        <ul className="space-y-4">
          {filtered.map((rec) => {
            const isBookmarked = bookmarked.has(rec.id)
            const inCompare = compareSet.has(rec.id)
            const expanded = defaultExpandedIds.includes(rec.id)
            return (
              <li key={rec.id} className="w-full">
                <Card className="bg-card border-border">
                  <CardHeader className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                        {rec.stream === "Engineering" ? (
                          <GraduationCap className="size-5" aria-hidden="true" />
                        ) : rec.stream === "Commerce" ? (
                          <Briefcase className="size-5" aria-hidden="true" />
                        ) : (
                          <BookOpenCheck className="size-5" aria-hidden="true" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-base sm:text-lg md:text-xl truncate">{rec.title}</CardTitle>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <Badge variant="secondary" className="rounded-full">{rec.stream}</Badge>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Fit</span>
                            <div className="w-28">
                              <Progress value={rec.fitScore} className="h-2" aria-label={`${rec.fitScore}% fit`} />
                            </div>
                            <span className="text-xs font-medium">{rec.fitScore}%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1"></div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`cmp-${rec.id}`}
                          checked={inCompare}
                          onCheckedChange={() => toggleCompare(rec.id, rec.title)}
                        />
                        <Label htmlFor={`cmp-${rec.id}`} className="text-sm">
                          Compare
                        </Label>
                      </div>
                      <Button
                        variant={isBookmarked ? "default" : "outline"}
                        size="sm"
                        className={cn(
                          "gap-2",
                          isBookmarked ? "bg-foreground text-primary-foreground" : "bg-card",
                        )}
                        onClick={() => toggleBookmark(rec.id, rec.title)}
                        aria-pressed={isBookmarked}
                        aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
                      >
                        <Bookmark className="size-4" />
                        <span className="hidden sm:inline">{isBookmarked ? "Saved" : "Save"}</span>
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <p className="text-sm sm:text-base text-muted-foreground break-words">
                      {rec.summary}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {rec.skills.slice(0, 6).map((skill) => (
                        <Badge key={skill} variant="outline" className="rounded-full">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                    <Accordion type="single" collapsible defaultValue={expanded ? rec.id : undefined}>
                      <AccordionItem value={rec.id} className="border-none">
                        <AccordionTrigger className="rounded-md px-3 py-2 bg-secondary/40 hover:bg-secondary text-sm">
                          View detailed guidance
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="pt-3 space-y-4">
                            <div>
                              <h4 className="text-sm font-semibold">Why this fits you</h4>
                              <p className="text-sm text-muted-foreground mt-1">{rec.explanation}</p>
                            </div>

                            <Separator />

                            <div className="grid sm:grid-cols-2 gap-4">
                              <div>
                                <h4 className="text-sm font-semibold">Recommended courses</h4>
                                <ul className="mt-2 space-y-2">
                                  {rec.courses.map((c) => (
                                    <li key={c.href} className="min-w-0">
                                      <a
                                        href={c.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm underline underline-offset-4 hover:opacity-90 break-words"
                                      >
                                        {c.name} — {c.provider}
                                      </a>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold">Potential career paths</h4>
                                <ul className="mt-2 grid grid-cols-1 gap-2">
                                  {rec.paths.map((p) => (
                                    <li key={p} className="flex items-center gap-2">
                                      <span className="size-1.5 rounded-full bg-foreground" aria-hidden="true" />
                                      <span className="text-sm">{p}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>

                            <Separator />

                            <div className="grid sm:grid-cols-2 gap-4">
                              <div>
                                <h4 className="text-sm font-semibold">Skill development plan</h4>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Focus on these skills over the next 12 weeks:
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {rec.skills.map((s) => (
                                    <Badge key={s} variant="secondary" className="rounded-full">
                                      {s}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold">Next steps</h4>
                                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="justify-start"
                                    asChild
                                  >
                                    <a
                                      href="https://www.aicte-india.org/bureaus/scheme/internship"
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <Briefcase className="mr-2 size-4" />
                                      Find internships
                                    </a>
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="justify-start"
                                    asChild
                                  >
                                    <a
                                      href="https://www.nptel.ac.in/"
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <BookOpenCheck className="mr-2 size-4" />
                                      Learn on NPTEL
                                    </a>
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="justify-start"
                                    asChild
                                  >
                                    <a
                                      href="https://www.coursera.org/browse"
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <GraduationCap className="mr-2 size-4" />
                                      Explore courses
                                    </a>
                                  </Button>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    className="justify-start"
                                    onClick={() =>
                                      toast("Application guide", {
                                        description:
                                          "View timelines, exam requirements, and documents checklist.",
                                      })
                                    }
                                  >
                                    <ArrowDownNarrowWide className="mr-2 size-4 rotate-90" />
                                    Application process
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>

                  <CardFooter className="flex items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground break-words">
                      Tip: Bookmark and compare options to decide with confidence.
                    </p>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" disabled={compareSet.size === 0}>
                          <SquareMenu className="mr-2 size-4" />
                          Compare ({compareSet.size})
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl">
                        <DialogHeader>
                          <DialogTitle>Compare options</DialogTitle>
                        </DialogHeader>
                        {compareItems.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No items selected for comparison.</p>
                        ) : (
                          <div className="w-full overflow-x-auto">
                            <div className="min-w-[640px]">
                              <div className="grid grid-cols-4 gap-3 text-sm">
                                <div className="text-muted-foreground">Attribute</div>
                                {compareItems.map((i) => (
                                  <div key={i.id} className="font-semibold">{i.title}</div>
                                ))}
                                {Array.from({ length: Math.max(0, 3 - compareItems.length) }).map((_, idx) => (
                                  <div key={`empty-${idx}`} className="text-muted-foreground">—</div>
                                ))}

                                <Separator className="col-span-4 my-1" />

                                <div className="text-muted-foreground">Stream</div>
                                {compareItems.map((i) => (
                                  <div key={i.id + "-stream"}>{i.stream}</div>
                                ))}
                                {Array.from({ length: Math.max(0, 3 - compareItems.length) }).map((_, idx) => (
                                  <div key={`empty2-${idx}`} className="text-muted-foreground">—</div>
                                ))}

                                <div className="text-muted-foreground">Fit</div>
                                {compareItems.map((i) => (
                                  <div key={i.id + "-fit"} className="flex items-center gap-2">
                                    <Progress value={i.fitScore} className="h-2 w-24" />
                                    <span className="text-xs">{i.fitScore}%</span>
                                  </div>
                                ))}
                                {Array.from({ length: Math.max(0, 3 - compareItems.length) }).map((_, idx) => (
                                  <div key={`empty3-${idx}`} className="text-muted-foreground">—</div>
                                ))}

                                <div className="text-muted-foreground">Key skills</div>
                                {compareItems.map((i) => (
                                  <div key={i.id + "-skills"} className="flex flex-wrap gap-1">
                                    {i.skills.slice(0, 4).map((s) => (
                                      <Badge key={s} variant="outline" className="rounded-full">
                                        {s}
                                      </Badge>
                                    ))}
                                  </div>
                                ))}
                                {Array.from({ length: Math.max(0, 3 - compareItems.length) }).map((_, idx) => (
                                  <div key={`empty4-${idx}`} className="text-muted-foreground">—</div>
                                ))}

                                <div className="text-muted-foreground">Courses</div>
                                {compareItems.map((i) => (
                                  <div key={i.id + "-courses"} className="text-xs text-muted-foreground">
                                    {i.courses.slice(0, 2).map((c) => c.provider).join(", ")}
                                  </div>
                                ))}
                                {Array.from({ length: Math.max(0, 3 - compareItems.length) }).map((_, idx) => (
                                  <div key={`empty5-${idx}`} className="text-muted-foreground">—</div>
                                ))}
                              </div>
                            </div>
                            <div className="mt-4 flex items-center justify-between">
                              <Button
                                variant="ghost"
                                onClick={() => setCompareSet(new Set())}
                              >
                                Clear comparison
                              </Button>
                              <div className="flex items-center gap-2">
                                <Button
                                  onClick={() =>
                                    toast("Guidance session booked", {
                                      description: "A counselor will reach out via email shortly.",
                                    })
                                  }
                                >
                                  Talk to a counselor
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </CardFooter>
                </Card>
              </li>
            )
          })}

          {filtered.length === 0 && (
            <li>
              <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
                <p className="font-semibold">No results</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Try adjusting filters or search terms.
                </p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <Button variant="outline" onClick={clearFilters}>Reset filters</Button>
                  <Button
                    onClick={() =>
                      toast("Need help?", {
                        description: "Use the AI assistant to refine your preferences.",
                      })
                    }
                  >
                    Ask the AI assistant
                  </Button>
                </div>
              </div>
            </li>
          )}
        </ul>
      </div>
    </section>
  )
}