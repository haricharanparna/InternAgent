import { NextResponse } from "next/server";
import { rateLimited } from "@/lib/rateLimit";
import { generateText } from "@/lib/gemini";
import type { Profile } from "@/lib/types";

type Message = { role: "user" | "model"; text: string };

const MAX_MESSAGES = 12;
const MAX_CHARS = 2000;

const SYSTEM = `You are the InternAgent assistant, a friendly career helper for students hunting internships.
You help with: interview prep, follow-up and thank-you emails, cover letter structure, which skills to learn next, and how the InternAgent app works.

How the app works: users upload a PDF resume, the AI builds a profile, the app searches thousands of live internships (company job boards plus the SimplifyJobs list), "Score with AI" rates fit 0-100 with matched and missing requirements, "Tailor my resume" rewrites bullets for one posting without adding facts, "Save & get next steps" adds it to the Applications board and opens a step-by-step plan for that job, an email and cover-letter writer (reach out, follow up, thank you, referral, accept, decline, cover letter), and Interview prep (likely questions, answer by typing or speaking, STAR feedback); Applications cards take a deadline and interview date and export to a calendar (.ics) or CSV; the search has field, pay, visa-sponsorship and "new since last visit" filters, sorting by match, newest, keyword match or pay, and each card shows a free keyword-match % against the resume plus how old the posting is; the Applications tab can add a job found anywhere (paste the description), has a weekly application goal, and each job has a People tab for recruiter and interviewer contacts; the gear icon can back up or restore all data; with 7-day follow-up reminders, the "Build a resume" tab asks a few questions and writes an editable resume (with free checks and PDF download) for students who don't have one, "Use my location" filters to nearby or remote roles, and the gear icon has accessibility settings.

Rules:
- Be honest. Never encourage inventing experience, skills, or numbers on a resume or in an interview.
- Keep answers short: a few sentences or a short bulleted list. Use **bold** sparingly.
- If you don't know something (like a specific company's internal process), say so.
- You can't see job postings unless the user pastes them, and you can't apply to jobs for the user.`;

export async function POST(req: Request) {
  const limited = rateLimited(req);
  if (limited) return limited;
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
