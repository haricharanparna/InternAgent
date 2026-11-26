// Offer comparison and duplicate checks: plain math on what the student enters.

export type OfferRatings = { learning: number; team: number; location: number; future: number };
export type OfferDetails = { pay?: number; start?: string; decideBy?: string; ratings?: Partial<OfferRatings> };

export const RATING_LABELS: Record<keyof OfferRatings, string> = {
  learning: "What you'd learn",
  team: "Team and manager",
  location: "Location and living costs",
  future: "Return offer and career path",
};

// 0–100: 30% hourly pay (against the best offer you entered), 70% your own 1–5 ratings.
// Unrated items count as 3 (neutral) so a half-filled offer isn't punished or boosted.
export function offerScore(o: OfferDetails, bestPay: number): number {
  const keys = Object.keys(RATING_LABELS) as (keyof OfferRatings)[];
  const avg = keys.reduce((n, k) => n + (o.ratings?.[k] || 3), 0) / keys.length; // 1..5
  const ratingPart = (avg - 1) / 4; // 0..1
  const payPart = bestPay > 0 && o.pay ? Math.min(1, o.pay / bestPay) : 0.5;
  return Math.round((0.3 * payPart + 0.7 * ratingPart) * 100);
}

const norm = (s: string) => s.toLowerCase().replace(/\((.*?)\)|summer|fall|spring|winter|20\d\d|intern(ship)?|[^a-z0-9]/g, "");
const normUrl = (u: string) => u.trim().toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/[?#].*$/, "").replace(/\/$/, "");

// The same internship saved twice: same link, or same company and the same role name
// once season, year and "intern" are set aside.
export function sameJob(a: { company: string; title: string; url?: string }, b: { company: string; title: string; url?: string }) {
  if (a.url && b.url && normUrl(a.url) && normUrl(a.url) === normUrl(b.url)) return true;
  return norm(a.company) === norm(b.company) && norm(a.title) !== "" && norm(a.title) === norm(b.title);
}
