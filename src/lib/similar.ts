import type { Job } from "./types.ts";

// "Similar internships": the same kind of role at other companies, found by
// overlap in the role's title words (no AI). Season, year and filler words are ignored.

const FILLER = new Set("intern internship interns summer fall spring winter co op coop the and of for in at a an to with usa us us remote hybrid new grad i ii iii".split(" "));
// Common short forms, so "SWE Intern" and "Software Engineering Intern" match.
const ALIAS: Record<string, string> = { swe: "software", engineering: "engineer", engineers: "engineer", developer: "engineer", dev: "engineer", sde: "software", ml: "machine", ai: "machine", analytics: "analyst", analysis: "analyst", data: "data", ux: "design", ui: "design", designer: "design", pm: "product", marketer: "marketing" };

export function titleWords(title: string): Set<string> {
  const words = title.toLowerCase().replace(/\(.*?\)|20\d\d/g, " ").split(/[^a-z+#]+/).filter((w) => w.length > 1 && !FILLER.has(w));
  return new Set(words.map((w) => ALIAS[w] || w));
}

export function similarJobs(job: Job, all: Job[], max = 6): Job[] {
  const mine = titleWords(job.title);
  if (!mine.size) return [];
  const seen = new Set<string>();
  return all
    .filter((j) => j.company !== job.company && j.id !== job.id)
    .map((j) => {
      const theirs = titleWords(j.title);
      const shared = [...mine].filter((w) => theirs.has(w)).length;
      return { j, score: shared / (mine.size + theirs.size - shared || 1), shared };
    })
    .filter((x) => x.shared >= Math.min(2, mine.size) && x.score >= 0.4)
    .sort((a, b) => b.score - a.score)
    .filter((x) => !seen.has(x.j.company) && !!seen.add(x.j.company)) // one per company
    .slice(0, max)
    .map((x) => x.j);
}
