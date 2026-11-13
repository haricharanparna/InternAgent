import { NextResponse } from "next/server";
import { fetchInternships } from "@/lib/jobs";

// Longer than the AI routes ever read, so trimming only shrinks the response.
const MAX_DESC = 3500;

export async function GET() {
  try {
    const jobs = (await fetchInternships()).map((j) => ({ ...j, description: j.description.slice(0, MAX_DESC) }));
    return NextResponse.json({ jobs });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
