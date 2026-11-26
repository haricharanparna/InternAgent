// Server-side honesty guards shared by every route that rewrites a student's
// words. The AI only chooses wording; these checks make sure it can't slip in
// a number, a skill or a filler word the student never gave.

// "1,200", "3.5", "40" and "2024" are numbers; a trailing "." or "," is not part of one.
const NUMBER = /\d(?:[\d,.]*\d)?/g;

// Every number in a text, normalized so "1,200" and "1200" count as the same.
export function numbersIn(text: string): Set<string> {
  return new Set((String(text || "").match(NUMBER) || []).map((n) => n.replace(/,/g, "")));
}

// True when every number in `text` also appears in `source`. Whole numbers are
// compared, so a source that says "2024" does not allow "20" or "4".
export function onlyKnownNumbers(text: string, source: string): boolean {
  const known = numbersIn(source);
  return [...numbersIn(text)].every((n) => known.has(n));
}

// Keeps only the sentences of `text` whose numbers all appear in `source`.
export function dropSentencesWithNewNumbers(text: string, source: string): string {
  const sentences = String(text || "").match(/[^.!?\n]+(?:[.!?]+(?=\s|$)|$)|\n+/g) || [];
  return sentences.filter((s) => onlyKnownNumbers(s, source)).join("").replace(/[ \t]{2,}/g, " ").trim();
}

// Filler adverbs that make claims sound bigger without adding facts.
export function scrubFiller(text: string): string {
  return String(text || "").replace(/\b(successfully|effectively|seamlessly)\s+/gi, "");
}

// Keeps only items the student actually listed (case-insensitive), in the
// student's own spelling, without duplicates.
export function keepKnown(items: string[], allowed: string[]): string[] {
  const byLower = new Map(allowed.map((s) => [s.trim().toLowerCase(), s.trim()]));
  const out: string[] = [];
  for (const item of items || []) {
    const hit = byLower.get(String(item).trim().toLowerCase());
    if (hit && !out.includes(hit)) out.push(hit);
  }
  return out;
}
