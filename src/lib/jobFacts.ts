import type { Job } from "./types";

// Everything shown on a job card is read straight from the posting data:
// no AI and nothing guessed, so the card can't misstate a fact.

export type JobFacts = {
  sourceLabel: string;
  category?: string;
  term?: string;
  degrees?: string;
  sponsorship?: string;
  pay?: string;
  workplace?: "Remote" | "Hybrid" | "On-site";
  where: string;
  snippet?: string;
  domain?: string;
};

const pick = (text: string, label: string) => text.match(new RegExp(`${label}: ([^.]+)\\.`))?.[1]?.trim();

const PAY_RE =
  /\$\s?\d{1,3}(?:[.,]\d{1,3})?(?:\s?(?:-|–|to)\s?\$?\s?\d{1,3}(?:[.,]\d{1,3})?)?\s?(?:\/|per|an?)\s?(?:hr|hour)\b/i;

const TERM_RE = /\b(?:summer|fall|winter|spring)\s+20\d\d\b/i;

function shortPlaces(location: string) {
  const places = location.split(/;\s*/).filter(Boolean);
  if (places.length <= 2) return places.join(" · ") || "Location not listed";
  return `${places[0]} + ${places.length - 1} more`;
}

// Picks the sentence most likely to describe the internship itself rather
// than the company boilerplate many postings open with.
function snippetOf(description: string) {
  const text = description
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&[a-z]+;|&#\d+;/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length < 120) return undefined;
  // Split on sentence ends so a snippet never starts mid-word.
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z0-9"“(])/).filter((s) => s.length >= 40 && s.length <= 320);
  const best =
    sentences.find((s) => /\b(you will|you'll|as an? .*intern|this intern|interns? will|in this role)\b/i.test(s)) ||
    sentences[0];
  if (!best) return text.slice(0, 220) + "…";
  const s = best.trim();
  return s.length > 240 ? s.slice(0, 237) + "…" : s;
}

export function jobFacts(job: Job): JobFacts {
  const d = job.description;
  const all = `${job.title} ${d}`;
  const simplify = job.source === "simplify";
  let domain: string | undefined;
  try {
    const host = new URL(job.url).hostname.replace(/^www\./, "");
    // Hiring-platform hosts (jobs.lever.co etc.) say nothing useful, so label those plainly.
    domain = /greenhouse\.io|lever\.co|ashbyhq\.com|myworkdayjobs\.com|simplify\.jobs/.test(host) ? "View posting" : host;
  } catch {}

  const workplace = /\bhybrid\b/i.test(all)
    ? "Hybrid"
    : /\bremote\b/i.test(job.location) || /\bfully remote\b/i.test(d)
      ? "Remote"
      : /\b(on-?site|in-?office|in person)\b/i.test(d)
        ? "On-site"
        : undefined;

  return {
    sourceLabel: simplify ? "SimplifyJobs list" : "Company job board",
    category: simplify ? pick(d, "Category") : undefined,
    term: pick(d, "Term") || all.match(TERM_RE)?.[0],
    degrees: pick(d, "Degrees"),
    sponsorship: pick(d, "Visa sponsorship"),
    pay: d.match(PAY_RE)?.[0].replace(/\s+/g, " "),
    workplace,
    where: shortPlaces(job.location),
    snippet: simplify ? undefined : snippetOf(d),
    domain,
  };
}

// Profile skills that literally appear in the posting (whole-word match).
export function skillsMentioned(job: Job, skills: string[], max = 6) {
  const text = ` ${job.title} ${job.description} `.toLowerCase();
  const esc = (s: string) => s.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return skills
    .filter((s) => s.trim().length > 1 && new RegExp(`(^|[^a-z0-9])${esc(s.trim())}([^a-z0-9]|$)`).test(text))
    .slice(0, max);
}
