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
