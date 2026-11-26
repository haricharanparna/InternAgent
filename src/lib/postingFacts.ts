import type { Job } from "./types";
import { jobFacts } from "./jobFacts.ts";

// Everything in the internship detail view's "Key facts" and "From the posting"
// sections is read straight from the posting with plain code: no AI. Each fact
// keeps the sentence it came from, so the student can check it.

export type PostingFact = { key: string; icon: string; label: string; value: string; quote?: string; tone?: "good" | "warn" };
export type SectionKind = "role" | "requirements" | "preferred" | "benefits" | "about" | "other";
export type PostingSection = { kind: SectionKind; heading: string; items: string[] };

const MON = "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";
const DAY = String.raw`(?:\s\d{1,2}(?:st|nd|rd|th)?)?`;
const YEAR = String.raw`(?:,?\s20\d\d)?`;

// Months are matched case-sensitively so "you may" never reads as a date.
const DATE_RANGE = new RegExp(String.raw`\b${MON}${DAY}${YEAR}\s?(?:-|–|—|to|through|until)\s?${MON}${DAY}${YEAR}\b`);
const LENGTH_WEEKS = /\b(\d{1,2})(?:\s?(?:-|–|to)\s?(\d{1,2}))?[\s-]weeks?\b/i;
const LENGTH_MONTHS = /\b(\d{1,2}|three|four|five|six|twelve)(?:\s?(?:-|–|to)\s?(\d{1,2}))?[\s-]months?\b/i;
const DEADLINE = new RegExp(
  String.raw`(?:apply by|application deadline(?: is)?|applications? (?:close|are due|due|will close)(?: on| by)?|deadline(?: to apply)?(?: is)?:?|accepting applications (?:until|through))\s*(?:on\s)?(${MON}\.?\s\d{1,2}(?:st|nd|rd|th)?${YEAR}|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)`,
  "i",
);
const START = new RegExp(String.raw`\bstart(?:s|ing)?(?: date)?(?: (?:in|on|is|of))?:?\s(?:early |mid-?|late )?(${MON}${DAY}${YEAR}|(?:Summer|Fall|Winter|Spring) 20\d\d)`);
const GRAD = /\b(?:graduat\w*|expected graduation|expected to graduate)\b[^.\n•]{0,60}?\b(?:(?:Dec(?:ember)?|May|June?|Spring|Fall|Winter|Summer)\s)?20\d\d\b(?:\s?(?:-|–|and|or|to|through)\s?(?:[\w/]+\s)?20\d\d\b)?(?:\s(?:or later|or after|or earlier|or sooner))?/i;
const ENROLLED = /\bcurrently (?:enrolled|pursuing|working toward)[^.\n•]{0,90}?\b(?:bachelor['’]?s|master['’]?s|ph\.?d|degree|b\.?s\.?|m\.?s\.?|undergraduate|graduate|university|college)\b[^.\n•;]{0,40}?(?=,|;| and graduat| graduat|$|\n)/im;
const DEGREE = /\b(?:pursuing|pursuit of|enrolled in|working (?:toward|towards)|candidates? for|students? (?:in|pursuing))\s(?:an?\s)?(?:current\s)?(bachelor['’]?s|master['’]?s|ph\.?\s?d\.?|doctoral|undergraduate|graduate|mba|high school)\b/gi;
// Every degree level named in one sentence: "a Bachelor’s or Master’s degree" → both.
const LEVEL_WORD = /\b(bachelor['’]?s|master['’]?s|ph\.?\s?d\.?|doctoral|mba|high school)\b/gi;
const CLASS_YEAR = /\b(?:rising\s(?:sophomore|junior|senior)s?|(?:freshm[ae]n|sophomores?|juniors?|seniors?)(?:,?\s(?:or|and)\s(?:sophomores?|juniors?|seniors?))+)\b/i;
const NO_VISA = /(?:\b(?:not|unable to|cannot|can't|won't|will not|does not|do not|is not able to|are not able to)\s(?:be able to\s)?(?:sponsor\b|(?:provide|offer|support)\b[^.\n•]{0,40}?\bsponsor)|\bwithout (?:the need for |requiring |requiring the |needing )?(?:current or future |future )?(?:visa |employer )?sponsorship|\bsponsorship (?:is|will) not (?:be )?(?:available|provided|offered))/i;
const YES_VISA = /\b(?:visa sponsorship (?:is )?(?:available|provided|offered)|(?:will|can|able to) sponsor\b|we sponsor\b)/i;
const MAYBE_VISA = /\bsponsorship (?:may|might|could) be (?:available|provided|offered|considered)\b/i;
const CPT_OPT = /\b(?:CPT|OPT)\b/;
const HOUSING = /\b(?:housing|relocation)\s(?:stipend|assistance|support|is provided|provided|allowance|reimbursement|bonus|benefits?)\b|\bcorporate housing\b|\bprovide[sd]? housing\b/i;
const RETURN = /\breturn offers?\b|\bfull[- ]time (?:offers?|conversion|roles?|positions?) (?:after|following|upon|at the end)|\bconver(?:t|sion)(?:ed)? (?:in)?to (?:a )?full[- ]time\b/i;
const OFFICE_DAYS = /\b(?:(\d|one|two|three|four|five)\sdays?\s(?:a|per|each)\sweek\s(?:in|at|from)\s(?:the |our |an )?(?:office|person|hub|site)\b|in (?:the |our )?(?:office|person) (\d|one|two|three|four|five)\sdays?\s(?:a|per|each)\sweek\b)/i;
const HOURS = /\b(\d{2})(?:\s?(?:-|–|to)\s?(\d{2}))?\s?hours?\s(?:a|per)\sweek\b/i;

// The sentence (or bullet) a match came from, for the "from the posting" quote.
function quoteAt(text: string, index: number) {
  const start = Math.max(text.lastIndexOf("\n", index), ...[". ", "! ", "? "].map((p) => text.lastIndexOf(p, index) + 1));
  const ends = ["\n", ". ", "! ", "? "].map((p) => text.indexOf(p, index)).filter((i) => i >= 0);
  const end = ends.length ? Math.min(...ends) + 1 : text.length;
  const q = text.slice(start, end).replace(/^[\s•.]+/, "").trim();
  return q.length > 220 ? q.slice(0, 217) + "…" : q;
}

function find(text: string, re: RegExp) {
  const m = re.exec(text);
  return m ? { m, quote: quoteAt(text, m.index) } : null;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const clip = (s: string, n = 90) => (s.length > n ? s.slice(0, n - 1).trim() + "…" : s);

export function postingFacts(job: Job): PostingFact[] {
  const text = `${job.title}\n${job.description}`;
  const card = jobFacts(job);
  const simplify = job.source === "simplify";
  const out: PostingFact[] = [];
  const add = (f: PostingFact) => out.push(f);

  if (card.pay) {
    const hit = !job.compensation ? find(text, /\$\s?\d/) : null;
    add({ key: "pay", icon: "💵", label: "Pay", value: card.pay, quote: job.compensation ? "Listed in the job board's pay field." : hit?.quote });
  }

  const places = job.location.split(/;\s*/).filter(Boolean);
  add({ key: "where", icon: "📍", label: places.length > 1 ? `Locations (${places.length})` : "Location", value: clip(places.join(" · ") || "Not listed", 140) });

  const office = find(text, OFFICE_DAYS);
  if (card.workplace || office) {
    add({ key: "workplace", icon: "🏢", label: "Workplace", value: [card.workplace, office && `${office.m[1] || office.m[2]} days a week in person`].filter(Boolean).join(" · "), quote: office?.quote });
  }

  const range = find(text, DATE_RANGE);
  const start = range ? null : find(text, START);
  if (range) add({ key: "dates", icon: "🗓️", label: "Dates", value: range.m[0], quote: range.quote });
  else if (start) add({ key: "dates", icon: "🗓️", label: "Starts", value: start.m[1], quote: start.quote });
  else if (card.term) add({ key: "dates", icon: "🗓️", label: "Term", value: card.term });

  const weeks = find(text, LENGTH_WEEKS);
  const months = weeks ? null : find(text, LENGTH_MONTHS);
  const len = weeks || months;
  if (len && /intern|program|duration|summer|co-?op|length|long/i.test(len.quote)) {
    const unit = weeks ? "weeks" : "months";
    add({ key: "length", icon: "⏳", label: "Length", value: `${len.m[1]}${len.m[2] ? `–${len.m[2]}` : ""} ${unit}`, quote: len.quote });
  }
  const hours = find(text, HOURS);
  if (hours) add({ key: "hours", icon: "🕘", label: "Hours", value: `${hours.m[1]}${hours.m[2] ? `–${hours.m[2]}` : ""} hours a week`, quote: hours.quote });

  if (job.deadline) {
    const d = new Date(job.deadline);
    const days = Math.ceil((d.getTime() - Date.now()) / 86_400_000);
    add({ key: "deadline", icon: "⏰", label: "Apply by", value: `${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}${days >= 0 ? ` (${days} day${days === 1 ? "" : "s"} left)` : " (passed)"}`, quote: "Listed in the job board's deadline field.", tone: days >= 0 && days <= 7 ? "warn" : undefined });
  } else {
    const dl = find(text, DEADLINE);
    if (dl) add({ key: "deadline", icon: "⏰", label: "Apply by", value: dl.m[1], quote: dl.quote });
  }

  const grad = find(text, GRAD), enrolled = find(text, ENROLLED), year = find(text, CLASS_YEAR);
  // Degree levels the posting asks for ("Master's", "PhD"), in the posting's order.
  const LEVEL: Record<string, string> = { bachelor: "Bachelor's", master: "Master's", ph: "PhD", doctoral: "PhD", undergraduate: "Undergraduate", graduate: "Graduate", mba: "MBA", highschool: "High school" };
  const levelName = (w: string) => LEVEL[w.toLowerCase().replace(/[^a-z]/g, "").replace(/s$/, "").replace(/^phd?$/, "ph")] || "";
  const degreeHits = [...text.matchAll(DEGREE)];
  const firstSentence = degreeHits[0] ? quoteAt(text, degreeHits[0].index ?? 0) : enrolled?.quote || grad?.quote || "";
  const levels = [...new Set([
    ...degreeHits.slice(0, 1).map((m) => levelName(m[1])),
    ...[...firstSentence.matchAll(LEVEL_WORD)].map((m) => levelName(m[1])),
  ].filter(Boolean))];
  if (simplify && card.degrees) add({ key: "who", icon: "🎓", label: "Who can apply", value: card.degrees });
  else if (levels.length || grad || enrolled || year) {
    const parts = [
      levels.length ? `${levels.join(" or ")} students` : enrolled ? cap(enrolled.m[0].trim().replace(/[\s,;]+$/, "")) : "",
      grad ? (levels.length || enrolled ? grad.m[0].trim().replace(/^./, (c) => c.toLowerCase()) : cap(grad.m[0].trim())) : "",
      year && !grad ? year.m[0].trim() : "",
    ].filter(Boolean);
    const quotes = [degreeHits[0] && quoteAt(text, degreeHits[0].index ?? 0), grad?.quote, enrolled?.quote, year?.quote].filter(Boolean) as string[];
    add({ key: "who", icon: "🎓", label: "Who can apply", value: clip(parts.join(", "), 120), quote: [...new Set(quotes)].join(" … ") });
  }

  if (simplify && card.sponsorship) {
    add({ key: "visa", icon: "🛂", label: "Visa sponsorship", value: card.sponsorship, tone: /offers|yes/i.test(card.sponsorship) ? "good" : /not|no /i.test(card.sponsorship) ? "warn" : undefined });
  } else {
    const no = find(text, NO_VISA), yes = no ? null : find(text, YES_VISA), cpt = find(text, CPT_OPT);
    if (no) add({ key: "visa", icon: "🛂", label: "Visa sponsorship", value: "Not offered, per the posting", quote: no.quote, tone: "warn" });
    else if (yes) add({ key: "visa", icon: "🛂", label: "Visa sponsorship", value: "Offered, per the posting", quote: yes.quote, tone: "good" });
    else if (find(text, MAYBE_VISA)) add({ key: "visa", icon: "🛂", label: "Visa sponsorship", value: "May be available, per the posting", quote: find(text, MAYBE_VISA)!.quote });
    else if (cpt) add({ key: "visa", icon: "🛂", label: "Visa", value: "Mentions CPT/OPT", quote: cpt.quote });
  }

  const housing = find(text, HOUSING);
  if (housing) add({ key: "housing", icon: "🏠", label: "Housing", value: "Housing or relocation help mentioned", quote: housing.quote, tone: "good" });
  const ret = find(text, RETURN);
  if (ret) add({ key: "return", icon: "🔁", label: "After the internship", value: "Full-time conversion mentioned", quote: ret.quote, tone: "good" });
  // Recruiting buckets like "Intern" or "General University" say nothing about the team.
  if (job.team && !/^(?:general\s)?(?:interns?(?:hips?)?|university|students?|early career|campus|new grads?|emerging talent)$/i.test(job.team.trim())) add({ key: "team", icon: "👥", label: "Team", value: clip(job.team, 60) });
  if (card.category) add({ key: "category", icon: "🏷️", label: "Field", value: card.category });

  return out;
}

// Ordered: "preferred" before "requirements" so "Preferred qualifications" isn't
// read as a requirement, and "role" before "about" so "About the role" is the role.
const KINDS: [SectionKind, RegExp][] = [
  ["preferred", /prefer|nice to have|bonus|plus\b|stand out|ideal(ly)?\b/i],
  ["requirements", /qualif|requirement|looking for|you have|you bring|about you|who you are|must have|what you need|you should|you might be|you are|minimum|basic/i],
  ["role", /what you.?ll|you will|responsibilit|the role|day.to.day|your impact|the job|in this role|the opportunity|what you.?ll be doing|projects|the internship|about the team/i],
  ["benefits", /benefit|perks|what we offer|compensation|pay\b|salary|why join|we offer|rewards/i],
  ["about", /about|who we are|our mission|our company|our story|overview/i],
];
const kindOf = (heading: string): SectionKind => KINDS.find(([, re]) => re.test(heading))?.[0] || "other";

function isHeading(line: string, next?: string) {
  if (line.startsWith("•") || line.length > 80 || line.length < 3) return false;
  if (/[.!?,;]$/.test(line)) return false;
  if (line.endsWith(":")) return true;
  const words = line.split(/\s+/).length;
  return words <= 9 && (!next || next.startsWith("•") || /^[A-Z0-9"“]/.test(next));
}

// Splits a posting into its own sections ("What you'll do", "Qualifications", ...).
export function postingSections(description: string): PostingSection[] {
  const lines = description.split("\n").map((l) => l.trim()).filter(Boolean);
  const sections: PostingSection[] = [];
  let cur: PostingSection | null = null;
  lines.forEach((line, i) => {
    if (isHeading(line, lines[i + 1])) {
      const heading = line.replace(/:$/, "").trim();
      cur = { kind: kindOf(heading), heading, items: [] };
      sections.push(cur);
      return;
    }
    if (!cur) {
      cur = { kind: "about", heading: "Overview", items: [] };
      sections.push(cur);
    }
    cur.items.push(line.replace(/^•\s*/, ""));
  });
  return sections.filter((s) => s.items.length);
}
