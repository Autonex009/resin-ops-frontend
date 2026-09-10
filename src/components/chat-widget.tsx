"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2, MessageSquare, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Role = "user" | "assistant";
type Message = { role: Role; content: string; error?: boolean };

const SUGGESTIONS = [
  "How is plan attainment this month?",
  "Which streams are near their capacity ceiling?",
  "How many batches are behind schedule?",
];

// Render the small subset of Markdown the model uses (bold + bullet lists)
// so replies look presentable instead of showing raw ** and - characters.
function renderInline(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let idx = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    nodes.push(<strong key={`${keyBase}-b${idx++}`}>{match[1]}</strong>);
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function MarkdownMessage({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];

  const flushBullets = () => {
    if (bullets.length === 0) return;
    const at = blocks.length;
    blocks.push(
      <ul key={`ul-${at}`} className="my-1 list-disc space-y-0.5 pl-4">
        {bullets.map((b, i) => (
          <li key={i}>{renderInline(b, `li-${at}-${i}`)}</li>
        ))}
      </ul>,
    );
    bullets = [];
  };

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const bullet = line.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      bullets.push(bullet[1]);
    } else if (line === "") {
      flushBullets();
    } else {
      flushBullets();
      const at = blocks.length;
      blocks.push(
        <p key={`p-${at}`}>{renderInline(line, `p-${at}`)}</p>,
      );
    }
  }
  flushBullets();

  return <div className="space-y-1.5">{blocks}</div>;
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, open]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const next: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: data?.error ?? "Something went wrong.", error: true },
        ]);
      } else {
        setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
      }
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Couldn't reach the assistant. Try again.", error: true },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Launcher */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open assistant"
          className="fixed bottom-5 right-5 z-50 flex size-13 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-1 ring-foreground/10 transition-transform hover:scale-105"
        >
          <MessageSquare className="size-5.5" />
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 flex h-[560px] max-h-[calc(100vh-2.5rem)] w-[380px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
          <header className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                <MessageSquare className="size-4" />
              </span>
              <div className="leading-tight">
                <div className="text-sm font-semibold text-foreground">Ops Assistant</div>
                <div className="text-[11px] text-muted-foreground">Answers from this month&apos;s data</div>
              </div>
            </div>
            <Button variant="ghost" size="icon" aria-label="Close assistant" onClick={() => setOpen(false)}>
              <X className="size-4" />
            </Button>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col justify-center gap-3">
                <p className="text-sm text-muted-foreground">
                  Ask about plan attainment, capacity, batches or commitments.
                </p>
                <div className="flex flex-col gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      className="rounded-lg border border-border px-3 py-2 text-left text-xs text-foreground transition-colors hover:bg-muted"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div
                  key={i}
                  className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
                >
                  <div
                    className={[
                      "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                      m.role === "user"
                        ? "whitespace-pre-wrap bg-primary text-primary-foreground"
                        : m.error
                          ? "whitespace-pre-wrap bg-destructive/10 text-destructive"
                          : "bg-muted text-foreground",
                    ].join(" ")}
                  >
                    {m.role === "assistant" && !m.error ? (
                      <MarkdownMessage text={m.content} />
                    ) : (
                      m.content
                    )}
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" /> Thinking…
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t border-border p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about this month…"
              className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            />
            <Button type="submit" size="icon" disabled={loading || !input.trim()} aria-label="Send">
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
