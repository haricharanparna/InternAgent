import type { Job } from "./types";

// All sources are free and public. Boards that fail to load are skipped.
export const GREENHOUSE = [
  "stripe", "airbnb", "databricks", "robinhood", "figma", "discord", "cloudflare", "duolingo",
  "reddit", "pinterest", "instacart", "asana", "dropbox", "coinbase", "lyft", "gitlab", "twilio",
  "affirm", "anthropic", "scaleai", "brex", "chime", "roblox", "samsara", "squarespace",
  "verkada", "waymo", "nuro", "datadog", "mongodb", "elastic", "okta", "toast", "gusto", "flexport",
  "webflow", "airtable", "zscaler", "intercom", "vercel", ];
export const LEVER = ["palantir", "spotify", "zoox", "whoop"];
export const ASHBY = [
  "openai", "ramp", "notion", "linear", "replit", "perplexity", "cohere", "mercury", "posthog", "supabase", "modal", "runway", "elevenlabs", "harvey", "deel", "cursor",
];
// Community-maintained list of thousands of internships (github.com/SimplifyJobs).
export const SIMPLIFY_URL = "https://raw.githubusercontent.com/SimplifyJobs/Summer2027-Internships/dev/.github/scripts/listings.json";

const INTERN_RE = /\b(intern|internship|co-?op)\b/i;
// Upcoming terms only; Summer 2026 and earlier have already started or passed.
export const CURRENT_TERM_RE = /202[7-9]|Fall 2026|Winter 2026/;
export const MAX_AGE_DAYS = 150;

// Keeps the posting's shape: headings and paragraphs become their own lines and
// list items become "• " lines, so the detail view can show real sections.
export function htmlToText(html: string) {
  return html
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/&mdash;|&ndash;/g, "–").replace(/&rsquo;|&lsquo;/g, "'").replace(/&[a-z]+;/g, " ")
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<br\s*\/?>|<\/(p|div|h[1-6]|ul|ol|li|tr)>|<(h[1-6]|p|div)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t\r\f\v]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n•\s*\n/g, "\n• ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

const WORKPLACE: Record<string, Job["workplace"]> = { remote: "Remote", hybrid: "Hybrid", onsite: "On-site", "on-site": "On-site" };
const workplaceOf = (v?: string) => (v ? WORKPLACE[v.toLowerCase()] : undefined);
// "8574 Globalization Platform" → "Globalization Platform"
const teamName = (v?: string) => v?.replace(/^\d+\s+/, "").trim() || undefined;

const titleCase = (slug: string) => slug[0].toUpperCase() + slug.slice(1);

async function getJSON(url: string) {
  // no-store: the Simplify file is ~13 MB, larger than Next's fetch cache allows.
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

const iso = (v: unknown) => {
  const d = typeof v === "number" ? new Date(v < 1e12 ? v * 1000 : v) : typeof v === "string" ? new Date(v) : null;
  return d && !isNaN(d.getTime()) ? d.toISOString() : undefined;
};

type GreenhouseJob = {
  id: number; title: string; absolute_url: string; content: string; first_published?: string; updated_at?: string;
  location?: { name: string }; company_name?: string; application_deadline?: string | null;
  departments?: { name: string }[];
};

const fromGreenhouseJob = (slug: string, j: GreenhouseJob): Job => ({
  id: `gh-${slug}-${j.id}`,
  title: j.title,
  company: j.company_name || titleCase(slug),
  location: j.location?.name || "Unknown",
  url: j.absolute_url,
  source: "greenhouse",
  description: htmlToText(j.content || ""),
  postedAt: iso(j.updated_at || j.first_published),
  team: teamName(j.departments?.[0]?.name),
  deadline: iso(j.application_deadline || undefined),
});

async function fromGreenhouse(slug: string): Promise<Job[]> {
  const data = await getJSON(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`);
  return (data.jobs as GreenhouseJob[]).filter((j) => INTERN_RE.test(j.title)).map((j) => fromGreenhouseJob(slug, j));
}

type LeverJob = {
  id: string; text: string; hostedUrl: string; descriptionPlain?: string; createdAt?: number;
  categories?: { location?: string; team?: string };
  lists?: { text: string; content: string }[];
  additionalPlain?: string;
  workplaceType?: string;
  salaryRange?: { min?: number; max?: number; currency?: string; interval?: string };
};

function leverPay(r?: LeverJob["salaryRange"]) {
  if (!r?.min) return undefined;
  const per = /hour/i.test(r.interval || "") ? "/hr" : /month/i.test(r.interval || "") ? "/month" : /year|annual/i.test(r.interval || "") ? "/year" : "";
  const f = (n: number) => `${r.currency && r.currency !== "USD" ? `${r.currency} ` : "$"}${n.toLocaleString("en-US")}`;
  return r.max && r.max !== r.min ? `${f(r.min)}–${f(r.max)}${per}` : `${f(r.min)}${per}`;
}

const fromLeverJob = (slug: string, j: LeverJob): Job => ({
  id: `lv-${slug}-${j.id}`,
  title: j.text,
  company: titleCase(slug),
  location: j.categories?.location || "Unknown",
  url: j.hostedUrl,
  source: "lever",
  postedAt: iso(j.createdAt),
  description: [
    j.descriptionPlain || "",
    ...(j.lists || []).map((l) => `${l.text}\n${htmlToText(l.content)}`),
    j.additionalPlain || "",
  ].filter(Boolean).join("\n").replace(/\n{2,}/g, "\n").trim(),
  team: teamName(j.categories?.team),
  workplace: workplaceOf(j.workplaceType),
  compensation: leverPay(j.salaryRange),
});

async function fromLever(slug: string): Promise<Job[]> {
  const data: LeverJob[] = await getJSON(`https://api.lever.co/v0/postings/${slug}?mode=json`);
  return data.filter((j) => INTERN_RE.test(j.text)).map((j) => fromLeverJob(slug, j));
}

type AshbyJob = {
  id: string; title: string; location?: string; isRemote?: boolean; jobUrl: string; descriptionPlain?: string; publishedAt?: string;
  team?: string; department?: string; workplaceType?: string;
  compensation?: { compensationTierSummary?: string | null };
};

const fromAshbyJob = (slug: string, j: AshbyJob): Job => ({
  id: `ab-${slug}-${j.id}`,
  title: j.title,
  company: titleCase(slug),
  location: j.isRemote ? `${j.location || ""} (Remote)`.trim() : j.location || "Unknown",
  url: j.jobUrl,
  source: "ashby",
  postedAt: iso(j.publishedAt),
  description: (j.descriptionPlain || "").replace(/\n{2,}/g, "\n").trim(),
  team: teamName(j.team || j.department),
  workplace: workplaceOf(j.workplaceType),
  compensation: j.compensation?.compensationTierSummary || undefined,
});

const ashbyBoard = (slug: string) => getJSON(`https://api.ashbyhq.com/posting-api/job-board/${slug}?includeCompensation=true`);

async function fromAshby(slug: string): Promise<Job[]> {
  const data = await ashbyBoard(slug);
  return (data.jobs as AshbyJob[]).filter((j) => INTERN_RE.test(j.title)).map((j) => fromAshbyJob(slug, j));
}

// Fetches one posting fresh from its own job board, for the detail view: the
// full text (the list view trims it) and whether it's still open. Returns
// null when the board no longer lists it. SimplifyJobs listings return
// undefined, since that list has no per-posting page to check.
export async function fetchOne(id: string): Promise<Job | null | undefined> {
  const m = id.match(/^(gh|lv|ab)-([a-z0-9-]+?)-([A-Za-z0-9-]+)$/);
  if (!m) return undefined;
  const [, kind, slug, jobId] = m;
  const known = { gh: GREENHOUSE, lv: LEVER, ab: ASHBY }[kind as "gh" | "lv" | "ab"];
  if (!known.includes(slug)) return undefined;
  try {
    if (kind === "gh") return fromGreenhouseJob(slug, await getJSON(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs/${jobId}`));
    if (kind === "lv") return fromLeverJob(slug, await getJSON(`https://api.lever.co/v0/postings/${slug}/${jobId}?mode=json`));
    const hit = ((await ashbyBoard(slug)).jobs as AshbyJob[]).find((j) => j.id === jobId);
    return hit ? fromAshbyJob(slug, hit) : null;
  } catch (e) {
    if (/^404 /.test((e as Error).message)) return null;
    throw e;
  }
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
      postedAt: iso(j.date_posted),
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

export const CACHE_MINUTES = CACHE_MS / 60_000;

// Facts about the last refresh, shown on the How it works page.
export type JobsMeta = {
  fetchedAt: string;
  ms: number;
  raw: number;
  duplicates: number;
  sourcesOk: number;
  sourcesFailed: number;
};
let meta: JobsMeta | null = null;
export const jobsMeta = () => meta;

export async function fetchInternships(): Promise<Job[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.jobs;

  const started = Date.now();
  const results = await Promise.allSettled([
    ...GREENHOUSE.map(fromGreenhouse),
    ...LEVER.map(fromLever),
    ...ASHBY.map(fromAshby),
    fromSimplify(),
  ]);
  // Company boards come first, so their richer descriptions win over Simplify duplicates.
  const seen = new Set<string>();
  const jobs: Job[] = [];
  let raw = 0;
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const j of r.value) {
      raw++;
      const key = dedupeKey(j);
      if (seen.has(key)) continue;
      seen.add(key);
      jobs.push(j);
    }
  }
  const ok = results.filter((r) => r.status === "fulfilled").length;
  meta = {
    fetchedAt: new Date().toISOString(),
    ms: Date.now() - started,
    raw,
    duplicates: raw - jobs.length,
    sourcesOk: ok,
    sourcesFailed: results.length - ok,
  };
  // Don't cache an empty result (e.g. every source timed out); retry next request.
  if (jobs.length) cache = { at: Date.now(), jobs };
  return jobs;
}

// Cheap keyword overlap used to pick which jobs are worth sending to the AI.
export function keywordScore(job: Job, terms: string[]) {
  const text = `${job.title} ${job.description}`.toLowerCase();
  return terms.reduce((n, t) => (t && text.includes(t.toLowerCase()) ? n + 1 : n), 0);
}
