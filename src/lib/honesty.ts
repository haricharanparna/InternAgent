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

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Skills on the resume's skills list that no experience title or bullet mentions.
export function listedOnly(profile: { skills: string[]; experiences: { title: string; bullets: string[] }[] }): string[] {
  const used = profile.experiences.flatMap((e) => [e.title, ...e.bullets]).join(" \n ").toLowerCase();
  return profile.skills.filter((s) => !new RegExp(`(^|[^a-z0-9+#])${esc(s.toLowerCase())}(?![a-z0-9+#])`).test(used));
}

// "your Tableau experience" / "experience with Tableau" -> "your Tableau skills"
// for skills that are only listed, never shown in an experience.
export function softenListedSkills(text: string, skills: string[]): string {
  let out = String(text || "");
  for (const s of skills) {
    const k = esc(s);
    out = out
      .replace(new RegExp(String.raw`\b(?:hands-on |prior |previous )?experience (?:working )?(?:with|in|using) ${k}(?![\w+#])`, "gi"), `${s} skills`)
      .replace(new RegExp(String.raw`(?<![\w+#])${k} (?:experience|projects?|work)\b`, "gi"), `${s} skills`);
  }
  return out;
}

type ProfileLike = { skills: string[]; experiences: { title: string; organization?: string; bullets: string[] }[] };

const wordRe = (s: string) => new RegExp(String.raw`(?<![\w+#])${esc(s)}(?![\w+#])`, "i");
// Organizations like "Class project" or "Personal" don't identify one experience.
const GENERIC_ORG = /^(?:(?:class|personal|school|course|independent|side|self|university|college|student)(?:[ -]?(?:project|work|initiative))?|projects?|n\/?a|none|self-employed)$/i;
// Words that tie a skill to an experience: "Excel from your project", "the project where you used Excel".
const LINK = /\b(?:from|in|during|at|through|while|on|for|using|used|use|with|where|via|by|applied|leverag\w*)\b/i;

// Names a sentence might use for an experience: its title, its organization,
// and the title's first two words ("Campus Dining") for long titles.
function experienceNames(e: ProfileLike["experiences"][number]) {
  const names = [e.title, e.organization || ""].map((n) => n.trim()).filter((n) => n.length >= 3 && !GENERIC_ORG.test(n));
  const words = e.title.trim().split(/\s+/);
  if (words.length >= 3 && words.slice(0, 2).join(" ").length >= 8) names.push(words.slice(0, 2).join(" "));
  return names;
}

// Removes one skill from a sentence when it's part of a list ("Excel and R" → "R");
// returns null when the skill stands alone and the sentence can't be kept.
function dropSkill(sentence: string, skill: string): string | null {
  const k = esc(skill), b = String.raw`(?<![\w+#])`, a = String.raw`(?![\w+#])`;
  const forms = [
    new RegExp(String.raw`${b}${k}${a},\s*`, "i"),
    new RegExp(String.raw`,\s*(?:and |or )?${b}${k}${a}`, "i"),
    new RegExp(String.raw`\s+(?:and|or|&)\s+${b}${k}${a}`, "i"),
    new RegExp(String.raw`${b}${k}${a}\s+(?:and|or|&)\s+`, "i"),
    new RegExp(String.raw`${b}${k}\s*/\s*|\s*/\s*${k}${a}`, "i"),
  ];
  for (const re of forms) if (re.test(sentence)) return sentence.replace(re, "");
  return null;
}

// Missing-skill guard. `missing` are requirements the student's resume doesn't
// show ("Fluent French"). A first-person sentence claiming one ("I bring fluent
// English and French") loses that skill, or is dropped if it stood alone.
// Sentences about learning it ("I'm starting a French course") are kept.
const QUALIFIER = /^(?:strong|fluent|excellent|good|basic|advanced|proficient|solid|working|native|professional|experience|knowledge|familiarity)$/i;
export function dropMissingClaims(text: string, missing: string[], have: string[]): string {
  const haveLower = have.map((h) => h.toLowerCase());
  const terms = new Set<string>();
  for (const m of missing || []) {
    const item = String(m).trim();
    if (!item || haveLower.includes(item.toLowerCase())) continue;
    terms.add(item);
    const words = item.split(/\s+/);
    if (words.length <= 3) for (const w of words) if (/^[A-Z][\w+#.]{1,}$/.test(w) && !QUALIFIER.test(w) && !haveLower.includes(w.toLowerCase())) terms.add(w);
  }
  if (!terms.size) return String(text || "");
  const CLAIM = /\b(?:I|I'm|I've|my|me)\b/;
  const LEARNING = /\b(?:learn\w*|course|studying|plan(?:ning)? to|eager to|working on|not yet|building|practic\w*|improv\w*|develop\w*)\b/i;
  const fix = (sentence: string): string | null => {
    if (!CLAIM.test(sentence) || LEARNING.test(sentence)) return sentence;
    let s = sentence;
    for (const t of [...terms].sort((a, b) => b.length - a.length)) {
      if (!wordRe(t).test(s)) continue;
      const next = dropSkill(s, t);
      if (next === null) return null;
      s = next;
    }
    return s;
  };
  return String(text || "")
    .split(/(\n+)/)
    .map((line) => (/^\n+$/.test(line) ? line : (line.match(/[^.!?]+(?:[.!?]+|$)/g) || [line]).map(fix).filter((x): x is string => x !== null).join("").replace(/\s{2,}/g, " ").trim()))
    .join("")
    .trim();
}

// Skill-to-experience guard. If a sentence ties a skill to an experience whose
// title and bullets never mention that skill ("Highlight your Excel and R skills
// from your Campus Dining project" when that project only used R), the skill is
// removed from the sentence, or the sentence is dropped if the skill stood alone.
export function unlinkUnusedSkills(text: string, profile: ProfileLike): string {
  const exps = profile.experiences.map((e) => ({
    names: experienceNames(e),
    body: [e.title, ...(e.bullets || [])].join(" \n "),
  }));
  const fixSentence = (sentence: string): string | null => {
    let s = sentence;
    const mentioned = exps
      .map((e) => ({ e, hit: e.names.map((n) => wordRe(n).exec(s)).find(Boolean) }))
      .filter((x) => x.hit);
    if (!mentioned.length) return s;
    for (const skill of profile.skills) {
      const sm = wordRe(skill).exec(s);
      if (!sm || skill.trim().length < 1) continue;
      // Fine if any experience named in this sentence actually shows the skill.
      if (mentioned.some((x) => wordRe(skill).test(x.e.body))) continue;
      const linked = mentioned.some(({ hit }) => {
        const [from, to] = sm.index < hit!.index ? [sm.index + sm[0].length, hit!.index] : [hit!.index + hit![0].length, sm.index];
        const between = s.slice(from, to);
        return !/[;:]/.test(between) && LINK.test(between);
      });
      if (!linked) continue;
      const next = dropSkill(s, skill);
      if (next === null) return null;
      s = next;
    }
    return s;
  };
  return String(text || "")
    .split(/(\n+)/)
    .map((line) => {
      if (/^\n+$/.test(line)) return line;
      const sentences = line.match(/[^.!?]+(?:[.!?]+|$)/g) || [line];
      return sentences.map(fixSentence).filter((x): x is string => x !== null).join("").replace(/\s{2,}/g, " ").trim();
    })
    .join("")
    .trim();
}
