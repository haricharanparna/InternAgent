import type { Job } from "./types";
import { hourlyPay, jobFacts } from "./jobFacts.ts";

// Where a listing came from and whether anything in it looks like a common
// internship scam. Plain code, no AI. We only say "official" when the posting
// really came from the company's own job board API; nothing is called
// "verified" unless we actually checked it.

export type TrustLevel = "official" | "third-party" | "unverified" | "suspicious";
export type Trust = { level: TrustLevel; label: string; detail: string; flags: { label: string; quote?: string }[] };

const BOARD: Record<string, string> = { greenhouse: "Greenhouse", lever: "Lever", ashby: "Ashby" };

// Hiring platforms companies commonly use to host real applications.
const ATS = /(greenhouse\.io|lever\.co|ashbyhq\.com|myworkdayjobs\.com|workday\.com|icims\.com|smartrecruiters\.com|jobvite\.com|taleo\.net|successfactors\.(com|eu)|bamboohr\.com|workable\.com|simplify\.jobs|rippling\.com|recruitee\.com|breezy\.hr|jazzhr\.com|applytojob\.com|oraclecloud\.com|eightfold\.ai|linkedin\.com|handshake\.com|joinhandshake\.com|indeed\.com|wellfound\.com|usajobs\.gov)$/i;
const SHORTENER = /^(bit\.ly|tinyurl\.com|t\.co|goo\.gl|ow\.ly|rb\.gy|cutt\.ly|is\.gd|shorturl\.at)$/i;

const RED_FLAGS: { label: string; re: RegExp }[] = [
  { label: "Asks you to pay for something (training, equipment, a starter kit or a background check)", re: /\b(?:pay|fee|deposit|purchase|buy)\b[^.\n]{0,40}\b(?:training|equipment|kit|starter|background check|registration|onboarding)\b|\b(?:training|registration|application|processing) fee\b/i },
  { label: "Mentions gift cards, wire transfers, crypto, or depositing a check", re: /\bgift cards?\b|\bwire transfer\b|\b(?:zelle|cash ?app|venmo)\b|\bbitcoin\b|\bcrypto(?:currency)? payment\b|\bdeposit (?:a|the) check\b/i },
  { label: "Asks for sensitive personal or bank information up front", re: /\bsocial security (?:number|card)\b|\bSSN\b|\bbank account (?:number|details|information)\b|\brouting number\b|\bpassport (?:number|copy|photo)\b|\bdriver'?s license (?:number|photo|copy)\b/i },
  { label: "Interview happens only over a chat app", re: /\b(?:interviews?|interviewing|chats?|contact|reach)\b[^.\n]{0,50}\b(?:telegram|whatsapp|signal app|wire app|google hangouts)\b/i },
  { label: "Promises a job with no interview, or hiring immediately", re: /\bno interview (?:needed|required)\b|\bhired (?:today|immediately|on the spot)\b|\bstart (?:earning )?(?:today|immediately) with no\b/i },
  { label: "Recruiter uses a personal email address", re: /\b[\w.+-]+@(?:gmail|yahoo|outlook|hotmail|aol|proton(?:mail)?|icloud)\.com\b/i },
  { label: "Pay is quoted per day or week at a level that's unusual for internships", re: /\$\s?\d{1,3}(?:,\d{3})+\s?(?:per|a|\/)\s?(?:day|week)\b|\$\s?[5-9]\d{2}\s?(?:per|a|\/)\s?day\b/i },
];

function quoteAt(text: string, index: number) {
  const start = Math.max(text.lastIndexOf("\n", index), text.lastIndexOf(". ", index) + 1, 0);
  const endDot = text.indexOf(". ", index), endNl = text.indexOf("\n", index);
  const end = Math.min(...[endDot, endNl, text.length].filter((i) => i >= 0));
  const q = text.slice(start, end + 1).replace(/^[\s•.]+/, "").trim();
  return q.length > 200 ? q.slice(0, 197) + "…" : q;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function trustOf(job: Job): Trust {
  const text = `${job.title}\n${job.description}`;
  const flags: Trust["flags"] = [];
  // The company's own board, loaded through its API: the company wrote the text
  // and chose the link, so it isn't checked like a listing from elsewhere.
  const official = !job.custom && job.source !== "simplify";
  for (const f of official ? [] : RED_FLAGS) {
    const re = new RegExp(f.re.source, f.re.flags.includes("g") ? f.re.flags : f.re.flags + "g");
    for (const m of text.matchAll(re)) {
      const quote = quoteAt(text, m.index ?? 0);
      // Anti-fraud notices ("we will never ask for gift cards") aren't red flags.
      if (/\b(?:never|will not|won't|do not|don't|does not|doesn't|fraud\w*|scam\w*|phishing|beware|impersonat\w*|no fee|free of charge)\b/i.test(quote)) continue;
      flags.push({ label: f.label, quote });
      break;
    }
  }
  const pay = hourlyPay(jobFacts(job).pay);
  if (pay > 150) flags.push({ label: `Listed pay works out to about $${pay}/hour, far above typical internship pay` });

  // The application link should go to the company's own site or a known hiring platform.
  let host = "";
  if (!official) try {
    const u = new URL(job.url);
    host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (u.protocol !== "https:" && job.custom) flags.push({ label: "The application link isn't a secure (https) page" });
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) flags.push({ label: "The application link is a bare IP address, not a website name" });
    if (SHORTENER.test(host)) flags.push({ label: "The application link uses a link shortener that hides where it goes" });
  } catch {
    if (job.custom && job.url && !/google\.com\/search/.test(job.url)) flags.push({ label: "The application link isn't a valid web address" });
  }
  const companyKey = norm(job.company).slice(0, 12);
  const hostKey = norm(host.split(".").slice(0, -1).join(""));
  const hostMatchesCompany = companyKey.length >= 3 && (hostKey.includes(companyKey) || companyKey.includes(hostKey.slice(0, 6)));
  if (host && !official && !ATS.test(host) && !hostMatchesCompany && !/google\.com$/.test(host) && job.source !== "simplify") {
    flags.push({ label: `The link goes to ${host}, which isn't ${job.company}'s site or a known hiring platform` });
  }

  if (flags.length) {
    return { level: "suspicious", label: "Potentially suspicious", detail: "Some things in this listing match common internship scams. Real employers never ask you to pay or for bank details to apply.", flags };
  }
  if (job.source === "simplify") {
    return { level: "third-party", label: "Third-party list", detail: "From the community-run SimplifyJobs list. Not independently verified: make sure the link goes to the company's own careers site before applying.", flags };
  }
  if (job.custom) {
    return { level: "unverified", label: "Added by you", detail: "You added this listing, so InternAgent hasn't verified it. No common scam signs were found in the text.", flags };
  }
  return {
    level: "official",
    label: "Official company job board",
    detail: `Loaded straight from ${job.company}'s own ${BOARD[job.source] || "job"} board through its public API, not copied from another site.`,
    flags,
  };
}
