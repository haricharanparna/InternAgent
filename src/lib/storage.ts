// Saves to the browser and tells the page when the browser's storage is full,
// so the student sees a warning instead of changes silently not being saved.
export const STORAGE_FULL = "internagent:storage-full";

export function safeSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    const name = (e as { name?: string })?.name || "";
    if (/quota/i.test(name) || /quota/i.test(String(e))) {
      try { window.dispatchEvent(new Event(STORAGE_FULL)); } catch {}
    }
    return false;
  }
}
