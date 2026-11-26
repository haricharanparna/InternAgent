import { NextResponse } from "next/server";

// One error response for every API route. A body that isn't valid JSON gets a
// 400; a lost connection gets a 503; internal crash messages ("Cannot read
// properties of undefined") are replaced with a plain sentence. Messages we
// wrote ourselves (rate limits, "AI is busy") pass through unchanged.
export function fail(err: unknown) {
  const e = err as Error;
  if (e instanceof SyntaxError) {
    return NextResponse.json({ error: "That request wasn't readable. Refresh the page and try again." }, { status: 400 });
  }
  if (e instanceof TypeError && /fetch failed|network/i.test(e.message)) {
    return NextResponse.json({ error: "Couldn't reach an outside service. Check back in a minute." }, { status: 503 });
  }
  const internal = !e?.message || /cannot read|undefined|not a function|not iterable|null/i.test(e.message);
  return NextResponse.json(
    { error: internal ? "Something went wrong on our side. Please try again." : e.message },
    { status: 500 },
  );
}
