"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BotMessageSquare,
  MessageCircleDashed,
  MessageCircleMore,
  MessageCircleQuestionMark,
  MessageSquare,
  MessageSquareDot,
  MessageSquareMore,
  MessageSquarePlus,
  MessageSquareReply,
  MessageSquareText,
  MessagesSquare,
  MessageSquareX,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

type Role = "user" | "assistant";

interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  error?: boolean;
  bookmarked?: boolean;
}

interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
}

interface ChatbotInterfaceProps {
  className?: string;
  mode?: "full" | "widget";
  initialPromptSuggestions?: string[];
  placeholder?: string;
  onExportConversation?: (conv: Conversation) => void;
}

const STORAGE_KEYS = {
  conversations: "cc_chatbot_conversations",
  activeId: "cc_chatbot_active_id",
  bookmarks: "cc_chatbot_bookmarks",
} as const;

const DEFAULT_SUGGESTIONS = [
  "What are the top career options after 12th Science in India?",
  "Help me choose between B.Tech CSE and BCA based on my interests.",
  "Which certifications help for a data analyst role?",
  "How can I prepare for campus placements effectively?",
];

const FAQ_SUGGESTIONS = [
  "What is the difference between PGDM and MBA?",
  "How to build a strong resume with no experience?",
  "Which government exams are good after graduation?",
  "How do I pick electives aligned to my career goals?",
];

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function summarizeTitle(messages: Message[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return "New conversation";
  const text = firstUser.content.trim().replace(/\s+/g, " ");
  return text.length > 50 ? text.slice(0, 50) + "…" : text || "New conversation";
}

export default function ChatbotInterface({
  className,
  mode = "full",
  initialPromptSuggestions = DEFAULT_SUGGESTIONS,
  placeholder = "Ask about careers, courses, exams, or colleges…",
  onExportConversation,
}: ChatbotInterfaceProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [collapsed, setCollapsed] = useState(mode === "widget");
  const [exporting, setExporting] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const areaRef = useRef<HTMLDivElement | null>(null);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) || null,
    [conversations, activeId]
  );

  // LocalStorage hydration
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEYS.conversations);
      const savedActive = window.localStorage.getItem(STORAGE_KEYS.activeId);
      const parsed: Conversation[] = saved ? JSON.parse(saved) : [];
      setConversations(parsed);
      setActiveId(savedActive || parsed[0]?.id || null);
    } catch {
      // ignore
    }
  }, []);

  // Persist conversations and activeId
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        STORAGE_KEYS.conversations,
        JSON.stringify(conversations)
      );
      if (activeId) {
        window.localStorage.setItem(STORAGE_KEYS.activeId, activeId);
      }
    } catch {
      // ignore
    }
  }, [conversations, activeId]);

  // Auto scroll to bottom when messages update
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    // small delay to allow layout
    const t = setTimeout(() => {
      el.scrollTop = el.scrollHeight;
    }, 20);
    return () => clearTimeout(t);
  }, [activeConversation?.messages?.length, typing, loading]);

  // Create new conversation
  const newConversation = useCallback(() => {
    const id = uid();
    const conv: Conversation = {
      id,
      title: "New conversation",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };
    setConversations((prev) => [conv, ...prev]);
    setActiveId(id);
    setInput("");
  }, []);

  // Ensure at least one conversation exists
  useEffect(() => {
    if (!activeConversation && conversations.length === 0) {
      newConversation();
    }
  }, [activeConversation, conversations.length, newConversation]);

  const updateActiveConversation = useCallback(
    (updater: (c: Conversation) => Conversation) => {
      setConversations((prev) =>
        prev.map((c) => (c.id === activeId ? updater(c) : c))
      );
    },
    [activeId]
  );

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim();
    if (!content || !activeConversation || loading) return;

    setLoading(true);
    setTyping(false);

    const userMsg: Message = {
      id: uid(),
      role: "user",
      content,
      timestamp: Date.now(),
    };

    updateActiveConversation((c) => ({
      ...c,
      messages: [...c.messages, userMsg],
      title: c.messages.length === 0 ? summarizeTitle([userMsg]) : c.title,
      updatedAt: Date.now(),
    }));
    setInput("");

    // Call API with graceful fallbacks
    try {
      setTyping(true);
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            // Only include last 15 for context to keep payload small
            ...activeConversation.messages.slice(-15),
            userMsg,
          ].map((m) => ({ role: m.role, content: m.content })),
          source: "career-compass",
        }),
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      // Try streaming text
      let assistantContent = "";
      if (res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          assistantContent += decoder.decode(value, { stream: true });
          // progressively update last assistant draft
          updateActiveConversation((c) => {
            const draft: Message = {
              id: "draft-" + userMsg.id,
              role: "assistant",
              content: assistantContent,
              timestamp: Date.now(),
            };
            const withoutDraft = c.messages.filter((m) => m.id !== draft.id);
            return { ...c, messages: [...withoutDraft, draft], updatedAt: Date.now() };
          });
        }
        // finalize message id
        updateActiveConversation((c) => {
          const msgs = c.messages.map((m) =>
            m.id === "draft-" + userMsg.id
              ? { ...m, id: uid(), timestamp: Date.now() }
              : m
          );
          return { ...c, messages: msgs, updatedAt: Date.now() };
        });
      } else {
        // Fallback JSON
        const data = await res.json();
        const assistantMsg: Message = {
          id: uid(),
          role: "assistant",
          content:
            typeof data?.message === "string" && data.message.trim().length > 0
              ? data.message
              : "I’m here to help with career, education, and course guidance. Could you please rephrase your question?",
          timestamp: Date.now(),
        };
        updateActiveConversation((c) => ({
          ...c,
          messages: [...c.messages, assistantMsg],
          updatedAt: Date.now(),
        }));
      }
    } catch (err) {
      const errorMsg: Message = {
        id: uid(),
        role: "assistant",
        content:
          "Sorry, I couldn’t reach the AI service right now. Please check your connection and try again.",
        timestamp: Date.now(),
        error: true,
      };
      updateActiveConversation((c) => ({
        ...c,
        messages: [...c.messages, errorMsg],
        updatedAt: Date.now(),
      }));
      toast.error("Failed to get a response from the chatbot.");
    } finally {
      setTyping(false);
      setLoading(false);
    }
  }

  function clearConversation() {
    if (!activeConversation) return;
    updateActiveConversation((c) => ({ ...c, messages: [], updatedAt: Date.now(), title: "New conversation" }));
    toast.success("Conversation cleared.");
  }

  function deleteConversation(id: string) {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) {
      setActiveId((prev) => {
        const next = conversations.find((c) => c.id !== id)?.id || null;
        return next;
      });
    }
  }

  function toggleBookmark(messageId: string) {
    updateActiveConversation((c) => {
      const msgs = c.messages.map((m) =>
        m.id === messageId ? { ...m, bookmarked: !m.bookmarked } : m
      );
      return { ...c, messages: msgs, updatedAt: Date.now() };
    });
  }

  function copyToClipboard(text: string) {
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success("Copied to clipboard"))
      .catch(() => toast.error("Copy failed"));
  }

  function exportConversation(conv: Conversation) {
    setExporting(true);
    try {
      const mdLines: string[] = [];
      mdLines.push(`# CareerCompass Chat - ${conv.title}`);
      mdLines.push("");
      for (const m of conv.messages) {
        const who = m.role === "user" ? "You" : "CareerCompass AI";
        const time = new Date(m.timestamp).toLocaleString();
        mdLines.push(`## ${who} • ${time}`);
        mdLines.push("");
        mdLines.push(m.content);
        mdLines.push("");
        mdLines.push("---");
        mdLines.push("");
      }
      const blob = new Blob([mdLines.join("\n")], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `careercompass-chat-${conv.id}.md`;
      a.click();
      URL.revokeObjectURL(url);
      onExportConversation?.(conv);
      toast.success("Conversation exported.");
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  }

  const filteredHistory = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => {
      if (c.title.toLowerCase().includes(q)) return true;
      return c.messages.some(
        (m) => m.content.toLowerCase().includes(q)
      );
    });
  }, [conversations, historySearch]);

  const canSend = input.trim().length > 0 && !loading;

  // Render
  return (
    <div
      className={cn(
        "w-full max-w-full bg-card rounded-lg border shadow-sm",
        "flex flex-col overflow-hidden",
        mode === "widget" ? "sm:max-w-md" : "",
        className
      )}
      aria-label="Career guidance chatbot"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-secondary border-b">
        <div className="flex items-center gap-2 min-w-0">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <BotMessageSquare className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-semibold leading-tight truncate">
              CareerCompass Chat
            </h3>
            <p className="text-xs text-muted-foreground truncate">
              Ask anything about careers, education, and courses
            </p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1">
          {mode === "widget" && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={collapsed ? "Open chat" : "Collapse chat"}
                    onClick={() => setCollapsed((c) => !c)}
                  >
                    <MessagesSquare className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Toggle</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="New conversation"
                  onClick={newConversation}
                >
                  <MessageSquarePlus className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Dialog open={showHistory} onOpenChange={setShowHistory}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Open history">
                      <MessageSquare className="h-5 w-5" />
                    </Button>
                  </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent>History</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Conversations</DialogTitle>
                <DialogDescription>
                  Search and switch between previous chats
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Search by title or content…"
                  aria-label="Search conversations"
                />
                <div className="max-h-80 overflow-y-auto rounded-md border">
                  {filteredHistory.length === 0 ? (
                    <div className="p-6 text-sm text-muted-foreground text-center">
                      No conversations found.
                    </div>
                  ) : (
                    <ul className="divide-y">
                      {filteredHistory.map((c) => (
                        <li key={c.id} className="flex items-center gap-2 p-3">
                          <button
                            className={cn(
                              "text-left w-full min-w-0",
                              "hover:underline"
                            )}
                            onClick={() => {
                              setActiveId(c.id);
                              setShowHistory(false);
                            }}
                          >
                            <div className="font-medium truncate">{c.title}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {new Date(c.updatedAt).toLocaleString()}
                            </div>
                          </button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label="Conversation options">
                                <MessageCircleMore className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuLabel>Options</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => exportConversation(c)}
                              >
                                <MessageSquareReply className="mr-2 h-4 w-4" />
                                Export
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => deleteConversation(c.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <MessageSquareX className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <DialogFooter className="sm:justify-start mt-2">
                <Button variant="secondary" onClick={() => setShowHistory(false)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Chat options">
                <MessageSquareMore className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Conversation</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  if (activeConversation) exportConversation(activeConversation);
                }}
                disabled={!activeConversation || exporting}
              >
                <MessageSquareReply className="mr-2 h-4 w-4" />
                Export current
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={clearConversation}
                disabled={!activeConversation || (activeConversation?.messages.length ?? 0) === 0}
                className="text-destructive focus:text-destructive"
              >
                <MessageSquareX className="mr-2 h-4 w-4" />
                Clear messages
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Collapsible body for widget mode */}
      {mode === "widget" && collapsed ? (
        <div className="p-4 text-sm text-muted-foreground">
          Tap the toggle to start chatting.
        </div>
      ) : (
        <>
          {/* Suggestions */}
          {activeConversation && activeConversation.messages.length === 0 && (
            <div className="px-4 pt-4">
              <div className="rounded-lg border bg-muted p-3">
                <div className="flex items-center gap-2 mb-2">
                  <MessageCircleQuestionMark className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium">Quick start prompts</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {initialPromptSuggestions.slice(0, 4).map((s, i) => (
                    <Button
                      key={i}
                      variant="secondary"
                      className="justify-start h-auto py-2 px-3 text-left"
                      onClick={() => sendMessage(s)}
                    >
                      <MessageSquareText className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="text-sm">{s}</span>
                    </Button>
                  ))}
                </div>
                <Separator className="my-3" />
                <div className="flex flex-wrap gap-2">
                  {FAQ_SUGGESTIONS.map((f, i) => (
                    <Button
                      key={i}
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 rounded-full bg-accent/50 hover:bg-accent text-foreground"
                      onClick={() => sendMessage(f)}
                    >
                      <MessageSquareDot className="h-3.5 w-3.5 mr-2 text-primary" />
                      <span className="text-xs">{f}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="px-0">
            <div
              ref={areaRef}
              className={cn(
                "w-full max-w-full overflow-y-auto",
                "px-4",
                "min-h-[240px]",
                mode === "full" ? "max-h-[60vh]" : "max-h-[50vh]"
              )}
              aria-live="polite"
            >
              <div className="py-4 space-y-4">
                {activeConversation?.messages.map((m) => (
                  <MessageBubble
                    key={m.id}
                    message={m}
                    onCopy={() => copyToClipboard(m.content)}
                    onBookmark={() => toggleBookmark(m.id)}
                  />
                ))}
                {typing && (
                  <TypingBubble />
                )}
              </div>
              <div ref={scrollRef} />
            </div>
          </div>

          {/* Composer */}
          <div className="border-t bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/70">
            <div className="p-3">
              <div className="flex items-end gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={placeholder}
                  className="min-h-[44px] max-h-36 resize-y bg-background"
                  aria-label="Message input"
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.keyCode === 13) && !e.shiftKey) {
                      e.preventDefault();
                      if (canSend) sendMessage();
                    }
                  }}
                />
                <div className="flex flex-col items-stretch gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => sendMessage()}
                          disabled={!canSend}
                          aria-label="Send message"
                        >
                          <MessageSquareReply className="h-4 w-4 mr-2" />
                          Send
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Cmd/Ctrl + Enter</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (activeConversation) exportConversation(activeConversation);
                    }}
                    disabled={!activeConversation || (activeConversation?.messages.length ?? 0) === 0 || exporting}
                    aria-label="Export conversation"
                  >
                    <MessageSquareReply className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">
                  Tips: Be specific about your interests, location, and qualifications for tailored guidance.
                </p>
                {activeConversation && activeConversation.messages.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearConversation}
                    aria-label="Clear conversation"
                    className="text-destructive hover:text-destructive"
                  >
                    <MessageSquareX className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MessageBubble({
  message,
  onCopy,
  onBookmark,
}: {
  message: Message;
  onCopy: () => void;
  onBookmark: () => void;
}) {
  const isUser = message.role === "user";
  return (
    <div className={cn("w-full max-w-full flex", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("flex items-start gap-3 w-full max-w-[90%] sm:max-w-[75%]")}>
        {!isUser && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary">
            <BotMessageSquare className="h-4 w-4 text-primary" aria-hidden="true" />
          </div>
        )}
        <div className={cn("min-w-0 flex-1")}>
          <div
            className={cn(
              "rounded-lg px-3 py-2 text-sm leading-relaxed break-words",
              isUser
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground border"
            )}
          >
            <div className="whitespace-pre-wrap break-words">
              {message.content}
            </div>
          </div>
          <div className={cn("flex items-center gap-2 mt-1", isUser ? "justify-end" : "justify-start")}>
            <span className="text-[11px] text-muted-foreground">{formatTime(message.timestamp)}</span>
            {message.error && (
              <span className="text-[11px] text-destructive">error</span>
            )}
            {!isUser && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="xs" className="h-6 px-2" aria-label="Message actions">
                    <MessageCircleMore className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-40">
                  <DropdownMenuItem onClick={onCopy}>
                    <MessageSquareText className="mr-2 h-4 w-4" />
                    Copy
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onBookmark}>
                    <MessageSquareMore className="mr-2 h-4 w-4" />
                    {message.bookmarked ? "Unbookmark" : "Bookmark"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        {isUser && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary">
            <MessageCircleMore className="h-4 w-4 text-primary" aria-hidden="true" />
          </div>
        )}
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="w-full max-w-full flex justify-start">
      <div className="flex items-start gap-3 w-full max-w-[90%] sm:max-w-[75%]">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary">
          <BotMessageSquare className="h-4 w-4 text-primary" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="rounded-lg px-3 py-2 text-sm bg-muted border inline-flex items-center gap-2">
            <MessageCircleDashed className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">AI is typing</span>
            <span className="inline-flex gap-1 ml-1">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/70 animate-pulse"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/70 animate-pulse [animation-delay:120ms]"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/70 animate-pulse [animation-delay:240ms]"></span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}