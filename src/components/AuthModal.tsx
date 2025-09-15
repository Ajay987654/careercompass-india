"use client";

import React, { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  LogIn,
  UserRoundPlus,
  KeyRound,
  EyeOff,
  UserRound,
  IdCard,
  Vault,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

type FirebaseAPIs = {
  signInWithEmailAndPassword?: (email: string, password: string) => Promise<any>;
  createUserWithEmailAndPassword?: (email: string, password: string) => Promise<any>;
  sendPasswordResetEmail?: (email: string) => Promise<void>;
  updateProfile?: (user: any, data: { displayName?: string }) => Promise<void>;
};

type SocialProviders = {
  google?: () => Promise<any>;
  apple?: () => Promise<any>;
};

export type AuthModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthSuccess?: (user: any) => void;
  firebase?: FirebaseAPIs;
  providers?: SocialProviders;
  defaultTab?: "login" | "register";
  className?: string;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const gradeOptions = [
  { label: "Grade 8", value: "8" },
  { label: "Grade 9", value: "9" },
  { label: "Grade 10", value: "10" },
  { label: "Grade 11", value: "11" },
  { label: "Grade 12", value: "12" },
  { label: "Undergraduate", value: "undergrad" },
  { label: "Other", value: "other" },
];

export default function AuthModal({
  open,
  onOpenChange,
  onAuthSuccess,
  firebase,
  providers,
  defaultTab = "login",
  className,
}: AuthModalProps) {
  const [tab, setTab] = useState<"login" | "register">(defaultTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  // Register fields
  const [name, setName] = useState("");
  const [grade, setGrade] = useState<string | undefined>(undefined);
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  const canUseFirebase = useMemo(
    () => Boolean(firebase?.signInWithEmailAndPassword && firebase?.createUserWithEmailAndPassword),
    [firebase]
  );

  const resetLocalState = useCallback(() => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setName("");
    setGrade(undefined);
    setShowPw(false);
  }, []);

  const handleClose = useCallback(
    (next: boolean) => {
      if (!next) resetLocalState();
      onOpenChange(next);
    },
    [onOpenChange, resetLocalState]
  );

  const handleLogin = async () => {
    if (!isValidEmail(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (!canUseFirebase) {
      toast.info("Demo mode: Firebase not configured.");
      onAuthSuccess?.({ email });
      handleClose(false);
      return;
    }
    try {
      setLoading(true);
      const userCredential = await firebase!.signInWithEmailAndPassword!(email.trim(), password);
      toast.success("Welcome back!");
      onAuthSuccess?.(userCredential?.user ?? userCredential);
      handleClose(false);
    } catch (err: any) {
      const message = err?.message || "Unable to sign in. Please try again.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (name.trim().length < 2) {
      toast.error("Please enter your full name.");
      return;
    }
    if (!grade) {
      toast.error("Please select your grade level.");
      return;
    }
    if (!isValidEmail(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    if (!canUseFirebase) {
      toast.info("Demo mode: Firebase not configured.");
      onAuthSuccess?.({ email, displayName: name, grade });
      handleClose(false);
      return;
    }
    try {
      setLoading(true);
      const userCredential = await firebase!.createUserWithEmailAndPassword!(email.trim(), password);
      if (firebase?.updateProfile) {
        try {
          await firebase.updateProfile(userCredential.user ?? userCredential, { displayName: name.trim() });
        } catch {
          // Non-critical; suppress
        }
      }
      toast.success("Account created successfully.");
      onAuthSuccess?.(userCredential?.user ?? userCredential);
      handleClose(false);
    } catch (err: any) {
      const message = err?.message || "Unable to register. Please try again.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!isValidEmail(email)) {
      toast.error("Enter your email above to reset your password.");
      return;
    }
    if (!firebase?.sendPasswordResetEmail) {
      toast.info("Password reset unavailable in demo mode.");
      return;
    }
    try {
      setLoading(true);
      await firebase.sendPasswordResetEmail(email.trim());
      toast.success("Password reset email sent.");
    } catch (err: any) {
      const message = err?.message || "Unable to send reset email.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSocial = async (provider: "google" | "apple") => {
    const fn = providers?.[provider];
    if (!fn) {
      toast.info("Provider not configured.");
      return;
    }
    try {
      setSocialLoading(provider);
      const res = await fn();
      toast.success("Signed in successfully.");
      onAuthSuccess?.(res?.user ?? res);
      handleClose(false);
    } catch (err: any) {
      const message = err?.message || "Social sign-in failed.";
      toast.error(message);
    } finally {
      setSocialLoading(null);
    }
  };

  const emailDescribedBy = tab === "login" ? "email-helper-login" : "email-helper-register";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className={[
          "w-full max-w-md sm:max-w-lg",
          "bg-card text-card-foreground",
          "border border-border",
          "rounded-2xl md:rounded-[--radius]",
          "p-4 sm:p-6",
          "shadow-lg",
          className || "",
        ].join(" ")}
        aria-describedby="auth-modal-description"
      >
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
            {tab === "login" ? (
              <>
                <LogIn className="size-5 text-foreground/80" aria-hidden="true" />
                Sign in to CareerCompass
              </>
            ) : (
              <>
                <UserRoundPlus className="size-5 text-foreground/80" aria-hidden="true" />
                Create your account
              </>
            )}
          </DialogTitle>
          <DialogDescription id="auth-modal-description" className="text-sm text-muted-foreground">
            Access your aptitude quizzes, recommendations, and saved colleges.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as "login" | "register")}
          className="w-full"
        >
          <TabsList className="grid grid-cols-2 w-full bg-muted/60">
            <TabsTrigger value="login" className="data-[state=active]:bg-card data-[state=active]:text-foreground">
              Login
            </TabsTrigger>
            <TabsTrigger value="register" className="data-[state=active]:bg-card data-[state=active]:text-foreground">
              Register
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 sm:mt-6 space-y-4">
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-center gap-2 bg-surface border-input hover:bg-secondary"
                onClick={() => handleSocial("google")}
                disabled={!!socialLoading || loading}
                aria-label="Continue with Google"
              >
                <Vault className="size-4" aria-hidden="true" />
                {socialLoading === "google" ? "Connecting..." : "Continue with Google"}
              </Button>
              <Button
                variant="outline"
                className="w-full justify-center gap-2 bg-surface border-input hover:bg-secondary"
                onClick={() => handleSocial("apple")}
                disabled={!!socialLoading || loading}
                aria-label="Continue with Apple"
              >
                <Vault className="size-4" aria-hidden="true" />
                {socialLoading === "apple" ? "Connecting..." : "Continue with Apple"}
              </Button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border"></span>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-3 text-muted-foreground">or continue with email</span>
                </div>
              </div>
            </div>

            <TabsContent value="login" className="mt-0 space-y-4">
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="email-login" className="flex items-center gap-2">
                    <UserRound className="size-4 text-muted-foreground" aria-hidden="true" />
                    Email
                  </Label>
                  <Input
                    id="email-login"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={email.length > 0 && !isValidEmail(email)}
                    aria-describedby={emailDescribedBy}
                    className="bg-card border-input"
                  />
                  <p id="email-helper-login" className="text-xs text-muted-foreground">
                    Use the email you registered with.
                  </p>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="password-login" className="flex items-center gap-2">
                    <KeyRound className="size-4 text-muted-foreground" aria-hidden="true" />
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password-login"
                      type={showPw ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10 bg-card border-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((s) => !s)}
                      className="absolute inset-y-0 right-0 px-3 text-muted-foreground hover:text-foreground focus:outline-none"
                      aria-label={showPw ? "Hide password" : "Show password"}
                    >
                      {showPw ? <KeyRound className="size-4" /> : <EyeOff className="size-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    className="text-sm text-foreground hover:underline underline-offset-4"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              <Button
                className="w-full gap-2"
                onClick={handleLogin}
                disabled={loading || !!socialLoading}
              >
                <LogIn className="size-4" aria-hidden="true" />
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </TabsContent>

            <TabsContent value="register" className="mt-0 space-y-4">
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="name-register" className="flex items-center gap-2">
                    <IdCard className="size-4 text-muted-foreground" aria-hidden="true" />
                    Full name
                  </Label>
                  <Input
                    id="name-register"
                    type="text"
                    autoComplete="name"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-card border-input"
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="grade-register" className="flex items-center gap-2">
                    <UserRound className="size-4 text-muted-foreground" aria-hidden="true" />
                    Grade level
                  </Label>
                  <Select value={grade} onValueChange={(v) => setGrade(v)}>
                    <SelectTrigger id="grade-register" className="bg-card border-input">
                      <SelectValue placeholder="Select your grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {gradeOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="email-register" className="flex items-center gap-2">
                    <UserRound className="size-4 text-muted-foreground" aria-hidden="true" />
                    Email
                  </Label>
                  <Input
                    id="email-register"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={email.length > 0 && !isValidEmail(email)}
                    aria-describedby={emailDescribedBy}
                    className="bg-card border-input"
                  />
                  <p id="email-helper-register" className="text-xs text-muted-foreground">
                    We’ll send a verification link to this email.
                  </p>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="password-register" className="flex items-center gap-2">
                    <KeyRound className="size-4 text-muted-foreground" aria-hidden="true" />
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password-register"
                      type={showPw ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10 bg-card border-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((s) => !s)}
                      className="absolute inset-y-0 right-0 px-3 text-muted-foreground hover:text-foreground focus:outline-none"
                      aria-label={showPw ? "Hide password" : "Show password"}
                    >
                      {showPw ? <KeyRound className="size-4" /> : <EyeOff className="size-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="confirm-password-register" className="flex items-center gap-2">
                    <KeyRound className="size-4 text-muted-foreground" aria-hidden="true" />
                    Confirm password
                  </Label>
                  <Input
                    id="confirm-password-register"
                    type={showPw ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-card border-input"
                    aria-invalid={confirmPassword.length > 0 && confirmPassword !== password}
                  />
                </div>
              </div>

              <Button
                className="w-full gap-2"
                onClick={handleRegister}
                disabled={loading || !!socialLoading}
              >
                <UserRoundPlus className="size-4" aria-hidden="true" />
                {loading ? "Creating account..." : "Create account"}
              </Button>
            </TabsContent>
          </div>
        </Tabs>

        <div className="mt-3 text-center text-xs text-muted-foreground break-words">
          By continuing, you agree to CareerCompass terms and acknowledge our privacy policy.
        </div>
      </DialogContent>
    </Dialog>
  );
}