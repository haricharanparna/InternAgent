import { NextResponse } from "next/server";
import { generateText } from "@/lib/gemini";
import type { Profile } from "@/lib/types";

type Message = { role: "user" | "model"; text: string };

const MAX_MESSAGES = 12;
const MAX_CHARS = 2000;

const SYSTEM = `You are the InternAgent assistant, a friendly career helper for students hunting internships.
You help with: interview prep, follow-up and thank-you emails, cover letter structure, which skills to learn next, and how the InternAgent app works.

How the app works: users upload a PDF resume, the AI builds a profile, the app searches thousands of live internships (company job boards plus the SimplifyJobs list), "Score with AI" rates fit 0-100 with matched and missing requirements, "Tailor my resume" rewrites bullets for one posting without adding facts, "Save to tracker" adds it to the Applications board with 7-day follow-up reminders, "Use my location" filters to nearby or remote roles, and the gear icon has accessibility settings.

Rules:
- Be honest. Never encourage inventing experience, skills, or numbers on a resume or in an interview.
- Keep answers short: a few sentences or a short bulleted list. Use **bold** sparingly.
- If you don't know something (like a specific company's internal process), say so.
- You can't see job postings unless the user pastes them, and you can't apply to jobs for the user.`;

export async function POST(req: Request) {
  try {
    const { messages, profile } = (await req.json()) as { messages: Message[]; profile?: Profile | null };
    const recent = messages.slice(-MAX_MESSAGES).map((m) => ({
      role: m.role === "model" ? "model" : "user",
      parts: [{ text: String(m.text).slice(0, MAX_CHARS) }],
    }));
    if (!recent.length || recent[recent.length - 1].role !== "user") {
      return NextResponse.json({ error: "Send a message first." }, { status: 400 });
    }

    const about = profile
      ? `\n\nThe student's profile (from their resume): ${JSON.stringify({
          major: profile.major, school: profile.school, graduationYear: profile.graduationYear,
          skills: profile.skills, experiences: profile.experiences.map((e) => `${e.title} (${e.kind})`),
          interests: profile.interests,
        })}`
      : "\n\nThe student hasn't uploaded a resume yet.";

    const reply = await generateText(recent, SYSTEM + about);
    return NextResponse.json({ reply });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
