"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { LogoMark } from "./Logo";

type Message = { role: "user" | "model"; text: string };

const SUGGESTIONS = [
  "Help me prep for a software engineering intern interview",
  "Write a short follow-up email after applying",
  "What skills should I learn next?",
  "How does the fit score work?",
];

// Tiny renderer for **bold** and "- " bullets, built from React elements (no raw HTML).
function Rich({ text }: { text: string }) {
  const bold = (line: string) =>
    line.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>,
    );
  return (
    <>
      {text.split("\n").map((line, i) => {
        const bullet = line.match(/^\s*[-*•]\s+(.*)/);
        if (bullet) return <p key={i} className="flex gap-2"><span>•</span><span>{bold(bullet[1])}</span></p>;
        return line.trim() ? <p key={i}>{bold(line)}</p> : <div key={i} className="h-2" />;
      })}
    </>
  );
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  useEffect(() => {
    if (open) field.current?.focus();
  }, [open]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || sending) return;
    const next: Message[] = [...messages, { role: "user", text: q }];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      let profile = null;
      try { profile = JSON.parse(localStorage.getItem("internagent.profile") || "null"); } catch {}
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, profile }),
      });
      const data = await res.json();
      setMessages([...next, { role: "model", text: res.ok ? data.reply : `⚠️ ${data.error || "Something went wrong."}` }]);
    } catch {
      setMessages([...next, { role: "model", text: "⚠️ Couldn't reach the assistant. Check your connection." }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open && (
        <div
          role="dialog"
          aria-label="InternAgent assistant"
          className="animate-pop-in flex h-[min(34rem,calc(100vh-7rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-surface shadow-2xl"
        >
          <div className="flex items-center justify-between gap-3 bg-blue-600 px-4 py-3 text-white">
            <div className="flex items-center gap-2.5">
              <span className="rounded-xl ring-2 ring-white/40"><LogoMark size={32} /></span>
              <div>
                <p className="text-sm font-bold leading-tight">InternAgent Assistant</p>
                <p className="text-xs text-white/80">Ask about internships, interviews, emails…</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close assistant" className="rounded-lg p-1.5 text-white/90 hover:bg-white/15">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </div>

          <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
            {messages.length === 0 && (
              <div className="animate-fade-in space-y-3">
                <div className="rounded-2xl rounded-tl-md bg-slate-100 px-3.5 py-2.5 text-sm text-slate-800">
                  Hi! 👋 I&apos;m your internship assistant. I can see the profile from your resume, so I can give advice
                  that fits you. What can I help with?
                </div>
                <div className="flex flex-col items-start gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => send(s)} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-left text-xs font-medium text-blue-700 transition hover:bg-blue-100">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`animate-fade-up flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] space-y-1 rounded-2xl px-3.5 py-2.5 text-sm ${
                    m.role === "user"
                      ? "rounded-br-md bg-blue-600 text-white"
                      : "rounded-tl-md bg-slate-100 text-slate-800"
                  }`}
                >
                  {m.role === "user" ? m.text : <Rich text={m.text} />}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex gap-1 rounded-2xl rounded-tl-md bg-slate-100 px-4 py-3 w-fit" aria-label="Assistant is typing">
                {[0, 1, 2].map((d) => (
                  <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${d * 150}ms` }} />
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex items-end gap-2 border-t border-slate-200 p-3"
          >
            <textarea
              ref={field}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
              rows={1}
              placeholder="Ask anything…"
              aria-label="Message"
              className="max-h-28 min-h-10 flex-1 resize-none rounded-xl border border-slate-200 bg-surface px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
            <button type="submit" disabled={!input.trim() || sending} aria-label="Send" className="btn-primary h-10 w-10 shrink-0 p-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" /></svg>
            </button>
          </form>
          <p className="px-3 pb-2 text-center text-[10px] text-slate-400">AI can make mistakes. Double-check important info.</p>
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        aria-label={open ? "Close assistant" : "Open AI assistant"}
        aria-expanded={open}
        className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition hover:scale-105 active:scale-95"
      >
        {!open && <span className="absolute inset-0 animate-ping rounded-full bg-cyan-400 opacity-20" />}
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
            <path d="M12 8.5l.9 1.9 2.1.3-1.5 1.5.3 2.1-1.8-1-1.8 1 .3-2.1L9 10.7l2.1-.3z" fill="currentColor" stroke="none" />
          </svg>
        )}
      </button>
    </div>
  );
}
