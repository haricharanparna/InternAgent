import { NextResponse } from "next/server";
import { MODELS } from "@/lib/gemini";

// Quick status check for uptime monitors and judges. It never calls Gemini,
// so checking it doesn't use any AI quota.
export const dynamic = "force-dynamic";

export async function GET() {
  const aiConfigured = !!process.env.GEMINI_API_KEY;
  return NextResponse.json(
    {
      status: aiConfigured ? "ok" : "degraded",
      aiConfigured,
      models: MODELS,
      time: new Date().toISOString(),
    },
    { status: aiConfigured ? 200 : 503 },
  );
}
