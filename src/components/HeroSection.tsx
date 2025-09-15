"use client";

import Image from "next/image";
import Link from "next/link";
import { GraduationCap, Briefcase, Telescope } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface HeroSectionProps {
  className?: string;
  headline?: string;
  subtext?: string;
  ctaLabel?: string;
  ctaHref?: string;
  onGetStarted?: () => void;
  mediaUrl?: string;
}

const defaultMedia =
  "https://images.unsplash.com/photo-1571260899304-425eee4c7efc?auto=format&fit=crop&w=1400&q=60";

export default function HeroSection({
  className,
  headline = "Discover your ideal career path with confidence",
  subtext = "CareerCompass is India’s premier career and education advisory platform. We help students uncover strengths, explore opportunities, and choose the right courses and colleges with personalised guidance.",
  ctaLabel = "Start your journey",
  ctaHref,
  onGetStarted,
  mediaUrl = defaultMedia,
}: HeroSectionProps) {
  const CTA = () => {
    const btn = (
      <Button
        size="lg"
        className="h-11 px-6 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors"
        aria-label={ctaLabel}
        onClick={onGetStarted}
      >
        {ctaLabel}
      </Button>
    );
    if (ctaHref) {
      return (
        <Link href={ctaHref} aria-label={ctaLabel}>
          {btn}
        </Link>
      );
    }
    return btn;
  };

  return (
    <section
      role="banner"
      aria-labelledby="hero-title"
      className={cn(
        "w-full bg-background",
        "rounded-none",
        className
      )}
    >
      <div
        className={cn(
          "w-full max-w-6xl mx-auto",
          "px-6 sm:px-8",
          "py-10 sm:py-14 md:py-16"
        )}
      >
        <div
          className={cn(
            "relative w-full",
            "grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10",
            "items-center"
          )}
        >
          {/* Content */}
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-accent text-accent-foreground px-3 py-1 text-xs font-medium mb-4 shadow-sm">
              <GraduationCap className="h-4 w-4" aria-hidden="true" />
              <span className="truncate">India’s trusted guidance for students</span>
            </div>

            <h1
              id="hero-title"
              className="font-heading text-3xl sm:text-4xl md:text-5xl leading-tight tracking-tight text-foreground"
            >
              {headline}
            </h1>

            <p className="mt-4 text-sm sm:text-base md:text-lg text-muted-foreground max-w-prose">
              {subtext}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <CTA />
              <div
                className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground"
                aria-label="Key outcomes"
              >
                <Briefcase className="h-4 w-4" aria-hidden="true" />
                <span className="min-w-0">Career clarity</span>
                <span className="text-muted-foreground/50">•</span>
                <Telescope className="h-4 w-4" aria-hidden="true" />
                <span className="min-w-0">Personalised roadmap</span>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs sm:text-sm">
              <div className="rounded-lg bg-card shadow-sm border border-border px-4 py-3">
                <div className="font-medium text-foreground">For Students</div>
                <div className="text-muted-foreground mt-1">
                  Stream, course, and college guidance
                </div>
              </div>
              <div className="rounded-lg bg-card shadow-sm border border-border px-4 py-3">
                <div className="font-medium text-foreground">For Parents</div>
                <div className="text-muted-foreground mt-1">
                  Informed decisions with expert advice
                </div>
              </div>
              <div className="rounded-lg bg-card shadow-sm border border-border px-4 py-3">
                <div className="font-medium text-foreground">For Schools</div>
                <div className="text-muted-foreground mt-1">
                  Workshops and counselling programs
                </div>
              </div>
            </div>
          </div>

          {/* Media */}
          <div className="min-w-0">
            <div className="relative group">
              <div className="absolute inset-0 -z-10 blur-2xl opacity-70 group-hover:opacity-90 transition-opacity">
                <div className="h-full w-full rounded-2xl bg-gradient-to-tr from-chart-1/40 via-chart-3/30 to-chart-5/30" />
              </div>
              <div className="relative rounded-2xl overflow-hidden bg-card border border-border shadow-md">
                <Image
                  src={mediaUrl}
                  alt="Students exploring career options with guidance"
                  width={1200}
                  height={900}
                  priority
                  className="w-full h-auto object-cover"
                />
                {/* Overlay badge strip */}
                <div className="absolute bottom-3 left-3 right-3">
                  <div className="flex flex-wrap items-center gap-2 rounded-lg bg-background/80 backdrop-blur px-3 py-2 border border-border shadow-sm">
                    <GraduationCap className="h-4 w-4 text-foreground" aria-hidden="true" />
                    <span className="text-xs sm:text-sm text-foreground">Explore streams</span>
                    <span className="hidden sm:inline text-muted-foreground">•</span>
                    <Briefcase className="h-4 w-4 text-foreground hidden sm:inline" aria-hidden="true" />
                    <span className="hidden sm:inline text-xs sm:text-sm text-foreground">
                      Build career plans
                    </span>
                    <span className="hidden md:inline text-muted-foreground">•</span>
                    <Telescope className="h-4 w-4 text-foreground hidden md:inline" aria-hidden="true" />
                    <span className="hidden md:inline text-xs sm:text-sm text-foreground">
                      Discover opportunities
                    </span>
                  </div>
                </div>
              </div>
            </div>
            {/* Assistive text to ensure wrapping and prevent overflow */}
            <p className="sr-only break-words">
              Start with an assessment, get personalised recommendations, and create a
              confident plan for your future studies and career.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}