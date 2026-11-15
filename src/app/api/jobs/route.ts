import { NextResponse } from "next/server";
import { fetchInternships } from "@/lib/jobs";
import { findPay } from "@/lib/jobFacts";

// Longer than the AI routes ever read, so trimming only shrinks the response.
const MAX_DESC = 3500;

export async function GET() {
  try {
    const jobs = (await fetchInternships()).map((j) => {
      const description = j.description.slice(0, MAX_DESC);
      // Pay is often the last line of a long posting; keep it after trimming.
      const pay = j.description.length > MAX_DESC ? findPay(j.description) : undefined;
      return { ...j, description: pay && !findPay(description) ? `${description} Pay: ${pay.replace("/hr", " per hour")}.` : description };
    });
    if (!jobs.length) {
      return NextResponse.json({ error: "Job boards are not responding right now. Try again in a minute." }, { status: 503 });
    }
    // Vercel's CDN keeps a copy for an hour, so most visitors get it instantly.
    return NextResponse.json({ jobs }, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
