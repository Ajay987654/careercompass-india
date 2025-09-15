"use client";

import * as React from "react";
import NavigationHeader from "@/components/NavigationHeader";
import HeroSection from "@/components/HeroSection";
import AptitudeQuizSection from "@/components/AptitudeQuizSection";
import CareerRecommendationsSection from "@/components/CareerRecommendationsSection";
import CollegesMapSection from "@/components/CollegesMapSection";
import ScholarshipsTrackerSection from "@/components/ScholarshipsTrackerSection";
import ChatbotInterface from "@/components/ChatbotInterface";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Compass, GraduationCap, MapPin, School, BotMessageSquare } from "lucide-react";

type MainTab = "quiz" | "recommendations" | "colleges" | "scholarships";

export default function Page() {
  const [activeTab, setActiveTab] = React.useState<MainTab>("quiz");
  const [quizCompletedAt, setQuizCompletedAt] = React.useState<number | null>(null);

  const handleQuizComplete = React.useCallback(() => {
    setQuizCompletedAt(Date.now());
    setActiveTab("recommendations");
  }, []);

  return (
    <div className="min-h-dvh w-full bg-background text-foreground">
      <NavigationHeader brand={<span>CareerCompass</span>} />

      <main className="w-full">
        <HeroSection
          className="border-b"
          ctaLabel="Start your journey"
          onGetStarted={() => setActiveTab("quiz")}
        />

        <div className="mx-auto w-full max-w-6xl px-6 sm:px-8 py-8 sm:py-10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-primary">
                <Compass className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="font-heading text-xl sm:text-2xl font-semibold tracking-tight">
                Your Guidance Hub
              </h2>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setActiveTab("quiz")}>
                <GraduationCap className="mr-2 h-4 w-4" />
                Take Quiz
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab("colleges")}>
                <MapPin className="mr-2 h-4 w-4" />
                Find Colleges
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab("scholarships")}>
                <School className="mr-2 h-4 w-4" />
                Scholarships
              </Button>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <section className="lg:col-span-2 min-w-0">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as MainTab)} className="w-full">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <TabsList className="bg-secondary">
                    <TabsTrigger value="quiz" className="gap-2">
                      <GraduationCap className="h-4 w-4" />
                      Aptitude Quiz
                    </TabsTrigger>
                    <TabsTrigger value="recommendations" className="gap-2">
                      <Compass className="h-4 w-4" />
                      Recommendations
                    </TabsTrigger>
                    <TabsTrigger value="colleges" className="gap-2">
                      <MapPin className="h-4 w-4" />
                      Colleges Map
                    </TabsTrigger>
                    <TabsTrigger value="scholarships" className="gap-2">
                      <School className="h-4 w-4" />
                      Scholarships
                    </TabsTrigger>
                  </TabsList>
                  <div className="text-xs text-muted-foreground px-1">
                    {quizCompletedAt ? `Quiz completed ${new Date(quizCompletedAt).toLocaleString()}` : "Complete the quiz to tailor your guidance"}
                  </div>
                </div>

                <div className="mt-4 space-y-6">
                  <TabsContent value="quiz" className="m-0">
                    <AptitudeQuizSection onComplete={handleQuizComplete} />
                  </TabsContent>

                  <TabsContent value="recommendations" className="m-0">
                    <CareerRecommendationsSection
                      autoLoad
                      defaultTab="streams"
                    />
                  </TabsContent>

                  <TabsContent value="colleges" className="m-0">
                    <CollegesMapSection className="w-full" />
                  </TabsContent>

                  <TabsContent value="scholarships" className="m-0">
                    <ScholarshipsTrackerSection />
                  </TabsContent>
                </div>
              </Tabs>
            </section>

            <aside className="lg:col-span-1 min-w-0 space-y-6">
              <div className={cn("rounded-xl border bg-card shadow-sm")}>
                <div className="flex items-center gap-2 p-4 border-b bg-muted/60">
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-accent text-accent-foreground">
                    <BotMessageSquare className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold leading-tight">Need quick help?</h3>
                    <p className="text-xs text-muted-foreground">
                      Ask our AI for instant guidance
                    </p>
                  </div>
                </div>
                <div className="p-4">
                  <ChatbotInterface mode="widget" />
                </div>
              </div>

              <div className="rounded-xl border bg-card p-4 shadow-sm">
                <h4 className="text-sm font-semibold">How to use CareerCompass</h4>
                <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                  <li>1. Take the Aptitude Quiz to understand your fit.</li>
                  <li>2. Explore personalized streams, courses, and careers.</li>
                  <li>3. Use the Colleges Map to discover nearby options.</li>
                  <li>4. Track scholarships and manage applications.</li>
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <footer className="w-full border-t bg-card">
        <div className="mx-auto max-w-6xl px-6 sm:px-8 py-8">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} CareerCompass. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}