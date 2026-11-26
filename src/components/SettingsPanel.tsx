"use client";

import { useEffect, useRef, useState } from "react";
import { A11Y_KEY, DEFAULT_A11Y, applyA11y, type A11ySettings } from "@/lib/a11y";

const TOGGLES: { key: Exclude<keyof A11ySettings, "textSize">; label: string; hint: string }[] = [
  { key: "highContrast", label: "High contrast", hint: "Darker text and stronger borders" },
  { key: "readableFont", label: "Readable font", hint: "Atkinson Hyperlegible, designed for low vision" },
  { key: "wideSpacing", label: "Wider spacing", hint: "More space between letters, words and lines" },
  { key: "reduceMotion", label: "Reduce motion", hint: "Turn off animations" },
  { key: "strongFocus", label: "Strong focus outlines", hint: "Bold outline on the element you tab to" },
];

const SIZES: { id: A11ySettings["textSize"]; label: string }[] = [
  { id: "normal", label: "A" },
  { id: "large", label: "A+" },
  { id: "xlarge", label: "A++" },
];

export default function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const [s, setS] = useState<A11ySettings>(DEFAULT_A11Y);
  const panel = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      setS({ ...DEFAULT_A11Y, ...JSON.parse(localStorage.getItem(A11Y_KEY) || "{}") });
    } catch {}
  }, []);

  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLElement>("button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); button.current?.focus(); }
    };
    const onClick = (e: MouseEvent) => {
      if (!panel.current?.contains(e.target as Node) && !button.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("mousedown", onClick); };
  }, [open]);

  function update(patch: Partial<A11ySettings>) {
    // Build on the latest state so quick successive changes don't overwrite each other.
    setS((prev) => {
      const next = { ...prev, ...patch };
      applyA11y(next);
      try { localStorage.setItem(A11Y_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  return (
    <div className="relative">
      <button
        ref={button}
        onClick={() => setOpen(!open)}
        aria-label="Accessibility settings"
        aria-expanded={open}
        title="Settings"
        className={`flex h-9 w-9 items-center justify-center rounded-xl border bg-surface transition hover:text-slate-900 ${open ? "border-blue-300 text-blue-600" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
      >
        <svg className={`transition-transform duration-500 ${open ? "rotate-90" : ""}`} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      {open && (
        <div
          ref={panel}
          role="dialog"
          aria-label="Accessibility settings"
          className="animate-pop-in absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-surface p-4 shadow-2xl"
        >
          <p className="text-sm font-bold text-slate-900">Accessibility</p>
          <p className="text-xs text-slate-500">Saved on this device.</p>

          <div className="mt-4">
            <p className="text-sm font-medium text-slate-700">Text size</p>
            <div className="mt-2 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1" role="radiogroup" aria-label="Text size">
              {SIZES.map((z) => (
                <button
                  key={z.id}
                  role="radio"
                  aria-checked={s.textSize === z.id}
                  onClick={() => update({ textSize: z.id })}
                  className={`rounded-lg py-1.5 text-sm font-bold transition ${s.textSize === z.id ? "bg-surface text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                >
                  {z.label}
                </button>
              ))}
            </div>
          </div>

          <ul className="mt-4 space-y-1">
            {TOGGLES.map((t) => (
              <li key={t.key}>
                <button
                  role="switch"
                  aria-checked={s[t.key]}
                  onClick={() => update({ [t.key]: !s[t.key] })}
                  className="flex w-full items-center justify-between gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-slate-50"
                >
                  <span>
                    <span className="block text-sm font-medium text-slate-800">{t.label}</span>
                    <span className="block text-xs text-slate-500">{t.hint}</span>
                  </span>
                  <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${s[t.key] ? "bg-blue-600" : "bg-slate-300"}`}>
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${s[t.key] ? "left-[22px]" : "left-0.5"}`} />
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <button onClick={() => update(DEFAULT_A11Y)} className="mt-3 w-full rounded-xl py-2 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800">
            Reset to defaults
          </button>

          <div className="mt-3 border-t border-slate-200 pt-3">
            <p className="text-xs font-semibold text-slate-700">Your data</p>
            <p className="mt-0.5 text-xs text-slate-500">Everything lives in this browser. Save a backup to move it to another device.</p>
            <StorageMeter />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button onClick={exportData} className="rounded-md border border-slate-300 px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">⬇ Save backup</button>
              <label className="cursor-pointer rounded-md border border-slate-300 px-2 py-1.5 text-center text-xs font-medium text-slate-700 hover:bg-slate-50">
                ⬆ Restore
                <input type="file" accept="application/json,.json" className="sr-only" onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
              </label>
            </div>
            <button onClick={() => { try { localStorage.removeItem("internagent.onboarded"); window.dispatchEvent(new CustomEvent("internagent:prefs", { detail: "internagent.onboarded" })); } catch {} }} className="mt-2 w-full rounded-md py-1.5 text-xs text-slate-600 hover:bg-slate-50">Show the getting-started guide again</button>
            <button onClick={clearData} className="mt-2 w-full rounded-md py-1.5 text-xs text-rose-700 hover:bg-rose-50">Delete all my data from this browser</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Backup, restore and delete (all keys start with "internagent.") ----------
const PREFIX = "internagent.";
function exportData() {
  const data: Record<string, unknown> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(PREFIX)) {
      try { data[k] = JSON.parse(localStorage.getItem(k) || "null"); } catch { data[k] = localStorage.getItem(k); }
    }
  }
  const blob = new Blob([JSON.stringify({ app: "InternAgent", version: 1, savedAt: new Date().toISOString(), data }, null, 2)], { type: "application/json" });
  const link = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `internagent-backup-${new Date().toISOString().slice(0, 10)}.json` });
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
async function importData(file: File) {
  try {
    const parsed = JSON.parse(await file.text());
    if (parsed?.app !== "InternAgent" || typeof parsed.data !== "object") throw new Error();
    const keys = Object.keys(parsed.data).filter((k) => k.startsWith(PREFIX));
    if (!confirm(`Restore ${keys.length} saved item${keys.length === 1 ? "" : "s"} from this backup? This replaces what's in this browser now.`)) return;
    for (const k of keys) localStorage.setItem(k, typeof parsed.data[k] === "string" ? parsed.data[k] : JSON.stringify(parsed.data[k]));
    location.reload();
  } catch {
    alert("That file isn't an InternAgent backup.");
  }
}
function clearData() {
  if (!confirm("Delete your profile, applications, resume drafts and settings from this browser? This can't be undone unless you saved a backup.")) return;
  Object.keys(localStorage).filter((k) => k.startsWith(PREFIX)).forEach((k) => localStorage.removeItem(k));
  location.reload();
}

// How much of the browser's storage InternAgent uses. Browsers allow about 5 MB
// per site; past that, new saves fail, so warn early.
const LIMIT_CHARS = 5_000_000;
function StorageMeter() {
  const [used, setUsed] = useState<number | null>(null);
  useEffect(() => {
    try {
      let n = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)!;
        if (k.startsWith(PREFIX)) n += k.length + (localStorage.getItem(k) || "").length;
      }
      setUsed(n);
    } catch { setUsed(null); }
  }, []);
  if (used === null) return null;
  const pct = Math.min(100, Math.round((used / LIMIT_CHARS) * 100));
  const kb = used < 1_000_000 ? `${Math.max(1, Math.round(used / 1000))} KB` : `${(used / 1_000_000).toFixed(1)} MB`;
  return (
    <div className="mt-2">
      <div className="flex justify-between text-[11px] text-slate-500"><span>Storage used</span><span>{kb} of about 5 MB ({pct}%)</span></div>
      <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-label="Browser storage used" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full rounded-full ${pct >= 80 ? "bg-rose-500" : "bg-blue-500"}`} style={{ width: `${Math.max(pct, 1)}%` }} />
      </div>
      {pct >= 80 && <p className="mt-1 text-[11px] text-rose-700">Almost full. Save a backup, then remove old applications so new changes can still be saved.</p>}
    </div>
  );
}
