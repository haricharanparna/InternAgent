// Calls to InternAgent's own API. A request that never reached the server (a
// dropped connection, a new version going live) is retried twice, and failures
// come back as plain sentences instead of "Failed to fetch".

const OFFLINE = "Couldn't reach InternAgent. Check your internet connection and try again.";

export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  for (let i = 0; ; i++) {
    try {
      return await fetch(input, init);
    } catch (e) {
      if ((e as Error)?.name === "AbortError") throw e;
      if (i >= 2) throw new Error(OFFLINE);
      await new Promise((r) => setTimeout(r, 1200 * (i + 1)));
    }
  }
}

// Reads a JSON reply; a timeout or error page (HTML) becomes { error: "…" }.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function readJSON(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return { error: res.status === 504 || res.status === 408 ? "The AI took too long to answer. Please try again." : `Something went wrong on the server (${res.status}). Please try again.` };
  }
}

// Big, slow-to-build replies (all internships, market numbers) are kept in the
// browser's Cache Storage. A saved copy is shown at once and refreshed in the
// background; onFresh gets the new data when it arrives.
const CACHE = "internagent-data-v1";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getFast<T = any>(url: string, onFresh?: (data: T) => void): Promise<T> {
  const load = async () => {
    const res = await apiFetch(url);
    const data = await readJSON(res);
    if (!res.ok) throw new Error(data.error || "Couldn't load this right now.");
    try { const c = await caches.open(CACHE); await c.put(url, new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } })); } catch {}
    return data as T;
  };
  try {
    const hit = typeof caches !== "undefined" ? await (await caches.open(CACHE)).match(url) : undefined;
    if (hit) {
      const saved = (await hit.json()) as T;
      load().then((d) => onFresh?.(d)).catch(() => {});
      return saved;
    }
  } catch {}
  return load();
}
