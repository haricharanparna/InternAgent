"use client";

import { useEffect, useRef, useState } from "react";
import { toOpportunity, type TrackedApp } from "@/lib/tracker";
import type { AnswerFeedback, InterviewQuestion, Profile } from "@/lib/types";
import { bumpUsage } from "@/lib/usage";

// Practice interview: likely questions for this posting, a place to answer
// (typed or spoken), and honest STAR feedback on each answer.

const KIND_LABEL: Record<InterviewQuestion["kind"], string> = {
  behavioral: "Behavioral",
  technical: "Technical",
  role: "Why this role",
  gap: "Skill gap",
};

const post = async <T,>(body: unknown): Promise<T> => {
  const res = await fetch("/api/interview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
};

type Props = { app: TrackedApp; profile: Profile; onUpdate: (id: string, patch: Partial<TrackedApp>) => void };

export default function InterviewPrep({ app, profile, onUpdate }: Props) {
  const prep = app.prep;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<number | null>(0);

  async function load() {
    setBusy(true);
    setError("");
    try {
      const { questions } = await post<{ questions: InterviewQuestion[] }>({ mode: "questions", profile, opportunity: toOpportunity(app) });
      onUpdate(app.id, { prep: { questions, answers: {}, feedback: {}, generatedAt: new Date().toISOString() } });
      setOpen(0);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!prep) {
    return (
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-slate-600">
          Get the questions this interviewer is most likely to ask, based on the posting and your resume. Practice an answer by typing
          or speaking, and get feedback on its structure (Situation, Task, Action, Result) without the AI adding anything you didn&apos;t say.
        </p>
        <button onClick={load} disabled={busy} className="btn-primary">{busy ? "Writing questions…" : "🎤 Get my practice questions"}</button>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {busy && <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-12 w-full" />)}</div>}
      </div>
    );
  }

  const answered = Object.keys(prep.feedback).length;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600">
          <b className="text-slate-900">{answered}/{prep.questions.length}</b> practiced. Aim for 1–2 minutes per answer.
        </p>
        <button onClick={() => { if (confirm("Replace these questions and your practice answers?")) load(); }} disabled={busy} className="text-sm text-slate-500 underline underline-offset-2 hover:text-slate-800">
          {busy ? "Writing…" : "↻ New questions"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <ol className="space-y-2">
        {prep.questions.map((q, i) => (
          <li key={i} className="rounded-md border border-slate-200">
            <button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} className="flex w-full items-start gap-3 p-3 text-left">
              <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${prep.feedback[i] ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>
                {prep.feedback[i] ? "✓" : i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="tag mr-2">{KIND_LABEL[q.kind] || q.kind}</span>
                <span className="font-medium text-slate-900">{q.q}</span>
              </span>
              {prep.feedback[i] && <span className="shrink-0 text-xs text-slate-500">{prep.feedback[i].score}/5</span>}
            </button>
            {open === i && (
              <Practice
                q={q}
                answer={prep.answers[i] || ""}
                feedback={prep.feedback[i]}
                onAnswer={(text) => onUpdate(app.id, { prep: { ...prep, answers: { ...prep.answers, [i]: text } } })}
                onFeedback={(fb) => onUpdate(app.id, { prep: { ...prep, feedback: { ...prep.feedback, [i]: fb } } })}
                getFeedback={(answer) => post<{ feedback: AnswerFeedback }>({ mode: "feedback", profile, opportunity: toOpportunity(app), question: q.q, answer })}
              />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

// Minimal typing for the browser's built-in speech recognition (Chrome, Edge, Safari).
type Recognition = { continuous: boolean; interimResults: boolean; lang: string; start(): void; stop(): void; onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null; onend: (() => void) | null };

function Practice({ q, answer, feedback, onAnswer, onFeedback, getFeedback }: {
  q: InterviewQuestion;
  answer: string;
  feedback?: AnswerFeedback;
  onAnswer: (t: string) => void;
  onFeedback: (f: AnswerFeedback) => void;
  getFeedback: (answer: string) => Promise<{ feedback: AnswerFeedback }>;
}) {
  const [text, setText] = useState(answer);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);
  const rec = useRef<Recognition | null>(null);
  const base = useRef("");

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    setCanSpeak(!!(w.SpeechRecognition || w.webkitSpeechRecognition));
    return () => rec.current?.stop();
  }, []);

  function toggleMic() {
    if (listening) { rec.current?.stop(); return; }
    const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = navigator.language || "en-US";
    base.current = text ? text.trimEnd() + " " : "";
    r.onresult = (e) => {
      let finals = "", interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finals += res[0].transcript;
        else interim += res[0].transcript;
      }
      setText(base.current + finals + interim);
    };
    r.onend = () => { setListening(false); setText((t) => { onAnswer(t); return t; }); };
    rec.current = r;
    r.start();
    setListening(true);
  }

  async function check() {
    setBusy(true);
    setError("");
    onAnswer(text);
    try {
      const { feedback } = await getFeedback(text);
      bumpUsage("answersPracticed");
      onFeedback(feedback);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const seconds = Math.round(words / 2.3); // about 140 words per minute when speaking

  return (
    <div className="space-y-3 border-t border-slate-200 p-3">
      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <p className="rounded-md bg-slate-50 px-3 py-2 text-slate-600"><b className="text-slate-800">Why they ask:</b> {q.why}</p>
        <p className="rounded-md bg-blue-50 px-3 py-2 text-slate-700"><b className="text-slate-900">Draw on:</b> {q.useThis}</p>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => onAnswer(text)}
        rows={6}
        placeholder={canSpeak ? "Type your answer, or press 🎙 and say it out loud like you would in the interview." : "Type your answer the way you'd say it."}
        className="field leading-relaxed"
        aria-label={`Your answer to: ${q.q}`}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={check} disabled={busy || words < 8} className="btn-primary px-4 py-2">{busy ? "Reading your answer…" : feedback ? "↻ Get new feedback" : "Get feedback"}</button>
        {canSpeak && (
          <button onClick={toggleMic} className={`btn-secondary ${listening ? "border-rose-400 text-rose-700" : ""}`} aria-pressed={listening}>
            {listening ? "■ Stop recording" : "🎙 Answer out loud"}
          </button>
        )}
        <span className={`text-xs ${seconds > 150 ? "text-amber-700" : "text-slate-500"}`}>
          {words} words · about {seconds < 60 ? `${seconds} s` : `${Math.floor(seconds / 60)} min ${seconds % 60} s`} spoken{seconds > 150 ? " (a bit long; aim for under 2 minutes)" : ""}
        </span>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {feedback && <FeedbackView fb={feedback} onUse={(t) => { setText(t); onAnswer(t); }} />}
    </div>
  );
}

function FeedbackView({ fb, onUse }: { fb: AnswerFeedback; onUse: (t: string) => void }) {
  const parts: [keyof AnswerFeedback["star"], string][] = [["situation", "Situation"], ["task", "Task"], ["action", "Action"], ["result", "Result"]];
  return (
    <div className="animate-fade-in space-y-3 rounded-md border border-slate-200 bg-slate-50/60 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-serif text-2xl text-slate-900">{fb.score}/5</span>
        <div className="flex flex-wrap gap-1.5" aria-label="STAR structure">
          {parts.map(([k, label]) => (
            <span key={k} className={`rounded px-2 py-0.5 text-xs font-medium ${fb.star[k] ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
              {fb.star[k] ? "✓" : "✗"} {label}
            </span>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="font-semibold text-slate-800">What works</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-600">{fb.strengths.map((s) => <li key={s}>{s}</li>)}</ul>
        </div>
        <div>
          <p className="font-semibold text-slate-800">Make it stronger</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-600">{fb.improve.map((s) => <li key={s}>{s}</li>)}</ul>
        </div>
      </div>
      <div>
        <p className="font-semibold text-slate-800">A tighter version, using only what you said</p>
        <p className="mt-1 whitespace-pre-line rounded-md bg-surface p-3 leading-relaxed text-slate-700">{fb.stronger}</p>
        <button onClick={() => onUse(fb.stronger)} className="mt-2 text-sm font-medium text-blue-700 hover:underline">Use this as my answer</button>
        <p className="mt-1 text-xs text-slate-500">Anything in [brackets] is something only you know. Fill it in, then practice saying it out loud.</p>
      </div>
    </div>
  );
}
