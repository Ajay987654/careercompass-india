"use client";

import React, { useEffect, useMemo, useState } from "react";
import { GraduationCap, Briefcase, BookOpenCheck, ListFilter, FolderSearch2, Grid3x3, University } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

type Stream = {
  id: string;
  name: string;
  summary?: string;
  fitScore?: number; // 0-100
  reasons?: string[];
  level?: "10+2" | "Undergraduate" | "Postgraduate" | "Diploma";
  tags?: string[];
  imageUrl?: string;
};

type Course = {
  id: string;
  title: string;
  stream: string;
  description: string;
  level: "Certificate" | "Diploma" | "Undergraduate" | "Postgraduate";
  duration?: string; // e.g., "4 years"
  salaryRange?: string; // e.g., "₹4L–₹10L"
  qualifications?: string[];
  prospects?: string;
  popularity?: number; // 0-100
  relevance?: number; // 0-100
  imageUrl?: string;
  resources?: Array<{ label: string; url: string }>;
};

type Career = {
  id: string;
  title: string;
  field: string;
  overview: string;
  salaryRange?: string;
  growthOutlook?: "High" | "Moderate" | "Emerging" | "Stable";
  requiredQualifications?: string[];
  recommendedCourses?: string[]; // course ids or names
  relevance?: number; // 0-100
  popularity?: number;
  imageUrl?: string;
};

type Skill = {
  id: string;
  name: string;
  category: "Technical" | "Soft" | "Analytical" | "Creative";
  level?: "Beginner" | "Intermediate" | "Advanced";
  description?: string;
  recommendedResources?: Array<{ label: string; url: string }>;
};

type RecommendationResponse = {
  streams: Stream[];
  courses: Course[];
  careers: Career[];
  skills: Skill[];
  meta?: {
    quizId?: string;
    generatedAt?: string;
  };
};

type SortKey = "relevance" | "salary" | "popularity" | "alphabetical";
type FilterLevel = "all" | "Undergraduate" | "Postgraduate" | "Diploma" | "Certificate" | "10+2";

export interface CareerRecommendationsSectionProps {
  className?: string;
  quizId?: string;
  userId?: string;
  autoLoad?: boolean;
  defaultTab?: "streams" | "courses" | "careers" | "skills";
}

function formatOutlookBadge(outlook?: Career["growthOutlook"]) {
  switch (outlook) {
    case "High":
      return { label: "High growth", className: "bg-chart-1/15 text-chart-1" };
    case "Emerging":
      return { label: "Emerging", className: "bg-chart-5/15 text-chart-5" };
    case "Moderate":
      return { label: "Moderate", className: "bg-chart-4/15 text-chart-4" };
    case "Stable":
      return { label: "Stable", className: "bg-muted text-muted-foreground" };
    default:
      return { label: "Outlook", className: "bg-muted text-muted-foreground" };
  }
}

function toUnsplash(query: string) {
  // Use Unsplash images only; deterministic topics
  const encoded = encodeURIComponent(query);
  return `https://images.unsplash.com/photo-1513258496099-48168024aec0?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=&${encoded}`;
}

export default function CareerRecommendationsSection({
  className,
  quizId,
  userId,
  autoLoad = true,
  defaultTab = "streams",
}: CareerRecommendationsSectionProps) {
  const [data, setData] = useState<RecommendationResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(autoLoad);
  const [error, setError] = useState<string | null>(null);

  // Controls
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("relevance");
  const [level, setLevel] = useState<FilterLevel>("all");
  const [activeTab, setActiveTab] = useState<"streams" | "courses" | "careers" | "skills">(defaultTab);

  useEffect(() => {
    if (!autoLoad) return;
    void fetchRecommendations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId, autoLoad]);

  async function fetchRecommendations() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (quizId) params.set("quizId", quizId);
      if (userId) params.set("userId", userId);
      const res = await fetch(`/api/recommendations?${params.toString()}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`Failed to load recommendations (${res.status})`);
      }
      const json = (await res.json()) as RecommendationResponse;
      setData(json);
    } catch (err: any) {
      setError(err?.message || "Failed to load recommendations");
    } finally {
      setLoading(false);
    }
  }

  const filteredCourses = useMemo(() => {
    const list = data?.courses ?? [];
    const byLevel =
      level === "all"
        ? list
        : list.filter((c) => (level === "10+2" ? false : c.level === level || (level === "Undergraduate" && c.level === "Undergraduate")));
    const bySearch = search
      ? byLevel.filter(
          (c) =>
            c.title.toLowerCase().includes(search.toLowerCase()) ||
            c.stream.toLowerCase().includes(search.toLowerCase()) ||
            c.description.toLowerCase().includes(search.toLowerCase()),
        )
      : byLevel;

    const withSalarySort = (a: Course, b: Course) => {
      // salaryRange: "₹4L–₹10L" -> parse upper bound
      const parse = (s?: string) => {
        if (!s) return 0;
        const match = s.replace(/[^0-9\-–]/g, "").split(/-|–/).map(Number);
        return match[1] || match[0] || 0;
      };
      return parse(b.salaryRange) - parse(a.salaryRange);
    };

    const sorted = [...bySearch].sort((a, b) => {
      switch (sort) {
        case "relevance":
          return (b.relevance ?? 0) - (a.relevance ?? 0);
        case "popularity":
          return (b.popularity ?? 0) - (a.popularity ?? 0);
        case "salary":
          return withSalarySort(a, b);
        case "alphabetical":
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });
    return sorted;
  }, [data?.courses, level, search, sort]);

  const filteredCareers = useMemo(() => {
    const list = data?.careers ?? [];
    const bySearch = search
      ? list.filter(
          (c) =>
            c.title.toLowerCase().includes(search.toLowerCase()) ||
            c.field.toLowerCase().includes(search.toLowerCase()) ||
            c.overview.toLowerCase().includes(search.toLowerCase()),
        )
      : list;

    const withSalarySort = (a: Career, b: Career) => {
      const parse = (s?: string) => {
        if (!s) return 0;
        const match = s.replace(/[^0-9\-–]/g, "").split(/-|–/).map(Number);
        return match[1] || match[0] || 0;
      };
      return parse(b.salaryRange) - parse(a.salaryRange);
    };

    return [...bySearch].sort((a, b) => {
      switch (sort) {
        case "relevance":
          return (b.relevance ?? 0) - (a.relevance ?? 0);
        case "popularity":
          return (b.popularity ?? 0) - (a.popularity ?? 0);
        case "salary":
          return withSalarySort(a, b);
        case "alphabetical":
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });
  }, [data?.careers, search, sort]);

  const filteredStreams = useMemo(() => {
    const list = data?.streams ?? [];
    const byLevel = level === "all" ? list : list.filter((s) => (s.level as any) === level);
    return search
      ? byLevel.filter(
          (s) =>
            s.name.toLowerCase().includes(search.toLowerCase()) ||
            (s.summary ?? "").toLowerCase().includes(search.toLowerCase()) ||
            (s.tags ?? []).some((t) => t.toLowerCase().includes(search.toLowerCase())),
        )
      : byLevel;
  }, [data?.streams, level, search]);

  const filteredSkills = useMemo(() => {
    const list = data?.skills ?? [];
    return search
      ? list.filter(
          (s) =>
            s.name.toLowerCase().includes(search.toLowerCase()) ||
            (s.description ?? "").toLowerCase().includes(search.toLowerCase()) ||
            s.category.toLowerCase().includes(search.toLowerCase()),
        )
      : list;
  }, [data?.skills, search]);

  function handleSave(label: string, type: "Course" | "Career" | "Stream" | "Skill") {
    toast.success(`${type} saved to your plan`, { description: label });
  }

  const header = (
    <div className="w-full bg-card rounded-xl border p-4 sm:p-6 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-heading font-bold tracking-tight">Personalized Recommendations</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Curated streams, courses, careers, and skills based on your quiz results.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={fetchRecommendations} disabled={loading} aria-label="Refresh recommendations">
            <Grid3x3 className="size-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="relative">
              <FolderSearch2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" aria-hidden="true" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title, stream, field, or keyword"
                className="pl-9 bg-secondary"
                aria-label="Search recommendations"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:block text-xs text-muted-foreground">Filters</div>
            <div className="flex items-center gap-2">
              <Select value={level} onValueChange={(v: FilterLevel) => setLevel(v)}>
                <SelectTrigger className="w-[150px] bg-secondary" aria-label="Filter by level">
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All levels</SelectItem>
                  <SelectItem value="10+2">10+2</SelectItem>
                  <SelectItem value="Certificate">Certificate</SelectItem>
                  <SelectItem value="Diploma">Diploma</SelectItem>
                  <SelectItem value="Undergraduate">Undergraduate</SelectItem>
                  <SelectItem value="Postgraduate">Postgraduate</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sort} onValueChange={(v: SortKey) => setSort(v)}>
                <SelectTrigger className="w-[170px] bg-secondary" aria-label="Sort results">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="salary">Salary (High to Low)</SelectItem>
                  <SelectItem value="popularity">Popularity</SelectItem>
                  <SelectItem value="alphabetical">A → Z</SelectItem>
                </SelectContent>
              </Select>

              <div className="inline-flex items-center gap-2 rounded-md border bg-secondary px-2.5 py-1.5 text-xs text-foreground">
                <ListFilter className="size-3.5" />
                <span className="hidden sm:inline">Active</span>
                <Separator orientation="vertical" className="mx-1 h-4" />
                <span className="text-muted-foreground">{level === "all" ? "All levels" : level}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <section className={["w-full", className].filter(Boolean).join(" ")}>
      {header}

      <div className="mt-4 sm:mt-6 bg-card rounded-xl border shadow-sm">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 border-b">
            <TabsList className="bg-secondary">
              <TabsTrigger value="streams" className="gap-2">
                <GraduationCap className="size-4" />
                Streams
              </TabsTrigger>
              <TabsTrigger value="courses" className="gap-2">
                <BookOpenCheck className="size-4" />
                Courses
              </TabsTrigger>
              <TabsTrigger value="careers" className="gap-2">
                <Briefcase className="size-4" />
                Careers
              </TabsTrigger>
              <TabsTrigger value="skills" className="gap-2">
                <University className="size-4" />
                Skills
              </TabsTrigger>
            </TabsList>

            {!loading && !error && data?.meta?.generatedAt ? (
              <div className="text-xs text-muted-foreground px-1">
                Updated {new Date(data.meta.generatedAt).toLocaleString()}
              </div>
            ) : null}
          </div>

          <div className="p-4 sm:p-6">
            {/* Loading */}
            {loading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <Skeleton className="h-28 w-full" />
                    <CardHeader className="space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-4/5" />
                    </CardContent>
                    <CardFooter className="flex items-center justify-between">
                      <Skeleton className="h-9 w-24" />
                      <Skeleton className="h-9 w-28" />
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}

            {/* Error */}
            {!loading && error && (
              <div className="rounded-lg border bg-secondary p-6 text-center">
                <p className="text-sm text-destructive">Unable to load recommendations</p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
                <div className="mt-4">
                  <Button onClick={fetchRecommendations} variant="default">
                    Try Again
                  </Button>
                </div>
              </div>
            )}

            {/* Empty */}
            {!loading && !error && !data && (
              <div className="rounded-lg border bg-secondary p-6 text-center">
                <p className="text-sm">No recommendations yet.</p>
                <p className="text-sm text-muted-foreground mt-1">Complete the quiz to receive tailored guidance.</p>
                <div className="mt-4">
                  <Button variant="default" disabled>
                    Waiting for quiz
                  </Button>
                </div>
              </div>
            )}

            {/* Streams */}
            {!loading && !error && data && (
              <>
                <TabsContent value="streams" className="m-0">
                  {filteredStreams.length === 0 ? (
                    <EmptyState label="No streams found" />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {filteredStreams.map((s) => (
                        <Card key={s.id} className="overflow-hidden bg-card">
                          <div className="relative h-28 w-full overflow-hidden">
                            <img
                              src={s.imageUrl || toUnsplash("study")}
                              alt=""
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          </div>
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <CardTitle className="text-base sm:text-lg truncate">{s.name}</CardTitle>
                                <CardDescription className="mt-1 line-clamp-2 break-words">
                                  {s.summary || "Recommended academic stream based on your strengths."}
                                </CardDescription>
                              </div>
                              {typeof s.fitScore === "number" && (
                                <Badge variant="secondary" className="shrink-0">
                                  Fit {Math.round(s.fitScore)}%
                                </Badge>
                              )}
                            </div>
                          </CardHeader>
                          {s.reasons && s.reasons.length > 0 && (
                            <CardContent className="pt-0">
                              <ul className="text-sm text-foreground/90 list-disc pl-5 space-y-1">
                                {s.reasons.slice(0, 3).map((r, idx) => (
                                  <li key={idx} className="break-words">
                                    {r}
                                  </li>
                                ))}
                              </ul>
                              {s.tags && s.tags.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {s.tags.slice(0, 4).map((t, i) => (
                                    <Badge key={i} variant="outline" className="bg-secondary text-foreground">
                                      {t}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </CardContent>
                          )}
                          <CardFooter className="flex items-center justify-between">
                            <Button size="sm" variant="secondary" onClick={() => handleSave(s.name, "Stream")}>
                              Save to Plan
                            </Button>
                            <div className="text-xs text-muted-foreground">
                              Level: {s.level || "N/A"}
                            </div>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Courses */}
                <TabsContent value="courses" className="m-0">
                  {filteredCourses.length === 0 ? (
                    <EmptyState label="No courses match your search" />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {filteredCourses.map((c) => (
                        <Card key={c.id} className="overflow-hidden bg-card">
                          <div className="relative h-28 w-full overflow-hidden">
                            <img
                              src={c.imageUrl || toUnsplash(c.stream)}
                              alt=""
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          </div>
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <CardTitle className="text-base sm:text-lg truncate">{c.title}</CardTitle>
                                <CardDescription className="mt-1">
                                  {c.stream} • {c.level}
                                </CardDescription>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                {typeof c.relevance === "number" && (
                                  <Badge variant="secondary" className="shrink-0">Relevance {Math.round(c.relevance)}%</Badge>
                                )}
                                {typeof c.popularity === "number" && (
                                  <Badge variant="outline" className="bg-secondary">Popularity {Math.round(c.popularity)}%</Badge>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <p className="text-sm text-foreground/90 line-clamp-3 break-words">
                              {c.description}
                            </p>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <InfoRow label="Duration" value={c.duration || "Varies"} />
                              <InfoRow label="Salary Range" value={c.salaryRange || "Depends on role"} />
                            </div>
                            {c.qualifications && c.qualifications.length > 0 && (
                              <>
                                <Separator />
                                <div className="space-y-1">
                                  <div className="text-xs text-muted-foreground">Required qualifications</div>
                                  <ul className="text-sm list-disc pl-5 space-y-1">
                                    {c.qualifications.slice(0, 3).map((q, i) => (
                                      <li key={i} className="break-words">{q}</li>
                                    ))}
                                  </ul>
                                </div>
                              </>
                            )}
                          </CardContent>
                          <CardFooter className="flex items-center justify-between">
                            <Button size="sm" variant="secondary" onClick={() => handleSave(c.title, "Course")}>
                              Save to Plan
                            </Button>
                            <div className="flex items-center gap-2">
                              {c.resources && c.resources.length > 0 ? (
                                <ExternalLinks resources={c.resources} />
                              ) : (
                                <ExternalLinks
                                  resources={[
                                    { label: "Coursera", url: "https://www.coursera.org" },
                                    { label: "NPTEL", url: "https://nptel.ac.in" },
                                  ]}
                                />
                              )}
                            </div>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Careers */}
                <TabsContent value="careers" className="m-0">
                  {filteredCareers.length === 0 ? (
                    <EmptyState label="No careers match your search" />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {filteredCareers.map((c) => (
                        <Card key={c.id} className="overflow-hidden bg-card">
                          <div className="relative h-28 w-full overflow-hidden">
                            <img
                              src={c.imageUrl || toUnsplash(c.field)}
                              alt=""
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          </div>
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <CardTitle className="text-base sm:text-lg truncate">{c.title}</CardTitle>
                                <CardDescription className="mt-1">{c.field}</CardDescription>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                {typeof c.relevance === "number" && (
                                  <Badge variant="secondary">Relevance {Math.round(c.relevance)}%</Badge>
                                )}
                                <Badge variant="outline" className={["bg-secondary", formatOutlookBadge(c.growthOutlook).className].join(" ")}>
                                  {formatOutlookBadge(c.growthOutlook).label}
                                </Badge>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <p className="text-sm text-foreground/90 line-clamp-3 break-words">{c.overview}</p>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <InfoRow label="Salary Range" value={c.salaryRange || "Varies"} />
                              <InfoRow label="Popularity" value={typeof c.popularity === "number" ? `${Math.round(c.popularity)}%` : "—"} />
                            </div>
                            {c.requiredQualifications && c.requiredQualifications.length > 0 && (
                              <>
                                <Separator />
                                <div className="space-y-1">
                                  <div className="text-xs text-muted-foreground">Required qualifications</div>
                                  <ul className="text-sm list-disc pl-5 space-y-1">
                                    {c.requiredQualifications.slice(0, 3).map((q, i) => (
                                      <li key={i} className="break-words">{q}</li>
                                    ))}
                                  </ul>
                                </div>
                              </>
                            )}
                          </CardContent>
                          <CardFooter className="flex items-center justify-between">
                            <Button size="sm" variant="secondary" onClick={() => handleSave(c.title, "Career")}>
                              Save to Plan
                            </Button>
                            <div className="flex items-center gap-2">
                              <ExternalLinks
                                resources={[
                                  { label: "LinkedIn Jobs", url: "https://www.linkedin.com/jobs/" },
                                  { label: "Naukri", url: "https://www.naukri.com" },
                                ]}
                              />
                            </div>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Skills */}
                <TabsContent value="skills" className="m-0">
                  {filteredSkills.length === 0 ? (
                    <EmptyState label="No skills found" />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {filteredSkills.map((s) => (
                        <Card key={s.id} className="overflow-hidden bg-card">
                          <div className="relative h-24 w-full overflow-hidden">
                            <img
                              src={toUnsplash(s.category)}
                              alt=""
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          </div>
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <CardTitle className="text-base sm:text-lg truncate">{s.name}</CardTitle>
                                <CardDescription className="mt-1">{s.category} • {s.level || "All levels"}</CardDescription>
                              </div>
                              <Badge variant="outline" className="bg-secondary">{s.level || "Skill"}</Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {s.description && (
                              <p className="text-sm text-foreground/90 line-clamp-3 break-words">{s.description}</p>
                            )}
                          </CardContent>
                          <CardFooter className="flex items-center justify-between">
                            <Button size="sm" variant="secondary" onClick={() => handleSave(s.name, "Skill")}>
                              Add to Plan
                            </Button>
                            <ExternalLinks
                              resources={
                                s.recommendedResources && s.recommendedResources.length > 0
                                  ? s.recommendedResources
                                  : [
                                      { label: "SWAYAM", url: "https://swayam.gov.in" },
                                      { label: "edX", url: "https://www.edx.org" },
                                    ]
                              }
                            />
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>
      </div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm truncate">{value}</div>
    </div>
  );
}

function ExternalLinks({ resources }: { resources: Array<{ label: string; url: string }> }) {
  return (
    <div className="flex items-center gap-2">
      {resources.slice(0, 2).map((r, i) => (
        <a
          key={i}
          href={r.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs px-2 py-1 rounded-md border bg-secondary hover:bg-accent transition-colors"
        >
          {r.label}
        </a>
      ))}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-lg border bg-secondary p-8 text-center">
      <p className="text-sm">{label}</p>
      <p className="text-sm text-muted-foreground mt-1">Try adjusting filters or searching different keywords.</p>
    </div>
  );
}