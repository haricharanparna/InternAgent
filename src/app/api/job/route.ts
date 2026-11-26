import { NextResponse } from "next/server";
import { fail } from "@/lib/http";
import { fetchOne } from "@/lib/jobs";

// One posting, fetched fresh from its own job board: the full text and
// whether the board still lists it. No AI.
export async function GET(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get("id")?.slice(0, 120) || "";
    if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
    const job = await fetchOne(id);
    if (job === undefined) return NextResponse.json({ status: "unknown" });
    if (job === null) return NextResponse.json({ status: "closed", checkedAt: new Date().toISOString() });
    return NextResponse.json(
      { status: "open", job, checkedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" } },
    );
  } catch (err) {
    return fail(err);
  }
}
