import { NextResponse } from "next/server";
import { generateJSON } from "@/lib/gemini";
import type { Profile } from "@/lib/types";

const str = { type: "string" };
const strList = { type: "array", items: str };

const PROFILE_SCHEMA = {
  type: "object",
  properties: {
    name: str, email: str, school: str, major: str, graduationYear: str,
    skills: strList,
    experiences: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: str,
          organization: str,
          kind: { type: "string", enum: ["job", "project", "club", "hackathon", "volunteer", "other"] },
          bullets: strList,
        },
        required: ["title", "organization", "kind", "bullets"],
      },
    },
    interests: strList,
  },
  required: ["name", "email", "school", "major", "graduationYear", "skills", "experiences", "interests"],
};

const PROMPT = `Extract this student's resume into the JSON schema.
Rules:
- Use ONLY information written in the resume. Never invent skills, roles, or results.
- Use an empty string or empty list when something is missing.
- "skills" lists concrete technical and soft skills that appear in the resume, including ones only shown inside project descriptions.
- "interests" are the kinds of roles or fields the student seems aimed at, inferred from the resume content.`;

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("resume");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No resume file uploaded." }, { status: 400 });
    }
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Please upload a PDF." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "PDF must be under 5 MB." }, { status: 400 });
    }

    const data = Buffer.from(await file.arrayBuffer()).toString("base64");
    const profile = await generateJSON<Profile>(
      [{ inlineData: { mimeType: "application/pdf", data } }, { text: PROMPT }],
      PROFILE_SCHEMA,
    );
    return NextResponse.json({ profile });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
