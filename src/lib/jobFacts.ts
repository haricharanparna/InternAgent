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

// Hourly pay as postings usually write it: "$45/hr", "$40 - $50 per hour",
// "Hourly Rate $54 — $60 USD", "Internship $46 — $46 USD". Two- or three-digit
// amounts only, so annual salaries ($120,000) and "$124 trillion" never match.
const AMT = String.raw`\$\s?(\d{2,3}(?:\.\d{2})?)(?![\d,])`;
const RANGE = String.raw`${AMT}(?:\s?(?:-|–|—|to)\s?${AMT})?`;
const PAY_HOURLY = new RegExp(String.raw`${RANGE}\s?(?:USD)?\s?(?:\/|per|an?)\s?(?:hr|hour)\b`, "i");
const PAY_LABELED = new RegExp(String.raw`(?:hourly|pay range|internship|rate)[^$]{0,40}${RANGE}\s?USD\b`, "i");
const PAY_RANGE_USD = new RegExp(String.raw`${AMT}\s?(?:-|–|—)\s?${AMT}\s?USD\b`, "i");

function findPay(text: string) {
  const m = text.match(PAY_HOURLY) || text.match(PAY_LABELED) || text.match(PAY_RANGE_USD);
  if (!m) return undefined;
  const nums = m.slice(1).filter(Boolean).map(Number);
  if (!nums.length || nums.some((n) => n < 10 || n > 250)) return undefined;
  const lo = Math.min(...nums), hi = Math.max(...nums);
  const f = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
  return lo === hi ? `${f(lo)}/hr` : `${f(lo)}–${f(hi)}/hr`;
}

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

// Exported so the jobs API can keep pay that sits past its description cut-off.
export { findPay };

// SimplifyJobs uses a few spellings for the same category; fold them together.
const CATEGORY_ALIASES: Record<string, string> = {
  "software engineering": "Software",
  "data science, ai & machine learning": "AI/ML/Data",
  "product management": "Product",
  "quantitative finance": "Quant",
  "hardware engineering": "Hardware",
};
function normalizeCategory(c?: string) {
  return c ? CATEGORY_ALIASES[c.toLowerCase()] || c : undefined;
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
    category: simplify ? normalizeCategory(pick(d, "Category")) : undefined,
    term: pick(d, "Term") || all.match(TERM_RE)?.[0],
    degrees: pick(d, "Degrees"),
    sponsorship: d.match(/Visa sponsorship: (.+)\.$/)?.[1]?.trim(),
    pay: findPay(d.replace(/&mdash;|&ndash;/g, "–")),
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
