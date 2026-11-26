import { NextResponse } from "next/server";
import { fail } from "@/lib/http";
import {
  ASHBY, CACHE_MINUTES, CURRENT_TERM_RE, GREENHOUSE, LEVER, MAX_AGE_DAYS, fetchInternships, jobsMeta,
} from "@/lib/jobs";
import { jobFacts } from "@/lib/jobFacts";
import { isRemote } from "@/lib/location";

// Aggregate numbers about today's internship listings, computed from the same
// data the Search tab uses. Powers the Impact and How it works tabs.

const US_STATE = /,\s*([A-Z]{2})\b/;
const STATES = new Set("AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY PR".split(" "));

function top(counts: Map<string, number>, n: number) {
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([label, count]) => ({ label, count }));
}

export async function GET() {
  try {
    const jobs = await fetchInternships();
    if (!jobs.length) {
      return NextResponse.json({ error: "Job boards are not responding right now." }, { status: 503 });
    }
    const bySource = new Map<string, number>();
    const categories = new Map<string, number>();
    const states = new Map<string, number>();
    const terms = new Map<string, number>();
    const sponsorship = new Map<string, number>();
    let remote = 0, pay = 0, withDescription = 0;

    for (const j of jobs) {
      bySource.set(j.source, (bySource.get(j.source) || 0) + 1);
      const f = jobFacts(j);
      if (f.category) categories.set(f.category, (categories.get(f.category) || 0) + 1);
      if (f.term) for (const t of f.term.split(/,\s*/)) terms.set(t, (terms.get(t) || 0) + 1);
      if (f.sponsorship) sponsorship.set(f.sponsorship, (sponsorship.get(f.sponsorship) || 0) + 1);
      if (f.pay) pay++;
      if (isRemote(j.location)) remote++;
      if (j.source !== "simplify" && j.description.length > 400) withDescription++;
      // Count each state once per posting even if it lists several cities there.
      const seen = new Set<string>();
      for (const place of j.location.split(/;\s*/)) {
        const st = place.match(US_STATE)?.[1];
        if (st && STATES.has(st) && !seen.has(st)) {
          seen.add(st);
          states.set(st, (states.get(st) || 0) + 1);
        }
      }
    }

    return NextResponse.json(
      {
        total: jobs.length,
        companies: new Set(jobs.map((j) => j.company)).size,
        remote,
        pay,
        withDescription,
        bySource: Object.fromEntries(bySource),
        categories: top(categories, 8),
        states: top(states, 10),
        terms: top(terms, 6),
        sponsorship: top(new Map([...sponsorship].filter(([k]) => k !== "Other")), 4),
        sponsorshipUnstated: (sponsorship.get("Other") || 0),
        pipeline: {
          ...jobsMeta(),
          boards: { greenhouse: GREENHOUSE.length, lever: LEVER.length, ashby: ASHBY.length },
          cacheMinutes: CACHE_MINUTES,
          termRule: CURRENT_TERM_RE.source,
          maxAgeDays: MAX_AGE_DAYS,
        },
      },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
    );
  } catch (err) {
    return fail(err);
  }
}
