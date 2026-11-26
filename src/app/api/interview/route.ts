import { NextResponse } from "next/server";
import { fail } from "@/lib/http";
import { dropSentencesWithNewNumbers, scrubFiller } from "@/lib/honesty";
import { rateLimited } from "@/lib/rateLimit";
import { generateJSON } from "@/lib/gemini";
import type { AnswerFeedback, InterviewQuestion, Opportunity, Profile } from "@/lib/types";

// Interview prep for one chosen opportunity.
// mode "questions": likely questions from the posting and the student's resume.
// mode "feedback": STAR feedback on one practice answer, without adding facts.

const Q_SCHEMA = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          q: { type: "string" },
          kind: { type: "string", enum: ["behavioral", "technical", "role", "gap"] },
          why: { type: "string" },
          useThis: { type: "string" },
        },
        required: ["q", "kind", "why", "useThis"],
      },
    },
  },
  required: ["questions"],
};

const F_SCHEMA = {
  type: "object",
  properties: {
    score: { type: "integer" },
    star: {
      type: "object",
      properties: { situation: { type: "boolean" }, task: { type: "boolean" }, action: { type: "boolean" }, result: { type: "boolean" } },
      required: ["situation", "task", "action", "result"],
    },
    strengths: { type: "array", items: { type: "string" } },
    improve: { type: "array", items: { type: "string" } },
    stronger: { type: "string" },
  },
  required: ["score", "star", "strengths", "improve", "stronger"],
};

const student = (p: Profile) =>
  JSON.stringify({
    major: p.major, school: p.school, graduationYear: p.graduationYear, skills: p.skills,
    experiences: p.experiences.map((e) => ({ title: e.title, organization: e.organization, kind: e.kind, bullets: e.bullets })),
  });

export async function POST(req: Request) {
  const limited = rateLimited(req);
  if (limited) return limited;
  try {
    const body = (await req.json()) as {
      mode: "questions" | "feedback";
      profile: Profile;
      opportunity: Opportunity;
      question?: string;
      answer?: string;
    };
    const { profile, opportunity: o } = body;
    if (!profile || !o?.title) return NextResponse.json({ error: "Missing profile or opportunity." }, { status: 400 });
    const role = `${o.title} at ${o.company} (${o.location})`;
    const posting = (o.description || "(only the title is known)").slice(0, 2500);

    if (body.mode === "questions") {
      const prompt = `You are an interview coach helping a student prepare for an internship interview.

ROLE: ${role}
POSTING: ${posting}
REQUIREMENTS THEY MEET: ${JSON.stringify(o.matched || [])}
REQUIREMENTS THEY MAY LACK: ${JSON.stringify(o.missing || [])}
STUDENT: ${student(profile)}

Write 7 realistic questions this interviewer is likely to ask, in this mix:
- 3 "behavioral" (teamwork, a challenge, learning something fast, a mistake), phrased the way interviewers actually ask them.
- 2 "technical" questions about skills or tasks named in the POSTING, at intern level.
- 1 "role" question (why this role / this company / this field).
- 1 "gap" question about a requirement they may lack, if any; otherwise another behavioral question.

For each: q, kind, why (one sentence: what the interviewer is really checking), and useThis (one sentence naming the specific experience from STUDENT that fits best, or, if none fits, an honest way to answer: a concrete plan to learn it, or the closest thing they have done. Never tell them to describe themselves with traits like "quick learner" or "passionate").
Never claim the student has done something STUDENT doesn't show. Don't invent facts about the company beyond the POSTING.`;
      const out = await generateJSON<{ questions: InterviewQuestion[] }>([{ text: prompt }], Q_SCHEMA);
      return NextResponse.json({ questions: (out.questions || []).slice(0, 8) });
    }

    const question = body.question?.trim().slice(0, 400);
    const answer = body.answer?.trim().slice(0, 4000);
    if (!question || !answer || answer.split(/\s+/).length < 8) {
      return NextResponse.json({ error: "Write at least a couple of sentences so there's something to give feedback on." }, { status: 400 });
    }
    const prompt = `You are a supportive but honest interview coach. A student practiced an answer for an internship interview.

ROLE: ${role}
QUESTION: ${question}
THEIR ANSWER: ${answer}
STUDENT RESUME (for context only): ${student(profile)}

Return:
- score: 1-5 (3 = decent intern answer, 5 = excellent).
- star: whether the answer clearly includes a Situation, a Task, the Actions THEY took, and a Result. For technical or "why" questions, mark the parts that make sense and judge the rest as present if the answer is clear.
- strengths: 1-3 specific things that work, quoting their words briefly.
- improve: 1-3 specific, actionable fixes (e.g. "Say what YOU did, not the team", "End with what happened: did it work?").
- stronger: their answer rewritten to be tighter and better structured, spoken-style, under 170 words. Use ONLY facts in THEIR ANSWER or the RESUME, and don't add dramatizing adjectives they didn't use ("tight deadline", "strict", "successfully"). Keep their own verbs: "I cleaned the data" must not become "I took charge of" or "I led". If a result or number is missing, write a placeholder like [what happened / how many people] instead of inventing one.`;
    const fb = await generateJSON<AnswerFeedback>([{ text: prompt }], F_SCHEMA);
    return NextResponse.json({
      feedback: { ...fb, stronger: scrubFiller(dropSentencesWithNewNumbers(fb.stronger || "", `${answer} ${student(profile)}`)), score: Math.min(5, Math.max(1, Math.round(fb.score || 1))), strengths: (fb.strengths || []).slice(0, 3), improve: (fb.improve || []).slice(0, 3) },
    });
  } catch (err) {
    return fail(err);
  }
}
