"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Menu,
  LogIn,
  CircleUser,
  IdCard,
  PanelLeftClose,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

import type { User as FirebaseUser } from "firebase/auth";
import {
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  type Auth,
} from "firebase/auth";

export interface NavigationHeaderProps {
  className?: string;
  style?: React.CSSProperties;
  auth?: Auth | null;
  onSignIn?: () => Promise<void> | void;
  onSignOut?: () => Promise<void> | void;
  brand?: React.ReactNode;
}

export default function NavigationHeader({
  className,
  style,
  auth = null,
  onSignIn,
  onSignOut,
  brand,
}: NavigationHeaderProps) {
  const [user, setUser] = React.useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = React.useState(false);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  // Resolve auth instance lazily (client-only)
  const authRef = React.useRef<Auth | null>(null);

  React.useEffect(() => {
    let unsub = () => {};
    try {
      const a = auth ?? getAuth();
      authRef.current = a;
      unsub = onAuthStateChanged(a, (u) => {
        setUser(u);
        setAuthReady(true);
      });
    } catch (e) {
      // No Firebase app initialized; gracefully degrade
      setAuthReady(true);
      authRef.current = null;
    }
    return () => unsub();
  }, [auth]);

  const handleSignIn = React.useCallback(async () => {
    if (onSignIn) {
      await onSignIn();
      return;
    }
    const a = authRef.current;
    if (!a) {
      toast.error("Authentication is not available. Please try again later.");
      return;
    }
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(a, provider);
      toast.success("Signed in successfully");
    } catch (err: any) {
      toast.error(err?.message ?? "Sign in failed");
    }
  }, [onSignIn]);

  const handleSignOut = React.useCallback(async () => {
    if (onSignOut) {
      await onSignOut();
      return;
    }
    const a = authRef.current;
    if (!a) {
      toast.error("Authentication is not available. Please try again later.");
      return;
    }
    try {
      await signOut(a);
      toast.success("Signed out");
    } catch (err: any) {
      toast.error(err?.message ?? "Sign out failed");
    }
  }, [onSignOut]);

  const displayName =
    user?.displayName ||
    user?.email?.split("@")[0] ||
    user?.email ||
    undefined;

  function initials(name?: string) {
    if (!name) return "CC";
    const parts = name.trim().split(" ").filter(Boolean);
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
    return (first + last).toUpperCase() || "U";
    }

  return (
    <header
      className={cn(
        "w-full bg-card text-foreground border-b border-border shadow-sm",
        className
      )}
      style={style}
      role="banner"
    >
      <nav
        aria-label="Primary"
        className="w-full"
      >
        <div className="mx-auto w-full px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between gap-3">
            {/* Left: Brand */}
            <div className="min-w-0 flex items-center gap-3">
              <Link
                href="/"
                className="flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
                aria-label="CareerCompass Home"
              >
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-md bg-secondary text-primary ring-1 ring-border"
                  aria-hidden="true"
                >
                  <span className="font-heading text-sm font-bold">CC</span>
                </div>
                <span className="font-heading text-lg sm:text-xl font-semibold tracking-tight truncate">
                  {brand ?? "CareerCompass"}
                </span>
              </Link>
            </div>

            {/* Right: Auth controls (Desktop) */}
            <div className="hidden md:flex items-center gap-2">
              {!authReady ? (
                <>
                  <div className="h-9 w-24 animate-pulse rounded-md bg-muted" />
                  <div className="h-9 w-28 animate-pulse rounded-md bg-muted" />
                </>
              ) : user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-10 px-2 sm:px-3 gap-2 rounded-md hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="Open user menu"
                    >
                      <Avatar className="h-8 w-8">
                        {user.photoURL ? (
                          <AvatarImage src={user.photoURL} alt={displayName ?? "User"} />
                        ) : (
                          <AvatarFallback className="bg-secondary text-primary">
                            {initials(displayName)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <span className="max-w-[12rem] sm:max-w-[16rem] min-w-0 truncate text-sm font-medium">
                        {displayName}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-56"
                  >
                    <DropdownMenuLabel className="flex items-center gap-2">
                      <CircleUser className="h-4 w-4 text-muted-foreground" />
                      Account
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <button
                        type="button"
                        className="w-full flex items-center gap-2 text-left"
                        // Intentionally no navigation until route exists
                        aria-label="View profile"
                      >
                        <IdCard className="h-4 w-4" />
                        <span>Profile</span>
                      </button>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <button
                        type="button"
                        className="w-full flex items-center gap-2 text-left text-destructive"
                        onClick={handleSignOut}
                        aria-label="Sign out"
                      >
                        <PanelLeftClose className="h-4 w-4" />
                        <span>Sign out</span>
                      </button>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="h-9 rounded-md"
                    onClick={handleSignIn}
                  >
                    <LogIn className="mr-2 h-4 w-4" />
                    Log in
                  </Button>
                  <Button
                    className="h-9 rounded-md bg-primary text-primary-foreground hover:opacity-95"
                    onClick={handleSignIn}
                  >
                    Create account
                  </Button>
                </div>
              )}
            </div>

            {/* Mobile: Hamburger */}
            <div className="md:hidden">
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-10 w-10 rounded-md hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Open menu"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="w-[300px] sm:w-[360px] p-0"
                  aria-label="Mobile menu"
                >
                  <SheetHeader className="px-4 py-3 border-b border-border">
                    <SheetTitle className="flex items-center gap-2">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-md bg-secondary text-primary ring-1 ring-border"
                        aria-hidden="true"
                      >
                        <span className="font-heading text-sm font-bold">CC</span>
                      </div>
                      <span className="font-heading text-lg font-semibold">
                        {brand ?? "CareerCompass"}
                      </span>
                    </SheetTitle>
                  </SheetHeader>
                  <div className="p-4">
                    {!authReady ? (
                      <div className="flex flex-col gap-3">
                        <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
                        <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
                      </div>
                    ) : user ? (
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            {user.photoURL ? (
                              <AvatarImage src={user.photoURL} alt={displayName ?? "User"} />
                            ) : (
                              <AvatarFallback className="bg-secondary text-primary">
                                {initials(displayName)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{displayName}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {user.email}
                            </p>
                          </div>
                        </div>
                        <Separator />
                        <div className="flex flex-col gap-2">
                          <Button
                            variant="ghost"
                            className="justify-start gap-2"
                            onClick={() => setSheetOpen(false)}
                            aria-label="Profile"
                          >
                            <IdCard className="h-4 w-4" />
                            Profile
                          </Button>
                          <Button
                            variant="ghost"
                            className="justify-start gap-2 text-destructive"
                            onClick={async () => {
                              await handleSignOut();
                              setSheetOpen(false);
                            }}
                            aria-label="Sign out"
                          >
                            <PanelLeftClose className="h-4 w-4" />
                            Sign out
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <Button
                          className="w-full h-10 rounded-md bg-primary text-primary-foreground hover:opacity-95"
                          onClick={async () => {
                            await handleSignIn();
                            setSheetOpen(false);
                          }}
                        >
                          <LogIn className="mr-2 h-4 w-4" />
                          Log in
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full h-10 rounded-md"
                          onClick={async () => {
                            await handleSignIn();
                            setSheetOpen(false);
                          }}
                        >
                          Create account
                        </Button>
                      </div>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}