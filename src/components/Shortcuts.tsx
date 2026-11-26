"use client";

import { useEffect, useRef, useState } from "react";
import { useFocusTrap } from "@/lib/useFocusTrap";

const KEYS: [string, string][] = [
  ["/", "Jump to the search box"],
  ["Esc", "Clear the search box, or close the open window"],
  ["Enter", "Save the search to your recent searches"],
  ["Tab / Shift+Tab", "Move between buttons (stays inside an open window)"],
  ["?", "Show this list"],
];

// Press "?" (when not typing) to see the keyboard shortcuts.
export default function Shortcuts() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "?" || e.ctrlKey || e.metaKey || e.altKey) return;
      if ((e.target as HTMLElement).closest("input, textarea, select, [contenteditable=true]")) return;
      e.preventDefault();
      setOpen((o) => !o);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  if (!open) return null;
  return <Dialog onClose={() => setOpen(false)} />;
}

function Dialog({ onClose }: { onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  useFocusTrap(box);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div ref={box} role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" className="w-full max-w-sm rounded-xl bg-surface p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Keyboard shortcuts</h2>
          <button onClick={onClose} aria-label="Close" className="text-slate-500">✕</button>
        </div>
        <dl className="mt-3 space-y-2 text-sm">
          {KEYS.map(([k, v]) => (
            <div key={k} className="flex items-baseline gap-3">
              <dt className="w-28 shrink-0"><kbd className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono text-xs text-slate-800">{k}</kbd></dt>
              <dd className="text-slate-700">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
