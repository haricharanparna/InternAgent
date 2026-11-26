import type { Job } from "./types";
import { hourlyPay, jobFacts } from "./jobFacts.ts";

// Plain-English search: "remote AI internships paying at least $20/hour".
// Rule-based (no AI), so it's instant, free and shows exactly what it understood.

export type ParsedSearch = {
  words: string[]; // leftover words matched against title, company, location
  field?: string;
  remote?: boolean;
  workplace?: "Hybrid" | "On-site";
  payMin?: number;
  paid?: boolean;
  visa?: boolean;
  season?: string;
  year?: string;
  beginner?: boolean;
  chips: string[];
};

export const FIELDS: [string, RegExp, RegExp][] = [
  ["AI / ML", /\b(ai|ml|machine learning|deep learning|llms?|nlp|computer vision|artificial intelligence)\b/i, /\b(ai|ml|machine learning|deep learning|llm|nlp|computer vision|applied scien\w*|artificial intelligence)\b/i],
  ["Data", /\b(data|analytics|analyst|data science)\b/i, /\b(data|analytics|analyst|business intelligence|bi)\b/i],
  ["Software", /\b(software|swe|developer|coding|programming|backend|frontend|full[- ]?stack|web dev\w*)\b/i, /\b(software|engineer\w*|developer|swe|backend|back-end|frontend|front-end|full[- ]?stack|platform|infrastructure|mobile|ios|android)\b/i],
  ["Design", /\b(design|designer|ux|ui)\b/i, /\b(design\w*|ux|ui)\b/i],
  ["Product", /\b(product|pm)\b/i, /\b(product manag\w*|product intern|\bapm\b|\bpm\b)\b/i],
  ["Finance", /\b(finance|quant|trading|investment|banking|accounting)\b/i, /\b(finance|financial|quant\w*|trading|investment|banking|accounting|treasury)\b/i],
  ["Hardware", /\b(hardware|electrical|mechanical|embedded|robotics)\b/i, /\b(hardware|electrical|mechanical|embedded|robotics|firmware|silicon|asic|fpga)\b/i],
  ["Marketing", /\b(marketing|growth|brand|communications|social media|content)\b/i, /\b(marketing|growth|brand|communications|social media|content|pr)\b/i],
  ["Security", /\b(security|cyber\w*)\b/i, /\b(security|cyber\w*)\b/i],
  ["Research", /\b(research|researcher)\b/i, /\bresearch\w*\b/i],
  ["Business", /\b(business|operations|strategy|consulting|sales)\b/i, /\b(business|operations|strategy|consult\w*|sales|bizops)\b/i],
];

const STOP = new Set("find show me get give i want looking look for some any all internship internships intern interns role roles job jobs position positions opportunity opportunities in at with a an the that which who are is to of and or on near paying pays pay paid per hour hourly hr an least minimum min over above more than plus program programs please can".split(" "));

export function parseSearch(input: string): ParsedSearch {
  let q = ` ${input.toLowerCase()} `;
  const out: ParsedSearch = { words: [], chips: [] };
  const take = (re: RegExp) => { const m = q.match(re); if (m) q = q.replace(re, " "); return m; };

  const pay = take(/(?:at least|min(?:imum)?|over|above|more than|>=?|paying|pays|paid)?\s*\$\s?(\d{2,3})(?:\.\d+)?\s*(?:\+|\s*(?:\/|per|an?)\s*(?:hr|hour)\b|\s*(?:or more|and up|plus))*/);
  if (pay) { out.payMin = Number(pay[1]); out.chips.push(`Pay ≥ $${out.payMin}/hr`); }
  else if (take(/\bpaid\b/)) { out.paid = true; out.chips.push("Pay listed"); }
  if (take(/\b(remote|work from home|wfh)\b/)) { out.remote = true; out.chips.push("Remote"); }
  else if (take(/\bhybrid\b/)) { out.workplace = "Hybrid"; out.chips.push("Hybrid"); }
  else if (take(/\b(on-?site|in[- ]person|in office)\b/)) { out.workplace = "On-site"; out.chips.push("On-site"); }
  if (take(/\b(visa|sponsor\w*|h-?1b|opt|cpt)\b/)) { out.visa = true; out.chips.push("Sponsors visas"); }
  if (take(/\b(beginners?|beginner[- ]friendly|no experience|entry[- ]level|freshm[ae]n|sophomores?|first[- ]year)\b/)) { out.beginner = true; out.chips.push("Beginner-friendly (no PhD/MBA/Master's-only roles)"); }
  const season = take(/\b(summer|fall|winter|spring)(?:\s+(20\d\d))?\b/);
  if (season) { out.season = season[1]; out.year = season[2]; out.chips.push(`${season[1][0].toUpperCase()}${season[1].slice(1)}${season[2] ? ` ${season[2]}` : ""}`); }
  else { const y = take(/\b(20\d\d)\b/); if (y) { out.year = y[1]; out.chips.push(y[1]); } }
  for (const [name, ask] of FIELDS) {
    if (ask.test(q)) { out.field = name; q = q.replace(new RegExp(ask.source, "gi"), " "); out.chips.push(name); break; }
  }
  out.words = q.split(/[^a-z0-9+#.&-]+/).filter((w) => w.length > 1 && !STOP.has(w));
  if (out.words.length) out.chips.push(`Matching “${out.words.join(" ")}”`);
  return out;
}

// True when a job fits everything the search understood.
export function matchesSearch(job: Job, p: ParsedSearch): boolean {
  const f = jobFacts(job);
  const titleEtc = `${job.title} ${job.company} ${job.location} ${f.category || ""} ${job.team || ""}`.toLowerCase();
  if (p.words.length && !p.words.every((w) => titleEtc.includes(w))) return false;
  if (p.field) {
    const re = FIELDS.find(([n]) => n === p.field)![2];
    if (!re.test(`${job.title} ${f.category || ""} ${job.team || ""}`)) return false;
  }
  if (p.remote && f.workplace !== "Remote" && !/remote/i.test(job.location)) return false;
  if (p.workplace && f.workplace !== p.workplace) return false;
  if (p.payMin && hourlyPay(f.pay) < p.payMin) return false;
  if (p.paid && !f.pay) return false;
  if (p.visa && !/offers sponsorship|yes/i.test(f.sponsorship || "") && !/\b(?:visa sponsorship (?:is )?(?:available|provided|offered)|(?:will|can) sponsor)\b/i.test(job.description)) return false;
  if (p.season && !new RegExp(`${p.season}${p.year ? `\\s+${p.year}` : ""}`, "i").test(`${f.term || ""} ${job.title}`)) return false;
  if (!p.season && p.year && !`${f.term || ""} ${job.title}`.includes(p.year)) return false;
  if (p.beginner && /\b(ph\.?\s?d|mba|master'?s|ms\/phd|senior|staff|lead|principal)\b/i.test(job.title)) return false;
  return true;
}
