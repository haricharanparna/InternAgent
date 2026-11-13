import { NextResponse } from "next/server";
import { generateJSON } from "@/lib/gemini";
import type { Job, RoleInfo } from "@/lib/types";

const MAX_DESC = 3500;
// Wikimedia asks API clients to identify themselves.
const UA = { "User-Agent": "InternAgent/0.1 (student hackathon project)" };

type Wiki = { title: string; extract: string; url: string };
const wikiCache = new Map<string, Wiki | null>();

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// Finds the company's Wikipedia summary, accepting it only when the article
// title actually contains the company's name (avoids "Ramp" → ramp geometry).
async function companyWiki(company: string): Promise<Wiki | null> {
  const key = norm(company);
  if (wikiCache.has(key)) return wikiCache.get(key)!;
  let result: Wiki | null = null;
  try {
    const q = encodeURIComponent(`${company} company`);
    const search = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${q}&format=json&srlimit=3`,
      { headers: UA, signal: AbortSignal.timeout(6000) },
    ).then((r) => r.json());
    const firstWord = norm(company.split(/\s+/)[0] || "");
    const hit = (search.query?.search as { title: string }[] | undefined)?.find(
      (s) => firstWord.length >= 3 && norm(s.title).includes(firstWord),
    );
    if (hit) {
      const page = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(hit.title)}`, {
        headers: UA,
        signal: AbortSignal.timeout(6000),
      }).then((r) => r.json());
      if (page.type !== "disambiguation" && page.extract) {
        result = { title: page.title, extract: page.extract, url: page.content_urls?.desktop?.page || "" };
      }
    }
  } catch {}
  wikiCache.set(key, result);
  return result;
}

const SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    dayToDay: { type: "array", items: { type: "string" } },
    lookingFor: { type: "array", items: { type: "string" } },
    goodToKnow: { type: "array", items: { type: "string" } },
    fromTitleOnly: { type: "boolean" },
    companyAbout: { type: "string" },
  },
  required: ["summary", "dayToDay", "lookingFor", "goodToKnow", "fromTitleOnly", "companyAbout"],
};

type Out = Omit<RoleInfo, "company"> & { companyAbout: string };

export async function POST(req: Request) {
  try {
    const { job } = (await req.json()) as { job: Job };
    const wiki = await companyWiki(job.company);
    const detailed = job.description.length > 400;

    const prompt = `Explain this internship to a student in plain, friendly English.

POSTING: ${job.title} at ${job.company} (${job.location})
DETAILS: ${job.description.slice(0, MAX_DESC) || "(none)"}
${wiki ? `COMPANY (from Wikipedia): ${wiki.extract}` : "COMPANY: no reliable public info found."}

Return:
- summary: 2 sentences on what this intern would work on and why it matters.
- dayToDay: 3 short bullets of likely day-to-day work.
- lookingFor: up to 4 short bullets of what they want in a candidate.
- goodToKnow: up to 3 short bullets of practical facts that appear in the details (term/dates, pay, visa sponsorship, degree level, remote/hybrid). Empty if none.
- fromTitleOnly: true if DETAILS has too little information and you inferred from the title and category.
- companyAbout: 2 sentences about the company, using ONLY the COMPANY text or facts stated in DETAILS. If neither says anything, return an empty string.
Only state facts found above. When inferring from the title, phrase it as "typically" or "likely".`;

    const out = await generateJSON<Out>([{ text: prompt }], SCHEMA);
    const { companyAbout, ...role } = out;
    const info: RoleInfo = {
      ...role,
      fromTitleOnly: role.fromTitleOnly || !detailed,
      company: companyAbout
        ? { about: companyAbout, source: wiki ? "wikipedia" : "posting", url: wiki?.url }
        : { about: "", source: "none" },
    };
    return NextResponse.json({ info });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
