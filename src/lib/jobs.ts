import type { Job } from "./types";

// All sources are free and public. Boards that fail to load are skipped.
const GREENHOUSE = [
  "stripe", "airbnb", "databricks", "robinhood", "figma", "discord", "cloudflare", "duolingo",
  "reddit", "pinterest", "instacart", "asana", "dropbox", "coinbase", "lyft", "gitlab", "twilio",
  "affirm", "anthropic", "scaleai", "brex", "chime", "doordash", "roblox", "samsara", "squarespace",
  "verkada", "waymo", "nuro", "datadog", "mongodb", "elastic", "okta", "toast", "gusto", "flexport",
  "webflow", "grammarly", "airtable", "zscaler", "hubspot", "intercom", "vercel", "anduril",
];
const LEVER = ["palantir", "plaid", "spotify", "zoox", "whoop", "attentive"];
const ASHBY = [
  "openai", "ramp", "notion", "linear", "replit", "perplexity", "cohere", "mercury", "retool",
  "posthog", "supabase", "modal", "runway", "elevenlabs", "harvey", "deel", "cursor",
];
// Community-maintained list of thousands of internships (github.com/SimplifyJobs).
const SIMPLIFY_URL = "https://raw.githubusercontent.com/SimplifyJobs/Summer2027-Internships/dev/.github/scripts/listings.json";

const INTERN_RE = /\b(intern|internship|co-?op)\b/i;
// Upcoming terms only; Summer 2026 and earlier have already started or passed.
const CURRENT_TERM_RE = /202[7-9]|Fall 2026|Winter 2026/;
const MAX_AGE_DAYS = 150;

function htmlToText(html: string) {
  return html
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const titleCase = (slug: string) => slug[0].toUpperCase() + slug.slice(1);

async function getJSON(url: string) {
  // no-store: the Simplify file is ~13 MB, larger than Next's fetch cache allows.
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

type GreenhouseJob = {
  id: number; title: string; absolute_url: string; content: string;
  location?: { name: string }; company_name?: string;
};

async function fromGreenhouse(slug: string): Promise<Job[]> {
  const data = await getJSON(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`);
  return (data.jobs as GreenhouseJob[])
    .filter((j) => INTERN_RE.test(j.title))
    .map((j) => ({
      id: `gh-${slug}-${j.id}`,
      title: j.title,
      company: j.company_name || titleCase(slug),
      location: j.location?.name || "Unknown",
      url: j.absolute_url,
      source: "greenhouse",
      description: htmlToText(j.content || ""),
    }));
}

type LeverJob = {
  id: string; text: string; hostedUrl: string; descriptionPlain?: string;
  categories?: { location?: string };
  lists?: { text: string; content: string }[];
};

async function fromLever(slug: string): Promise<Job[]> {
  const data: LeverJob[] = await getJSON(`https://api.lever.co/v0/postings/${slug}?mode=json`);
  return data
    .filter((j) => INTERN_RE.test(j.text))
    .map((j) => ({
      id: `lv-${slug}-${j.id}`,
      title: j.text,
      company: titleCase(slug),
      location: j.categories?.location || "Unknown",
      url: j.hostedUrl,
      source: "lever",
      description: [
        j.descriptionPlain || "",
        ...(j.lists || []).map((l) => `${l.text}: ${htmlToText(l.content)}`),
      ].join(" "),
    }));
}

type AshbyJob = {
  id: string; title: string; location?: string; isRemote?: boolean; jobUrl: string; descriptionPlain?: string;
};

async function fromAshby(slug: string): Promise<Job[]> {
  const data = await getJSON(`https://api.ashbyhq.com/posting-api/job-board/${slug}`);
  return (data.jobs as AshbyJob[])
    .filter((j) => INTERN_RE.test(j.title))
    .map((j) => ({
      id: `ab-${slug}-${j.id}`,
      title: j.title,
      company: titleCase(slug),
      location: j.isRemote ? `${j.location || ""} (Remote)`.trim() : j.location || "Unknown",
      url: j.jobUrl,
      source: "ashby",
      description: j.descriptionPlain || "",
    }));
}

type SimplifyJob = {
  id: string; company_name: string; title: string; url: string; locations: string[];
  terms?: string[]; category?: string; active: boolean; is_visible?: boolean;
  date_posted?: number; sponsorship?: string; degrees?: string[];
};

async function fromSimplify(): Promise<Job[]> {
  const data: SimplifyJob[] = await getJSON(SIMPLIFY_URL);
  const cutoff = Date.now() / 1000 - MAX_AGE_DAYS * 86_400;
  return data
    .filter((j) => j.active && j.is_visible !== false)
    .filter((j) => (j.terms || []).some((t) => CURRENT_TERM_RE.test(t)) || (j.date_posted ?? 0) > cutoff)
    .map((j) => ({
      id: `sj-${j.id}`,
      title: j.title,
      company: j.company_name.trim(),
      location: j.locations?.join("; ") || "Unknown",
      url: j.url,
      source: "simplify",
      // Simplify has no full description, so give the AI what it does know.
      description: [
        j.category && `Category: ${j.category}.`,
        j.terms?.length && `Term: ${j.terms.join(", ")}.`,
        j.degrees?.length && `Degrees: ${j.degrees.join(", ")}.`,
        j.sponsorship && `Visa sponsorship: ${j.sponsorship}.`,
      ].filter(Boolean).join(" "),
    }));
}

const dedupeKey = (j: Job) =>
  `${j.company}|${j.title}`.toLowerCase().replace(/[^a-z0-9|]/g, "");

let cache: { at: number; jobs: Job[] } | null = null;
const CACHE_MS = 60 * 60 * 1000;

export async function fetchInternships(): Promise<Job[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.jobs;

  const results = await Promise.allSettled([
    ...GREENHOUSE.map(fromGreenhouse),
    ...LEVER.map(fromLever),
    ...ASHBY.map(fromAshby),
    fromSimplify(),
  ]);
  // Company boards come first, so their richer descriptions win over Simplify duplicates.
  const seen = new Set<string>();
  const jobs: Job[] = [];
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const j of r.value) {
      const key = dedupeKey(j);
      if (seen.has(key)) continue;
      seen.add(key);
      jobs.push(j);
    }
  }
  cache = { at: Date.now(), jobs };
  return jobs;
}

// Cheap keyword overlap used to pick which jobs are worth sending to the AI.
export function keywordScore(job: Job, terms: string[]) {
  const text = `${job.title} ${job.description}`.toLowerCase();
  return terms.reduce((n, t) => (t && text.includes(t.toLowerCase()) ? n + 1 : n), 0);
}
