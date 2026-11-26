import { NextResponse } from "next/server";
import { fail } from "@/lib/http";
import { onlyKnownNumbers, scrubFiller } from "@/lib/honesty";
import { rateLimited } from "@/lib/rateLimit";
import { generateJSON } from "@/lib/gemini";

// Three alternative wordings for one resume bullet, plus one question that
// would make it stronger. Numbers the student never wrote are filtered out.

const SCHEMA = {
  type: "object",
  properties: {
    options: { type: "array", items: { type: "string" } },
    question: { type: "string" },
  },
  required: ["options", "question"],
};

export async function POST(req: Request) {
  const limited = rateLimited(req);
  if (limited) return limited;
  try {
    const { bullet, title, organization, siblings, target } = (await req.json()) as {
      bullet: string; title?: string; organization?: string; siblings?: string[]; target?: string;
    };
    const b = bullet?.trim().slice(0, 400);
    if (!b || b.split(/\s+/).length < 3) return NextResponse.json({ error: "Write a few words first." }, { status: 400 });
    const context = (siblings || []).map((s) => String(s).slice(0, 300)).slice(0, 6);

    const prompt = `Rewrite one resume bullet for a student applying to ${target?.slice(0, 120) || "internships"}.

EXPERIENCE: ${title?.slice(0, 100) || ""} ${organization ? `at ${organization.slice(0, 100)}` : ""}
BULLET: ${b}
OTHER BULLETS FROM THE SAME EXPERIENCE (facts you may use): ${JSON.stringify(context)}

Return:
- options: 3 different rewrites. Each starts with a strong action verb, is under 24 words, and is clearer or more specific than the original. Vary them: one focused on the action, one on the tools, one on the outcome (only if an outcome is stated).
- question: one short question the student could answer to make this bullet stronger (e.g. "How many people used it?").

Honesty rules: use only facts in BULLET and OTHER BULLETS. No new numbers, tools, team sizes, outcomes or titles. Keep the verb tense of the original. Don't upgrade "helped" to "led".`;

    const out = await generateJSON<{ options: string[]; question: string }>([{ text: prompt }], SCHEMA);
    const source = [b, ...context].join(" ");
    const options = (out.options || [])
      .map((o) => String(o).trim().slice(0, 300))
      .filter((o) => o && o.toLowerCase() !== b.toLowerCase())
      .filter((o) => onlyKnownNumbers(o, source))
      .map(scrubFiller)
      .slice(0, 3);
    return NextResponse.json({ options, question: String(out.question || "").slice(0, 200) });
  } catch (err) {
    return fail(err);
  }
}
