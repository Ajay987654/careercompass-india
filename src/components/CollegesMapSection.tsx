"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Map, MapPin, Locate, LocateFixed, University, Earth } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type LatLng = { lat: number; lng: number };

type College = {
  id: string;
  name: string;
  city: string;
  state: string;
  location: { lat: number; lng: number };
  courses: string[];
  rating?: number; // 0-5
  ranking?: number; // national rank, lower is better
  admissions?: string; // brief requirements text
};

interface CollegesMapSectionProps {
  className?: string;
  defaultCenter?: LatLng;
  defaultRadiusKm?: number;
  googleMapsApiKey?: string; // When undefined, map UI shows a helpful placeholder
  initialCourse?: string;
  endpoint?: string; // override API endpoint (default: /api/colleges)
}

export default function CollegesMapSection({
  className,
  defaultCenter = { lat: 28.6139, lng: 77.209 }, // New Delhi
  defaultRadiusKm = 25,
  googleMapsApiKey,
  initialCourse,
  endpoint = "/api/colleges",
}: CollegesMapSectionProps) {
  const [center, setCenter] = useState<LatLng>(defaultCenter);
  const [hasUserLocated, setHasUserLocated] = useState(false);
  const [radiusKm, setRadiusKm] = useState<number>(defaultRadiusKm);
  const [course, setCourse] = useState<string | undefined>(initialCourse);
  const [ranking, setRanking] = useState<string | undefined>(undefined);
  const [query, setQuery] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [colleges, setColleges] = useState<College[]>([]);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Google Maps
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [mapsReady, setMapsReady] = useState(false);

  // Load Google Maps JS API when apiKey provided
  useEffect(() => {
    if (!googleMapsApiKey) return;
    if (typeof window === "undefined") return;

    // already loaded
    if ((window as any).google && (window as any).google.maps) {
      setMapsReady(true);
      return;
    }

    const existing = document.getElementById("google-maps-js");
    if (existing) {
      existing.addEventListener("load", () => setMapsReady(true), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = "google-maps-js";
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      googleMapsApiKey
    )}&libraries=places`;
    script.onload = () => setMapsReady(true);
    script.onerror = () => {
      setMapsReady(false);
      toast.error("Failed to load Google Maps. Please check your network or API key.");
    };
    document.head.appendChild(script);
  }, [googleMapsApiKey]);

  // Initialize map once ready
  useEffect(() => {
    if (!mapsReady || !mapRef.current) return;
    if (mapInstance.current) return;

    mapInstance.current = new google.maps.Map(mapRef.current, {
      center,
      zoom: zoomForRadius(radiusKm),
      disableDefaultUI: true,
      zoomControl: true,
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
      clickableIcons: false,
      gestureHandling: "greedy",
    });

    infoWindowRef.current = new google.maps.InfoWindow();
  }, [mapsReady]);

  // Update map center/zoom when state changes
  useEffect(() => {
    if (!mapInstance.current) return;
    mapInstance.current.setCenter(center);
    mapInstance.current.setZoom(zoomForRadius(radiusKm));
  }, [center, radiusKm]);

  // Draw/update markers when colleges change
  useEffect(() => {
    if (!mapsReady || !mapInstance.current) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    colleges.forEach((c) => {
      const marker = new google.maps.Marker({
        position: c.location,
        map: mapInstance.current!,
        title: c.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#1f2b48",
          fillOpacity: 0.95,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      });

      marker.addListener("click", () => {
        if (!infoWindowRef.current) return;
        const content = `
          <div style="font-family: Inter, system-ui, -apple-system; max-width: 260px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
              <div style="width:10px;height:10px;border-radius:50%;background:#1f2b48;"></div>
              <strong style="font-size:14px;line-height:1.2;color:#0f172a;">${escapeHtml(
                c.name
              )}</strong>
            </div>
            <div style="font-size:12px;color:#5b6b7c;margin-bottom:8px;">${escapeHtml(
              c.city
            )}, ${escapeHtml(c.state)}</div>
            <div style="font-size:12px;color:#0f172a;margin-bottom:4px;">
              Courses: ${c.courses.slice(0, 3).map(escapeHtml).join(", ")}${
          c.courses.length > 3 ? "…" : ""
        }
            </div>
            ${
              typeof c.rating === "number"
                ? `<div style="font-size:12px;color:#0f172a;">Rating: ${c.rating.toFixed(
                    1
                  )}/5</div>`
                : ""
            }
          </div>
        `;
        infoWindowRef.current.setContent(content);
        infoWindowRef.current.open({
          anchor: marker,
          map: mapInstance.current!,
        });
      });

      markersRef.current.push(marker);
    });
  }, [colleges, mapsReady]);

  // Fetch colleges with filters
  const fetchColleges = useCallback(
    async (coords: LatLng, opts?: { silent?: boolean }) => {
      const controller = new AbortController();
      setIsFetching(true);
      setError(null);

      const params = new URLSearchParams();
      params.set("lat", String(coords.lat));
      params.set("lng", String(coords.lng));
      params.set("radiusKm", String(radiusKm));
      if (course) params.set("course", course);
      if (ranking) params.set("ranking", ranking);

      try {
        const res = await fetch(`${endpoint}?${params.toString()}`, {
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `Request failed (${res.status})`);
        }

        const data: College[] = await res.json();
        setColleges(data);
        if (!opts?.silent) {
          toast.success(`Found ${data.length} colleges in ${radiusKm} km`);
        }
      } catch (e: any) {
        const msg = e?.message || "Failed to load colleges";
        setError(msg);
        if (!opts?.silent) toast.error(msg);
      } finally {
        setIsFetching(false);
      }

      return () => controller.abort();
    },
    [endpoint, radiusKm, course, ranking]
  );

  // Initial fetch
  useEffect(() => {
    fetchColleges(center, { silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch when filters change
  useEffect(() => {
    fetchColleges(center, { silent: true });
  }, [center, radiusKm, course, ranking, fetchColleges]);

  // Geolocate user
  const handleLocate = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }
    toast.info("Locating…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setCenter(coords);
        setHasUserLocated(true);
        toast.success("Location updated");
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          toast.error("Location permission denied.");
        } else {
          toast.error("Unable to retrieve your location.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Geocode manual query using Google Geocoder if available
  const handleSearchLocation = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const q = query.trim();
      if (!q) return;
      if (!mapsReady || !(window as any).google?.maps?.Geocoder) {
        toast.error("Maps not ready. Please try again.");
        return;
      }
      setIsGeocoding(true);
      try {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ address: q, region: "in" }, (results, status) => {
          if (status !== "OK" || !results || results.length === 0) {
            toast.error("Location not found.");
            setIsGeocoding(false);
            return;
          }
          const loc = results[0].geometry.location;
          const coords = { lat: loc.lat(), lng: loc.lng() };
          setCenter(coords);
          setHasUserLocated(true);
          toast.success(`Centered on ${results[0].formatted_address}`);
          setIsGeocoding(false);
        });
      } catch {
        setIsGeocoding(false);
        toast.error("Failed to search location.");
      }
    },
    [mapsReady, query]
  );

  const headerSubtitle = useMemo(() => {
    const parts: string[] = [];
    if (course) parts.push(capitalize(course));
    parts.push(`${radiusKm} km radius`);
    if (ranking && ranking !== "all") parts.push(humanizeRanking(ranking));
    return parts.join(" • ");
  }, [course, radiusKm, ranking]);

  return (
    <section
      className={[
        "w-full max-w-full rounded-2xl bg-card shadow-sm border",
        "p-4 sm:p-6 md:p-8",
        "animate-in fade-in slide-in-from-bottom-2 duration-300",
        className || "",
      ].join(" ")}
      aria-label="College Finder with Map"
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-primary">
              <University className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 className="text-lg sm:text-xl md:text-2xl font-heading font-semibold tracking-tight">
              Government Colleges Near You
            </h2>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 break-words">
            {headerSubtitle || "Discover government colleges based on your location and interests."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={handleLocate}
            aria-label="Use my current location"
            className="gap-2"
          >
            <Locate className="h-4 w-4" aria-hidden="true" />
            Locate me
          </Button>
        </div>
      </div>

      <Separator className="my-4" />

      <div className="flex flex-col gap-6">
        {/* Controls */}
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Location search */}
          <form
            onSubmit={handleSearchLocation}
            className="flex w-full lg:max-w-md items-center gap-2"
            role="search"
            aria-label="Search by location"
          >
            <div className="relative w-full">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter a city, district, or PIN code"
                aria-label="Location search input"
                className="pr-9"
                autoComplete="off"
              />
              <Earth
                className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
            </div>
            <Button type="submit" aria-label="Search location" className="gap-2">
              <Map className="h-4 w-4" aria-hidden="true" />
              {isGeocoding ? "Searching…" : "Search"}
            </Button>
          </form>

          {/* Filters */}
          <div className="flex flex-1 flex-wrap gap-2">
            <Select value={course} onValueChange={(v) => setCourse(v)}>
              <SelectTrigger className="w-[220px]" aria-label="Filter by course">
                <SelectValue placeholder="All courses" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Course type</SelectLabel>
                  <SelectItem value="engineering">Engineering</SelectItem>
                  <SelectItem value="medical">Medical</SelectItem>
                  <SelectItem value="science">Science</SelectItem>
                  <SelectItem value="arts">Arts</SelectItem>
                  <SelectItem value="commerce">Commerce</SelectItem>
                  <SelectItem value="law">Law</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select value={ranking} onValueChange={(v) => setRanking(v)}>
              <SelectTrigger className="w-[180px]" aria-label="Filter by ranking">
                <SelectValue placeholder="All rankings" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Ranking</SelectLabel>
                  <SelectItem value="top-50">Top 50</SelectItem>
                  <SelectItem value="top-100">Top 100</SelectItem>
                  <SelectItem value="top-200">Top 200</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-3 rounded-lg bg-secondary px-3 py-2 min-w-[240px]">
              <div className="shrink-0 text-sm text-muted-foreground">Radius</div>
              <div className="flex-1 min-w-0">
                <Slider
                  value={[radiusKm]}
                  onValueChange={(v) => setRadiusKm(v[0] ?? defaultRadiusKm)}
                  min={5}
                  max={100}
                  step={5}
                  aria-label="Search radius in kilometers"
                />
              </div>
              <div className="text-sm font-medium tabular-nums">{radiusKm} km</div>
            </div>
          </div>
        </div>

        {/* Map + List */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 min-w-0">
          {/* Map panel */}
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-accent text-primary">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                </div>
                <CardTitle className="text-base sm:text-lg font-semibold">
                  Map
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="rounded-md">
                  <LocateFixed className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                  {hasUserLocated ? "Using your location" : "Default location"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {!googleMapsApiKey ? (
                <div className="flex flex-col items-center justify-center h-[360px] sm:h-[420px] bg-secondary text-center px-6">
                  <Earth className="h-10 w-10 text-muted-foreground mb-3" aria-hidden="true" />
                  <p className="text-sm text-muted-foreground max-w-prose">
                    Map is unavailable. Provide a valid Google Maps API key to enable interactive
                    map features.
                  </p>
                </div>
              ) : (
                <div className="relative">
                  <div
                    ref={mapRef}
                    className="h-[360px] sm:h-[420px] w-full"
                    role="img"
                    aria-label="Google map showing college locations"
                  />
                  {!mapsReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="inline-block h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                        Loading map…
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* List panel */}
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg font-semibold">
                Colleges
              </CardTitle>
              <CardDescription className="break-words">
                {isFetching
                  ? "Fetching colleges…"
                  : `Showing ${colleges.length} result${colleges.length === 1 ? "" : "s"}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error ? (
                <div
                  role="alert"
                  className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground"
                >
                  {error}
                </div>
              ) : null}

              <div className="flex flex-col divide-y">
                {isFetching && colleges.length === 0 ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-start gap-3 py-3">
                        <div className="h-10 w-10 rounded-md bg-muted animate-pulse" />
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
                          <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
                          <div className="h-3 w-1/3 bg-muted rounded animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : colleges.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No colleges found for the current filters.
                  </div>
                ) : (
                  colleges.map((c) => (
                    <div key={c.id} className="flex items-start gap-3 py-3">
                      <div className="shrink-0">
                        <div className="h-10 w-10 rounded-md bg-accent text-primary flex items-center justify-center">
                          <University className="h-5 w-5" aria-hidden="true" />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium leading-tight text-sm sm:text-base truncate">
                            {c.name}
                          </h3>
                          {typeof c.ranking === "number" ? (
                            <Badge variant="secondary" className="rounded">
                              Rank #{c.ranking}
                            </Badge>
                          ) : null}
                          {typeof c.rating === "number" ? (
                            <Badge className="rounded bg-primary text-primary-foreground">
                              {c.rating.toFixed(1)}/5
                            </Badge>
                          ) : null}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {c.city}, {c.state}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {c.courses.slice(0, 4).map((crs) => (
                            <span
                              key={crs}
                              className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-foreground"
                            >
                              {crs}
                            </span>
                          ))}
                          {c.courses.length > 4 ? (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-foreground">
                              +{c.courses.length - 4} more
                            </span>
                          ) : null}
                        </div>
                        {c.admissions ? (
                          <p className="mt-2 text-xs text-foreground/80 line-clamp-2">
                            Admission: {c.admissions}
                          </p>
                        ) : null}
                        <div className="mt-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs gap-1"
                            onClick={() => {
                              // Pan map to college location and open info window
                              if (!mapInstance.current || !mapsReady) return;
                              mapInstance.current.panTo(c.location);
                              mapInstance.current.setZoom(Math.max(mapInstance.current.getZoom() || 12, 14));
                              const marker = markersRef.current.find(
                                (m) =>
                                  Math.abs(m.getPosition()!.lat() - c.location.lat) < 1e-6 &&
                                  Math.abs(m.getPosition()!.lng() - c.location.lng) < 1e-6
                              );
                              if (marker && infoWindowRef.current) {
                                const content = `
                                  <div style="font-family: Inter, system-ui, -apple-system; max-width: 260px;">
                                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                                      <div style="width:10px;height:10px;border-radius:50%;background:#1f2b48;"></div>
                                      <strong style="font-size:14px;line-height:1.2;color:#0f172a;">${escapeHtml(
                                        c.name
                                      )}</strong>
                                    </div>
                                    <div style="font-size:12px;color:#5b6b7c;margin-bottom:8px;">${escapeHtml(
                                      c.city
                                    )}, ${escapeHtml(c.state)}</div>
                                    <div style="font-size:12px;color:#0f172a;margin-bottom:4px;">
                                      Courses: ${c.courses
                                        .slice(0, 3)
                                        .map(escapeHtml)
                                        .join(", ")}${c.courses.length > 3 ? "…" : ""}
                                    </div>
                                    ${
                                      typeof c.rating === "number"
                                        ? `<div style="font-size:12px;color:#0f172a;">Rating: ${c.rating.toFixed(
                                            1
                                          )}/5</div>`
                                        : ""
                                    }
                                  </div>
                                `;
                                infoWindowRef.current.setContent(content);
                                infoWindowRef.current.open({
                                  anchor: marker,
                                  map: mapInstance.current!,
                                });
                              }
                            }}
                            aria-label={`Show ${c.name} on map`}
                          >
                            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                            View on map
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

// Helpers

function zoomForRadius(radiusKm: number): number {
  // Approximate zoom level based on radius (for Web Mercator around mid-lats)
  // 5km ~ 13-14, 10km ~ 12-13, 25km ~ 11-12, 50km ~ 10-11, 100km ~ 9-10
  if (radiusKm <= 7) return 14;
  if (radiusKm <= 12) return 13;
  if (radiusKm <= 20) return 12;
  if (radiusKm <= 35) return 11;
  if (radiusKm <= 70) return 10;
  return 9;
}

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function humanizeRanking(v: string) {
  if (v.startsWith("top-")) return v.replace("top-", "Top ");
  return v;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}