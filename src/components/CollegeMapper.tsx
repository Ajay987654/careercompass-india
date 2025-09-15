"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Map, MapPin, LocateFixed, University, School, MapPinned, Signpost } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type LatLng = { lat: number; lng: number };

type College = {
  id: string;
  name: string;
  type: "Government" | "Government Aided" | "Central" | "State";
  location: {
    city: string;
    state: string;
    lat: number;
    lng: number;
    address: string;
  };
  courses: string[];
  admissions: {
    requirements: string[];
    timeline: { phase: string; date: string }[];
    applicationUrl?: string;
  };
  contact: {
    phone?: string;
    email?: string;
    website?: string;
  };
  website?: string;
  imageUrl?: string;
};

declare global {
  interface Window {
    initCCMap?: () => void;
    google?: any;
  }
}

interface CollegeMapperProps {
  className?: string;
  style?: React.CSSProperties;
  googleMapsApiKey?: string;
  initialLocation?: LatLng;
  colleges?: College[];
  defaultView?: "map" | "list";
  onFavoritesChange?: (favorites: string[]) => void;
}

const DEFAULT_COLLEGES: College[] = [
  {
    id: "du-01",
    name: "University of Delhi",
    type: "Central",
    location: {
      city: "New Delhi",
      state: "Delhi",
      lat: 28.6892,
      lng: 77.2140,
      address: "Benito Juarez Marg, South Campus, New Delhi, Delhi 110021",
    },
    courses: ["B.Sc", "B.A.", "B.Com", "B.Tech", "M.Sc", "M.A."],
    admissions: {
      requirements: [
        "CUET-UG for undergraduate programs",
        "Minimum 50% in Class XII (program dependent)",
      ],
      timeline: [
        { phase: "Applications Open", date: "Apr 15" },
        { phase: "Last Date to Apply", date: "May 30" },
        { phase: "Merit List", date: "Jun 20" },
      ],
      applicationUrl: "https://admission.uod.ac.in/",
    },
    contact: {
      phone: "+91-11-27006900",
      email: "registrar@du.ac.in",
      website: "https://www.du.ac.in/",
    },
    imageUrl:
      "https://images.unsplash.com/photo-1554473675-9089f4a0b153?q=80&w=2070&auto=format&fit=crop",
  },
  {
    id: "iitd-01",
    name: "IIT Delhi",
    type: "Government",
    location: {
      city: "New Delhi",
      state: "Delhi",
      lat: 28.5450,
      lng: 77.1926,
      address: "Hauz Khas, New Delhi, Delhi 110016",
    },
    courses: ["B.Tech", "M.Tech", "PhD"],
    admissions: {
      requirements: ["JEE Advanced for B.Tech", "GATE for M.Tech"],
      timeline: [
        { phase: "JEE Advanced", date: "May - Jun" },
        { phase: "JoSAA Counselling", date: "Jun - Jul" },
      ],
      applicationUrl: "https://home.iitd.ac.in/admissions.php",
    },
    contact: {
      phone: "+91-11-2659-1999",
      website: "https://home.iitd.ac.in/",
    },
    imageUrl:
      "https://images.unsplash.com/photo-1559028012-481c04fa702d?q=80&w=2070&auto=format&fit=crop",
  },
  {
    id: "aiims-01",
    name: "AIIMS New Delhi",
    type: "Government",
    location: {
      city: "New Delhi",
      state: "Delhi",
      lat: 28.5672,
      lng: 77.2100,
      address: "Sri Aurobindo Marg, Ansari Nagar, New Delhi, Delhi 110029",
    },
    courses: ["MBBS", "MD/MS", "B.Sc Nursing"],
    admissions: {
      requirements: ["NEET-UG for MBBS", "INICET for PG"],
      timeline: [
        { phase: "NEET-UG", date: "May" },
        { phase: "Counselling", date: "Jun - Aug" },
      ],
      applicationUrl: "https://www.aiimsexams.ac.in/",
    },
    contact: {
      phone: "+91-11-26588500",
      website: "https://www.aiims.edu/",
    },
    imageUrl:
      "https://images.unsplash.com/photo-1504813184591-01572f98c85f?q=80&w=2070&auto=format&fit=crop",
  },
  {
    id: "jnu-01",
    name: "Jawaharlal Nehru University (JNU)",
    type: "Central",
    location: {
      city: "New Delhi",
      state: "Delhi",
      lat: 28.5402,
      lng: 77.1666,
      address: "New Mehrauli Road, New Delhi, Delhi 110067",
    },
    courses: ["B.A.", "M.A.", "M.Sc", "PhD"],
    admissions: {
      requirements: ["CUET-UG/PG (program dependent)"],
      timeline: [
        { phase: "Applications Open", date: "Apr" },
        { phase: "Entrance / CUET", date: "May - Jun" },
      ],
      applicationUrl: "https://www.jnu.ac.in/admissions",
    },
    contact: {
      website: "https://www.jnu.ac.in/",
    },
    imageUrl:
      "https://images.unsplash.com/photo-1519455953755-af066f52f1ea?q=80&w=2070&auto=format&fit=crop",
  },
];

function haversineDistanceKm(a: LatLng, b: LatLng) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const courseOptions = [
  "B.Tech",
  "M.Tech",
  "B.Sc",
  "M.Sc",
  "B.A.",
  "M.A.",
  "B.Com",
  "PhD",
  "MBBS",
  "MD/MS",
  "B.Sc Nursing",
] as const;

const typeOptions = ["Government", "Government Aided", "Central", "State"] as const;

export default function CollegeMapper({
  className,
  style,
  googleMapsApiKey,
  initialLocation,
  colleges = DEFAULT_COLLEGES,
  defaultView = "map",
  onFavoritesChange,
}: CollegeMapperProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [activeTab, setActiveTab] = useState<"map" | "list">(defaultView);
  const [query, setQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState<string | undefined>(undefined);
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [userLocation, setUserLocation] = useState<LatLng | null>(
    initialLocation ?? null
  );
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLocating, setIsLocating] = useState(false);

  // Load favorites from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("cc:favorites");
      if (raw) setFavorites(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("cc:favorites", JSON.stringify(favorites));
    } catch {
      // ignore
    }
    onFavoritesChange?.(favorites);
  }, [favorites, onFavoritesChange]);

  // Load Google Maps script
  useEffect(() => {
    if (!googleMapsApiKey) return;
    if (typeof window === "undefined") return;

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-cc="gmaps"]'
    );
    if (existingScript && window.google) {
      setMapReady(true);
      return;
    }

    (window as any).initCCMap = () => {
      setMapReady(true);
    };

    if (!existingScript) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
        googleMapsApiKey
      )}&libraries=places&callback=initCCMap`;
      script.async = true;
      script.defer = true;
      script.setAttribute("data-cc", "gmaps");
      document.head.appendChild(script);
    }
  }, [googleMapsApiKey]);

  // Initialize Map
  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google) return;
    if (mapInstanceRef.current) return;

    const center: LatLng =
      userLocation ??
      initialLocation ?? {
        lat: colleges[0]?.location.lat ?? 20.5937,
        lng: colleges[0]?.location.lng ?? 78.9629,
      };

    const map = new window.google.maps.Map(mapRef.current, {
      center,
      zoom: userLocation ? 12 : 11,
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
      clickableIcons: false,
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }],
        },
      ],
    });

    mapInstanceRef.current = map;
  }, [mapReady, userLocation, initialLocation, colleges]);

  // Create/Update markers when filtered colleges change
  const filteredColleges = useMemo(() => {
    const q = query.trim().toLowerCase();
    return colleges
      .filter((c) => {
        const matchesQuery =
          !q ||
          c.name.toLowerCase().includes(q) ||
          c.location.city.toLowerCase().includes(q) ||
          c.location.state.toLowerCase().includes(q);
        const matchesCourse = !courseFilter || c.courses.includes(courseFilter as any);
        const matchesType = !typeFilter || c.type === (typeFilter as any);
        return matchesQuery && matchesCourse && matchesType;
      })
      .map((c) => {
        const distance =
          userLocation != null
            ? haversineDistanceKm(userLocation, {
                lat: c.location.lat,
                lng: c.location.lng,
              })
            : null;
        return { college: c, distanceKm: distance };
      })
      .sort((a, b) => {
        if (a.distanceKm == null && b.distanceKm == null) return a.college.name.localeCompare(b.college.name);
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm;
      });
  }, [colleges, query, courseFilter, typeFilter, userLocation]);

  const clearMarkers = () => {
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
  };

  const renderMarkers = useCallback(() => {
    if (!mapInstanceRef.current || !window.google) return;
    clearMarkers();
    filteredColleges.forEach(({ college }) => {
      const marker = new window.google.maps.Marker({
        position: { lat: college.location.lat, lng: college.location.lng },
        map: mapInstanceRef.current,
        title: college.name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: "#0f1420",
          fillOpacity: 0.95,
          strokeColor: "#ffffff",
          strokeOpacity: 1,
          strokeWeight: 2,
          scale: 6,
        },
      });
      marker.addListener("click", () => {
        setSelectedCollege(college);
        mapInstanceRef.current?.panTo(marker.getPosition());
        mapInstanceRef.current?.setZoom(13);
      });
      markersRef.current.push(marker);
    });
  }, [filteredColleges]);

  useEffect(() => {
    renderMarkers();
  }, [renderMarkers]);

  const fitBoundsToMarkers = useCallback(() => {
    if (!mapInstanceRef.current || !window.google) return;
    const bounds = new window.google.maps.LatLngBounds();
    const hasMarkers = markersRef.current.length > 0;
    if (userLocation) {
      bounds.extend(new window.google.maps.LatLng(userLocation.lat, userLocation.lng));
    }
    if (hasMarkers) {
      markersRef.current.forEach((m) => bounds.extend(m.getPosition()));
      mapInstanceRef.current.fitBounds(bounds);
    } else if (userLocation) {
      mapInstanceRef.current.setCenter(userLocation);
      mapInstanceRef.current.setZoom(12);
    }
  }, [userLocation]);

  useEffect(() => {
    const id = setTimeout(() => {
      fitBoundsToMarkers();
    }, 150);
    return () => clearTimeout(id);
  }, [filteredColleges, fitBoundsToMarkers]);

  const handleUseMyLocation = async () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        toast.success("Location detected.");
        setIsLocating(false);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setCenter(loc);
          mapInstanceRef.current.setZoom(13);
          // Add a distinct user marker
          const marker = new window.google.maps.Marker({
            position: loc,
            map: mapInstanceRef.current,
            title: "Your Location",
            icon: {
              path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
              fillColor: "#2563eb",
              fillOpacity: 0.95,
              strokeColor: "#ffffff",
              strokeOpacity: 1,
              strokeWeight: 2,
              scale: 5,
            },
          });
          markersRef.current.push(marker);
        }
      },
      () => {
        toast.error("Unable to retrieve your location.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((x) => x !== id) : [...prev, id];
      toast[exists ? "info" : "success"](
        exists ? "Removed from favorites" : "Saved to favorites"
      );
      return next;
    });
  };

  const directionsUrl = (to: LatLng) => {
    const destination = `${to.lat},${to.lng}`;
    const origin = userLocation ? `${userLocation.lat},${userLocation.lng}` : "";
    const base = "https://www.google.com/maps/dir/?api=1";
    const params = new URLSearchParams();
    params.set("destination", destination);
    if (origin) params.set("origin", origin);
    params.set("travelmode", "driving");
    return `${base}&${params.toString()}`;
  };

  const handleOpenDirections = (to: LatLng) => {
    const url = directionsUrl(to);
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const resetFilters = () => {
    setQuery("");
    setCourseFilter(undefined);
    setTypeFilter(undefined);
  };

  return (
    <section
      className={["w-full max-w-full", className].filter(Boolean).join(" ")}
      style={style}
      aria-label="Nearby Government Colleges with Map"
    >
      <div className="w-full bg-card border border-border rounded-2xl p-4 sm:p-6">
        <header className="flex flex-col gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-primary">
              <University className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg sm:text-xl font-semibold truncate">
                Discover Nearby Colleges
              </h3>
              <p className="text-sm text-muted-foreground">
                Explore government and public institutions near you, compare courses, and apply.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 min-w-0">
                <label htmlFor="search" className="sr-only">
                  Search by college or city
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by college, city, or state"
                    className="pl-9 bg-secondary/50 border-input"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="default"
                  onClick={handleUseMyLocation}
                  disabled={isLocating}
                  className="inline-flex items-center gap-2"
                >
                  <LocateFixed className="h-4 w-4" aria-hidden="true" />
                  {isLocating ? "Locating..." : "Use my location"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={resetFilters}
                  className="hidden sm:inline-flex"
                >
                  Clear
                </Button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="w-full sm:w-1/2">
                <Select
                  onValueChange={(v) => setCourseFilter(v)}
                  value={courseFilter}
                >
                  <SelectTrigger aria-label="Filter by course" className="bg-secondary/50">
                    <SelectValue placeholder="Filter by course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courseOptions.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-1/2">
                <Select
                  onValueChange={(v) => setTypeFilter(v)}
                  value={typeFilter}
                >
                  <SelectTrigger aria-label="Filter by type" className="bg-secondary/50">
                    <SelectValue placeholder="Filter by college type" />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOptions.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </header>

        <div className="mt-4 sm:mt-6">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "map" | "list")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 rounded-xl bg-secondary/60">
              <TabsTrigger value="map" className="data-[state=active]:bg-card data-[state=active]:shadow-sm">
                <Map className="mr-2 h-4 w-4" aria-hidden="true" />
                Map view
              </TabsTrigger>
              <TabsTrigger value="list" className="data-[state=active]:bg-card data-[state=active]:shadow-sm">
                <School className="mr-2 h-4 w-4" aria-hidden="true" />
                List view
              </TabsTrigger>
            </TabsList>

            <TabsContent value="map" className="mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-3">
                  <div
                    ref={mapRef}
                    aria-label="Google Map"
                    className="h-[320px] sm:h-[420px] lg:h-[520px] w-full rounded-xl bg-secondary animate-in fade-in zoom-in-95 duration-300"
                  >
                    {!googleMapsApiKey && (
                      <div className="flex h-full w-full items-center justify-center text-center p-6">
                        <div>
                          <p className="font-medium">Map unavailable</p>
                          <p className="text-sm text-muted-foreground">
                            Provide a Google Maps API key to enable the interactive map.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="lg:col-span-2 min-w-0">
                  <Card className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Nearby Colleges</CardTitle>
                      <CardDescription>
                        {filteredColleges.length} result{filteredColleges.length !== 1 ? "s" : ""}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ul className="max-h-[520px] overflow-y-auto divide-y divide-border">
                        {filteredColleges.map(({ college, distanceKm }) => (
                          <li key={college.id} className="p-4 hover:bg-secondary/40 transition-colors">
                            <div className="flex items-start gap-3">
                              <img
                                src={
                                  college.imageUrl ??
                                  "https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?q=80&w=2070&auto=format&fit=crop"
                                }
                                alt=""
                                className="h-16 w-16 rounded-lg object-cover flex-none"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <h4 className="text-sm font-semibold truncate">{college.name}</h4>
                                  <div className="flex items-center gap-1">
                                    <Badge variant="outline" className="text-[10px]">
                                      {college.type}
                                    </Badge>
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground truncate">
                                  {college.location.city}, {college.location.state}
                                </p>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  {college.courses.slice(0, 3).map((c) => (
                                    <Badge key={c} variant="secondary" className="text-[10px]">
                                      {c}
                                    </Badge>
                                  ))}
                                  {college.courses.length > 3 && (
                                    <span className="text-[10px] text-muted-foreground">
                                      +{college.courses.length - 3} more
                                    </span>
                                  )}
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    className="h-8"
                                    onClick={() => {
                                      setSelectedCollege(college);
                                      if (mapInstanceRef.current && window.google) {
                                        const center = new window.google.maps.LatLng(
                                          college.location.lat,
                                          college.location.lng
                                        );
                                        mapInstanceRef.current.panTo(center);
                                        mapInstanceRef.current.setZoom(13);
                                      }
                                    }}
                                  >
                                    Details
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="default"
                                    className="h-8"
                                    onClick={() =>
                                      handleOpenDirections({
                                        lat: college.location.lat,
                                        lng: college.location.lng,
                                      })
                                    }
                                  >
                                    <Signpost className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                                    Directions
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={favorites.includes(college.id) ? "default" : "secondary"}
                                    className="h-8"
                                    onClick={() => toggleFavorite(college.id)}
                                  >
                                    <MapPinned className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                                    {favorites.includes(college.id) ? "Saved" : "Save"}
                                  </Button>
                                </div>
                              </div>
                            </div>
                            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                              <span className="truncate">
                                {college.location.address}
                              </span>
                              <span className="ml-2 whitespace-nowrap">
                                {distanceKm != null ? `${distanceKm.toFixed(1)} km` : "—"}
                              </span>
                            </div>
                          </li>
                        ))}
                        {filteredColleges.length === 0 && (
                          <li className="p-6 text-sm text-muted-foreground">
                            No colleges match your filters.
                          </li>
                        )}
                      </ul>
                    </CardContent>
                  </Card>
                  {selectedCollege && (
                    <div className="mt-4">
                      <CollegeDetails
                        college={selectedCollege}
                        isFavorite={favorites.includes(selectedCollege.id)}
                        onToggleFavorite={() => toggleFavorite(selectedCollege.id)}
                        onDirections={() =>
                          handleOpenDirections({
                            lat: selectedCollege.location.lat,
                            lng: selectedCollege.location.lng,
                          })
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="list" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredColleges.map(({ college, distanceKm }) => (
                  <Card key={college.id} className="flex flex-col overflow-hidden">
                    <img
                      src={
                        college.imageUrl ??
                        "https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?q=80&w=2070&auto=format&fit=crop"
                      }
                      alt=""
                      className="w-full h-36 object-cover"
                    />
                    <CardHeader className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-base leading-tight">
                          {college.name}
                        </CardTitle>
                        <Badge variant="outline">{college.type}</Badge>
                      </div>
                      <CardDescription className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                        {college.location.city}, {college.location.state}
                        <span className="mx-2">•</span>
                        {distanceKm != null ? `${distanceKm.toFixed(1)} km away` : "Distance N/A"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                      <div className="flex flex-wrap gap-2">
                        {college.courses.slice(0, 5).map((c) => (
                          <Badge key={c} variant="secondary">
                            {c}
                          </Badge>
                        ))}
                        {college.courses.length > 5 && (
                          <span className="text-xs text-muted-foreground">
                            +{college.courses.length - 5} more
                          </span>
                        )}
                      </div>

                      <div className="rounded-lg bg-secondary/50 p-3">
                        <p className="text-xs font-medium mb-2">Admission Requirements</p>
                        <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                          {college.admissions.requirements.map((req, idx) => (
                            <li key={idx} className="break-words">{req}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="rounded-lg bg-secondary/50 p-3">
                        <p className="text-xs font-medium mb-2">Admission Timeline</p>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {college.admissions.timeline.map((t, idx) => (
                            <li key={idx} className="flex items-center justify-between">
                              <span className="mr-2">{t.phase}</span>
                              <span className="text-foreground">{t.date}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="default"
                          onClick={() =>
                            handleOpenDirections({
                              lat: college.location.lat,
                              lng: college.location.lng,
                            })
                          }
                        >
                          <Signpost className="h-4 w-4 mr-2" aria-hidden="true" />
                          Directions
                        </Button>
                        <Button
                          variant={favorites.includes(college.id) ? "default" : "secondary"}
                          onClick={() => toggleFavorite(college.id)}
                        >
                          <MapPinned className="h-4 w-4 mr-2" aria-hidden="true" />
                          {favorites.includes(college.id) ? "Saved" : "Save"}
                        </Button>
                        {college.admissions.applicationUrl && (
                          <Button
                            variant="secondary"
                            onClick={() => {
                              if (typeof window !== "undefined") {
                                window.open(college.admissions.applicationUrl, "_blank", "noopener,noreferrer");
                              }
                            }}
                          >
                            Apply Now
                          </Button>
                        )}
                        {college.contact.website && (
                          <Button
                            variant="secondary"
                            onClick={() => {
                              if (typeof window !== "undefined") {
                                window.open(college.contact.website, "_blank", "noopener,noreferrer");
                              }
                            }}
                          >
                            Website
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {filteredColleges.length === 0 && (
                <div className="p-6 text-sm text-muted-foreground">
                  No colleges match your filters.
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </section>
  );
}

function CollegeDetails({
  college,
  isFavorite,
  onToggleFavorite,
  onDirections,
}: {
  college: College;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onDirections: () => void;
}) {
  return (
    <Card className="border border-border">
      <CardHeader className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base">{college.name}</CardTitle>
            <CardDescription className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="truncate">
                {college.location.address}
              </span>
            </CardDescription>
          </div>
          <Badge variant="outline" className="whitespace-nowrap">{college.type}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <img
              src={
                college.imageUrl ??
                "https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?q=80&w=2070&auto=format&fit=crop"
              }
              alt=""
              className="w-full h-40 object-cover rounded-lg"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Button variant={isFavorite ? "default" : "secondary"} onClick={onToggleFavorite}>
              <MapPinned className="h-4 w-4 mr-2" aria-hidden="true" />
              {isFavorite ? "Saved to Favorites" : "Save to Favorites"}
            </Button>
            <Button variant="default" onClick={onDirections}>
              <Signpost className="h-4 w-4 mr-2" aria-hidden="true" />
              Get Directions
            </Button>
            {college.admissions.applicationUrl && (
              <Button
                variant="secondary"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.open(college.admissions.applicationUrl!, "_blank", "noopener,noreferrer");
                  }
                }}
              >
                Apply Now
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg bg-secondary/50 p-4">
            <h5 className="text-sm font-semibold mb-2">Courses Offered</h5>
            <div className="flex flex-wrap gap-2">
              {college.courses.map((c) => (
                <Badge key={c} variant="secondary">
                  {c}
                </Badge>
              ))}
            </div>
          </div>
          <div className="rounded-lg bg-secondary/50 p-4">
            <h5 className="text-sm font-semibold mb-2">Admission Requirements</h5>
            <ul className="list-disc pl-4 text-sm text-muted-foreground space-y-1">
              {college.admissions.requirements.map((r, idx) => (
                <li key={idx} className="break-words">{r}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg bg-secondary/50 p-4">
            <h5 className="text-sm font-semibold mb-2">Contact</h5>
            <ul className="text-sm text-muted-foreground space-y-1 break-words">
              {college.contact.phone && <li>Phone: {college.contact.phone}</li>}
              {college.contact.email && <li>Email: {college.contact.email}</li>}
              {college.contact.website && (
                <li className="truncate">
                  Website:{" "}
                  <a
                    href={college.contact.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    {college.contact.website}
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="rounded-lg border border-border p-4 bg-card">
          <h5 className="text-sm font-semibold mb-3">Admission Timeline</h5>
          <ol className="space-y-2">
            {college.admissions.timeline.map((t, idx) => (
              <li
                key={idx}
                className="flex items-center justify-between rounded-md bg-secondary/40 px-3 py-2"
              >
                <span className="text-sm">{t.phase}</span>
                <span className="text-sm font-medium">{t.date}</span>
              </li>
            ))}
          </ol>
          {college.admissions.applicationUrl && (
            <div className="mt-3 text-sm">
              Apply via:{" "}
              <a
                href={college.admissions.applicationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Official Application Portal
              </a>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}