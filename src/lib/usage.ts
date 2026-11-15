// Counts of what this visitor has done, kept only in their browser.
// Nothing is sent to a server; the Impact tab reads these back.

export const USAGE_KEY = "internagent.usage";

export type Usage = {
  resumesRead: number;
  postingsScored: number;
  resumesTailored: number;
  rolesExplained: number;
};

export const EMPTY_USAGE: Usage = { resumesRead: 0, postingsScored: 0, resumesTailored: 0, rolesExplained: 0 };

export function readUsage(): Usage {
  try {
    return { ...EMPTY_USAGE, ...JSON.parse(localStorage.getItem(USAGE_KEY) || "{}") };
  } catch {
    return { ...EMPTY_USAGE };
  }
}

export function bumpUsage(key: keyof Usage, by = 1) {
  try {
    const u = readUsage();
    u[key] += by;
    localStorage.setItem(USAGE_KEY, JSON.stringify(u));
  } catch {}
}
