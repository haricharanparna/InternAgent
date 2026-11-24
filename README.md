# InternAgent

**Live app: https://intern-agent-gs6m.vercel.app** · free, no account needed

An honest AI agent for students hunting internships. Upload your resume (or build one by answering a few questions) and it searches 4,600+ live internships from 1,300+ companies, scores how well you fit each one, tailors your resume for a posting **without inventing anything**, and tracks your applications.

## Try it in 60 seconds
1. Open the [live app](https://intern-agent-gs6m.vercel.app) and click **Try with a sample resume** (or upload your own PDF, or open **Build a resume** if you don't have one).
2. Click **Find internships**, then **Score next 12 with AI**.
3. On any card, click **Tailor my resume** to see your bullets reworded side by side with the originals, or **About this role** for a plain-English summary.
4. Click **Save & get next steps** to see a plan for that job, then try **Emails & cover letter** and **Interview prep**.
5. Open the **Applications**, **Impact** and **How it works** tabs.

## Features
| Feature | What it does |
|---|---|
| Resume builder | For students without a resume: five short steps of plain questions (about you, education, experience, skills, goal). AI writes the summary, bullets and skill groups; name, contact, school and dates are copied by code. Every line is editable next to a live page preview, with free resume checks, Classic, Modern and Compact styles, ✨ per-bullet rewrite ideas (new numbers filtered out), PDF download, copy as text, and one click to use it for the job search. |
| Resume → profile | Gemini reads a PDF and extracts skills, experience, projects and interests into a fixed JSON schema. |
| 4,600+ live internships | Pulled from 60 company job boards (Greenhouse, Lever, Ashby) and the SimplifyJobs list; filtered to upcoming terms and deduplicated. |
| Search filters | Filter by field, pay listed, visa sponsorship, remote / near you, new since your last visit, and hide saved jobs; sort by best match, newest, keyword match, highest pay or company. |
| Keyword match | Each card shows what % of the hard skills a posting names appear on your resume (green at 70%+), with matched and missing skills. Plain code against a list of about 160 skills, no AI. |
| Freshness | Cards show how long ago the posting went up, and postings that weren't there on your last search get a **New** badge. |
| Info-rich job cards | Source, category, remote/hybrid, a description snippet, term, hourly pay, degree level, visa sponsorship and which of your skills the posting mentions, all read directly from the posting (no AI). |
| Honest fit scores | 0–100 with matched requirements, missing requirements and a one-line reason. |
| Tailored resumes | Bullets reworded for one posting, shown next to the originals, downloadable as a PDF. The server drops any skill that isn't on your resume. |
| About this role | Plain-English summary of the role, plus company background from Wikipedia with a source link. |
| Next steps for the job you chose | Saving a job opens a plan written for that posting and your stage (saved, applied, interview, offer, rejected): ordered steps with timing, what to prepare, and the email to send. Dates like the follow-up day are computed by the server, never guessed by the AI. |
| Internship email writer | Six email types (reach out, follow up, thank you, ask for a referral, accept, decline) drafted from your resume and notes, with [placeholders] for anything unknown, editable, copyable or opened in your email app. |
| Cover letters | A seventh writer type: a four-paragraph, 230–330 word letter from your resume and the posting, downloadable as a PDF. |
| Interview prep | Seven likely questions for the posting (behavioral, technical, why this role, skill gap), each with why it's asked and which of your experiences to use. Answer by typing or out loud (browser speech recognition), see your speaking time, and get STAR feedback with a tighter version that adds no new facts. |
| Add a job from anywhere | Found a role on LinkedIn, Handshake or at a career fair? Add it with the pasted description and it gets the same plan, emails, cover letter and interview prep. |
| Contacts | A People tab on each application for recruiters, interviewers and friends at the company, with "last contacted" dates and a one-click email to them. |
| Application tracker | Weekly application goal, Saved → Applied → Interview → Offer → Rejected board, response rate, notes, application deadlines and interview dates, a "coming up" banner, 7-day follow-up reminders, one-click calendar export (.ics) and CSV export. |
| Near me / remote | One click finds your city and state (coordinates rounded, never stored) and filters to nearby or remote roles. |
| AI assistant | Chat bubble for interview prep, follow-up emails and skill advice, personalized to your profile. |
| Impact tab | Your own numbers (postings scored, resumes tailored, response rate, time saved with editable assumptions) and live market stats. |
| How it works tab | Every formula and rule the backend uses, with live numbers and an interactive keyword-score calculator. |
| Your data, your device | Everything is stored in your browser. Save a backup file, restore it on another device, or delete it all from the settings menu. |
| Accessibility | Text size, high contrast, readable font (Atkinson Hyperlegible), wider spacing, reduced motion, strong focus outlines, dark mode. |

## How it works
```
Resume PDF ──▶ /api/parse-resume (Gemini) ──▶ profile (stored in your browser)
                                                   │
Job boards + SimplifyJobs ──▶ /api/jobs ──▶ keyword rank in browser ──▶ /api/score (Gemini, 12 at a time)
                                                   │
                       /api/tailor · /api/explain · /api/chat (Gemini) ──▶ tracker (your browser)
```

**Collecting jobs.** All boards are fetched in parallel; a failing board is skipped. A posting is kept if its title matches `/\b(intern|internship|co-?op)\b/i`. SimplifyJobs listings must be active and either list a term matching `/202[7-9]|Fall 2026|Winter 2026/` or have been posted in the last 150 days. Duplicates are removed by `lowercase(company|title)`, with company boards loaded first so the version with a full description wins.

**Keyword ranking (free, in the browser).**
`k(job) = Σ over t in (skills ∪ interests) of [t appears in title + description]`, then sort by k.

**AI fit score.** Profile + 12 postings per request, descriptions trimmed to 1,800 characters, temperature 0.2, strict JSON schema `{ id, score 0–100, matched[≤5], missing[≤5], reason }`. Card labels: ≥ 75 Strong fit, 50–74 Possible fit, < 50 Long shot.

**Tailoring guard.** `skills_shown = [AI-ordered skills that case-insensitively match your skills] + [your remaining skills]`; original bullets always come from your profile, never from the AI.

**Next steps.** `follow-up date = appliedAt + 7 days` and `days since applied` are computed on the server and given to the model as facts; the plan is regenerated whenever the stage changes.

**Resume builder guards.** Skills must match what you typed (anything else is dropped; anything left out goes under "Other"). A bullet is dropped if it contains a number that isn't in your answers for that experience. Verb tense comes from your dates (present only for ongoing work). The checks panel (action verbs, bullet length, share of bullets with numbers, placeholders, about 550 words for one page) is plain code, no AI.

**Tracker.** `response rate = |interview ∪ offer ∪ rejected| ÷ |status ≠ saved|`; a follow-up is due when `status = applied` and 7 days have passed since `appliedAt`.

The **How it works** tab in the app shows all of this with live numbers.

## Reliability
- **Model fallback:** `gemini-3.5-flash-lite → gemini-3.1-flash-lite → gemini-3.8-flash`. On 404/429/500/503/504 or a 30 s timeout, the next model is tried.
- **Rate limiting:** 20 AI requests per minute per IP, so one visitor can't exhaust the shared free quota.
- **Caching:** `/api/jobs` and `/api/stats` are cached for 1 hour at Vercel's CDN (`s-maxage=3600, stale-while-revalidate=86400`) and in server memory. Empty results are never cached.
- **Partial failures:** if some job boards fail, the rest still load. If all fail, the API returns a clear 503 instead of an empty list.
- **Input limits:** PDFs ≤ 5 MB, chat history ≤ 12 messages × 2,000 characters, 12 postings per scoring call.
- **Error handling:** every route returns `{ error }` with a readable message; the UI shows it with a retry, and a crash screen keeps your saved data.
- **Health check:** [`/api/health`](https://intern-agent-gs6m.vercel.app/api/health) reports whether AI is configured and the model chain, without using AI quota.

## API reference
| Method | Endpoint | Body | Returns |
|---|---|---|---|
| GET | `/api/jobs` | none | `{ jobs: Job[] }` |
| GET | `/api/stats` | none | totals, categories, states, terms, pipeline facts |
| GET | `/api/health` | none | `{ status, aiConfigured, models }` |
| POST | `/api/parse-resume` | form-data `resume` (PDF) | `{ profile }` |
| POST | `/api/score` | `{ profile, jobs }` (≤ 12 used) | `{ fits: Fit[] }` |
| POST | `/api/tailor` | `{ profile, job }` | `{ resume }` |
| POST | `/api/explain` | `{ job }` | `{ info }` |
| POST | `/api/build-resume` | `{ answers }` | `{ resume }` |
| POST | `/api/next-steps` | `{ profile, opportunity }` | `{ plan }` |
| POST | `/api/interview` | `{ mode: "questions" or "feedback", profile, opportunity, question?, answer? }` | `{ questions }` or `{ feedback }` |
| POST | `/api/improve-bullet` | `{ bullet, title?, organization?, siblings?, target? }` | `{ options, question }` |
| POST | `/api/email` | `{ profile, opportunity, type, recipient?, extra? }` | `{ draft }` |
| POST | `/api/chat` | `{ messages, profile }` | `{ reply }` |

Errors: `{ error: string }` with status 400, 429 (rate limit, includes `Retry-After`), 500 or 503. Types are in [`src/lib/types.ts`](src/lib/types.ts).

## Tech stack (100% free)
- Next.js 15, React 19, Tailwind CSS 4, TypeScript, deployed on Vercel's free Hobby plan
- Google Gemini API (free tier) via `@google/genai`
- Greenhouse, Lever and Ashby public job board APIs, plus SimplifyJobs on GitHub (no keys needed)
- Wikipedia API (company summaries), BigDataCloud (city lookup), Google favicon service (logos)
- Your profile, tracker, usage counts and settings are stored only in your browser (localStorage)

## Run it locally
1. Install Node.js 20+.
2. Get a free Gemini API key at https://aistudio.google.com/apikey
3. Copy `.env.example` to `.env.local` and paste your key into `GEMINI_API_KEY`.
4. Run:
   ```bash
   npm install
   npm run dev
   ```
5. Open http://localhost:3000

| Variable | Required | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | yes | Google AI Studio key used by all AI routes |
| `GEMINI_MODEL` | no | Put a specific model first in the fallback chain |

## Deploy your own
1. Fork this repo and import it at [vercel.com/new](https://vercel.com/new) (framework: Next.js, no build settings to change).
2. Add `GEMINI_API_KEY` under **Settings → Environment Variables** for Production.
3. Deploy. Check `/api/health` returns `"status": "ok"`.

## Project structure
```
src/app/            pages, error screen and API routes (src/app/api/*)
src/components/     JobList, TailorPanel, Tracker, Impact, HowItWorks, ChatWidget, ...
src/lib/            jobs (sources + dedupe), jobFacts (card facts), gemini (fallback),
                    rateLimit, tracker, location, a11y, usage, types
public/             sample-resume.pdf (fictional student)
```

## Responsible AI
- Prompts forbid inventing skills or experience, and the server enforces it for skills. Tailored bullets are shown next to the originals so you can check every change.
- Scores are estimates and can be wrong. The app says so and links to the full posting.
- Job card facts (pay, term, visa, skills mentioned) are read straight from the posting with plain code, not generated by AI.
- Resumes are not stored on a server. Location is only used to find your city and state; coordinates are rounded and never saved. On Gemini's free tier, Google may use prompts to improve its products, so don't upload anything you consider sensitive.
- Job data comes only from official public job board APIs and the public SimplifyJobs list. Nothing is scraped.

## Troubleshooting
| Symptom | Fix |
|---|---|
| "The AI isn't configured on this server yet" | Add `GEMINI_API_KEY` in Vercel (Production) and redeploy. |
| "Free-tier rate limit reached" | Gemini's free tier allows a limited number of requests per minute. Wait a minute. |
| "You're going a little fast" | The app's own limit (20 AI requests/minute). Wait the number of seconds shown. |
| First search is slow | A cold start fetches every job board (about 5–10 s). Later searches come from the cache. |

## Limitations
- Company job boards are hand-picked in `src/lib/jobs.ts`. SimplifyJobs postings only include a title, category and term, so their fit scores are rougher.
- The rate limiter is per server instance, so it's a safety net rather than a hard global limit.
- Your data lives in one browser. Use **Save backup** in the settings menu to move it to another device.

## License
[MIT](LICENSE)
