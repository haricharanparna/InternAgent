"use client";

import { useEffect, useState } from "react";
import { STORAGE_FULL } from "@/lib/storage";

// Shown when a save fails because the browser's storage for this site is full.
export default function StorageWarning() {
  const [full, setFull] = useState(false);
  useEffect(() => {
    const on = () => setFull(true);
    window.addEventListener(STORAGE_FULL, on);
    return () => window.removeEventListener(STORAGE_FULL, on);
  }, []);
  if (!full) return null;
  return (
    <div role="alert" className="fixed inset-x-4 top-20 z-50 mx-auto flex max-w-xl items-start gap-3 rounded-md border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900 shadow-lg">
      <span aria-hidden>⚠️</span>
      <p className="flex-1">
        Your browser&apos;s storage for InternAgent is full, so your latest change wasn&apos;t saved. Open Settings (⚙) to save a backup,
        then remove old applications or drafts to make room.
      </p>
      <button onClick={() => setFull(false)} aria-label="Dismiss" className="text-rose-700">✕</button>
    </div>
  );
}
