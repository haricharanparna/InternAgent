import { NextResponse } from "next/server";
import { rateLimited } from "@/lib/rateLimit";
import { generateJSON } from "@/lib/gemini";
import { EMAIL_TYPES, type EmailDraft, type EmailType, type Opportunity, type Profile } from "@/lib/types";

// Drafts one internship email (outreach, follow-up, thank-you, ...) for a
// chosen opportunity, using only facts from the student's resume and notes.

const SCHEMA = {
  type: "object",
  properties: {
    subject: { type: "string" },
    body: { type: "string" },
    tips: { type: "array", items: { type: "string" } },
  },
  required: ["subject", "body", "tips"],
};

const GUIDE: Record<EmailType, string> = {
  outreach:
    "A short first message to a recruiter or employee at the company BEFORE or while applying. Introduce the student in one line, name the specific role, connect 1-2 real experiences to the posting, and ask one small question or for a brief chat. Under 130 words.",
  follow_up:
    "A polite follow-up to the recruiter after applying with no reply yet. Restate the role, reaffirm interest with one real, relevant experience, and ask about the timeline. Under 110 words. Never sound impatient.",
  thank_you:
    "A thank-you note sent within 24 hours after an interview. Thank them for their time, mention one topic from the conversation, and briefly restate fit. If STUDENT NOTES don't say what was discussed, use the placeholder [something specific you discussed] instead of guessing. Under 120 words.",
  referral:
    "A message asking someone the student knows (a friend, alum or past colleague) for a referral. Make it easy to say yes: name the role, include the posting link, give 2 short reasons they fit, and offer to send a resume. Under 130 words.",
  accept:
    "Accepting an internship offer. Thank them, clearly accept, and ask about next steps (paperwork, start date, onboarding). Don't invent offer details; use placeholders like [start date] if needed. Under 110 words.",
  decline:
    "Politely declining an internship offer. Thank them sincerely, decline clearly without over-explaining, and leave the door open for the future. Under 100 words.",
};

export async function POST(req: Request) {
  const limited = rateLimited(req);
  if (limited) return limited;
  try {
    const { profile, opportunity: o, type, recipient, extra } = (await req.json()) as {
      profile: Profile;
      opportunity: Opportunity;
      type: EmailType;
      recipient?: string;
      extra?: string;
    };
    if (!profile || !o?.title || !EMAIL_TYPES.some((t) => t.id === type)) {
      return NextResponse.json({ error: "Missing profile, opportunity or email type." }, { status: 400 });
    }
    const to = recipient?.trim().slice(0, 80);

    const prompt = `Write one professional internship email for a student.

EMAIL TYPE: ${type}. ${GUIDE[type]}
TO: ${to || "unknown, so greet with the placeholder [Name]"}
ROLE: ${o.title} at ${o.company} (${o.location}), posting: ${o.url}
POSTING DETAILS: ${(o.description || "(only the title is known)").slice(0, 1200)}
STUDENT NOTES: ${[o.notes?.trim(), extra?.trim()].filter(Boolean).join(" | ").slice(0, 600) || "(none)"}
STUDENT: ${JSON.stringify({ name: profile.name, email: profile.email, major: profile.major, school: profile.school, graduationYear: profile.graduationYear, skills: profile.skills, experiences: profile.experiences.map((e) => ({ title: e.title, organization: e.organization, bullets: e.bullets })) })}

Return:
- subject: a clear, specific subject line that names the role.
- body: the full email with greeting and sign-off, signed with the student's name${profile.email ? " and email" : ""}. Use short paragraphs separated by blank lines. Plain text only, no markdown.
- tips: 2-3 short, specific tips for sending THIS email (who to send it to, timing, what to attach or check).

Honesty rules (most important):
- Use only facts from STUDENT and STUDENT NOTES. Never invent experiences, numbers, mutual contacts, conversations, interview details or anything about the company that isn't in POSTING DETAILS.
- Never link a skill to a project unless that project's bullets mention it, and describe projects in their own words (don't upgrade "an app" to "full-stack features").
- Don't claim what the student learned, gained or is strong at ("developed strong X skills", "passionate about") unless STUDENT says it. State what they did, and let the reader draw conclusions.
- Anything unknown goes in [square brackets] for the student to fill in, e.g. [Name], [date of interview].
- Sound like a real, polite student: no clichés like "I hope this email finds you well", no exaggerated enthusiasm.`;

    const draft = await generateJSON<EmailDraft>([{ text: prompt }], SCHEMA);
    return NextResponse.json({ draft: { ...draft, tips: draft.tips.slice(0, 3) } });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
