# InternAgent

**Live app: https://intern-agent-gs6m.vercel.app** · free, no account needed

An honest AI agent for students hunting internships. Upload your resume (or build one by answering a few questions) and it searches 4,600+ live internships from 1,300+ companies, scores how well you fit each one, tailors your resume for a posting **without inventing anything**, and tracks your applications.

## Try it in 60 seconds
1. Open the [live app](https://intern-agent-gs6m.vercel.app) and click **Try with a sample resume** (or upload your own PDF, or open **Build a resume** if you don't have one).
2. Click **Find internships**, then **Score next 12 with AI**.
3. On any card, click **Tailor my resume** to see your bullets reworded side by side with the originals, or click the title (**Details & next steps**) to see the key facts, the full posting and a next-steps plan for that internship.
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
| Tailored resumes | Bullets reworded for one posting, shown next to the originals, downloadable as a PDF. The server drops any skill that isn't on your resume and keeps your original bullet if a rewrite adds a number. |
| Internship details & next steps | Click any internship to open its page: key facts read from the posting with no AI (pay, dates, length, deadline, who can apply, visa sponsorship, workplace, housing, full-time conversion), each with the exact sentence it came from; the full posting split into what you'd do, requirements and nice-to-haves; a live check that the company's job board still lists it; your keyword match; other internships at the same company; and a step-by-step plan for that job written from your resume. Save it and the plan comes with you to Applications. |
| Apply first (priority) | A box at the top of the search, and a sort option, ranking internships by what to apply to first: match (40) + eligibility (20: graduation year, and PhD/MBA/Master's-only titles) + deadline (20) + freshness (10) + pay listed (10). Every point is shown on the internship's page. It orders your list; it doesn't predict hiring. |
| Application readiness | On each internship: a checklist of what's done and what's left (resume covers the posting, eligibility, tailored resume, cover letter, deadline noted, someone to contact), with the fix for each. |
| Trust labels and scam warnings | Every listing says where it came from: **Official company job board** (loaded from the company's own Greenhouse, Lever or Ashby API), **Third-party list** (SimplifyJobs, not independently verified) or **Added by you**. Listings from elsewhere are checked for common scam signs (fees, gift cards, SSN or bank requests, chat-app-only interviews, unrealistic pay, link shorteners, links that don't go to the company), shown with the sentence that triggered them, including while you add a job. Nothing is ever labeled "verified" without a real check. |
| Plain-English search | Type "remote AI internships paying at least $20/hour for summer 2027" and the search understands pay, remote/hybrid/on-site, field, season and year, visa sponsorship and "beginner-friendly", and shows what it understood. Rule-based, so it's instant and free; leftover words still match titles, companies and cities. |
| Resume check | A score out of 100 on your profile card from plain rules (no AI): email, school and graduation year present, enough skills listed, every experience has bullets, bullets start with what you did (not "responsible for"), no "I"/"my", easy-to-skim length, varied verbs, and how many bullets show a number. Each finding quotes the bullet it's about. |
| Company watchlist | Watch a company from any internship's details. Watched companies show at the top of search with how many internships are open and new, and the bell tells you when they post new ones. |
| Getting-started guide | A five-step guide the first time you load a resume, skippable and remembered in your browser. |
| Notifications | A bell in the header lists follow-ups due, interviews this week, thank-you notes to send, deadlines coming up or passed, assessments to finish and new internships since your last search. Read state is saved in your browser. |
| Search tools | Length filter (up to 13 weeks / 4+ months, read from the posting), "Hide roles I may not qualify for", sort by deadline, saved searches, recently viewed, and "Not for me" to hide a listing. |
| Resume you sent | Every tailored resume is kept (last 3 per internship) in your browser. In an application's Next steps, mark which one you sent, or your original, and re-download it as PDF or Word before the interview. The Applications table shows it too. |
| Company research | A five-question checklist per company (what they make, what the team does, recent news, a value in their words, why you) with free links to the company site, news, interview experiences, pay reports and people on LinkedIn. Notes stay in your browser, and emails and cover letters can use them (tick the box) to say why this company, without adding anything you didn't write. |
| Offer comparison | Once an application reaches Offer, Applications shows your offers side by side: hourly pay (read from the posting, editable), start date, decide-by date, and your own 1–5 ratings for learning, team, location and career path. The score is shown as plain math (30% pay, 70% your ratings), and the bell reminds you before a decide-by date. Once you mark one accepted, it offers to withdraw your other open applications in one click. |
| Interview packet | One printable page per application: key facts from the posting, your research notes, practice questions with your answers, questions to ask them, people, notes and the resume version you sent. |
| Quiet applications | Applied 30+ days ago with no reply? The card says so and offers one click to move it to Rejected, so your pipeline numbers stay honest. |
| Similar internships | Each internship's details list up to 6 of the same kind of role at other companies, matched by the words in the title (SWE = Software Engineer, and so on). No AI. |
| Undo | Removing an application shows an Undo button for 8 seconds. |
| Saved search alerts | Each saved search shows how many new internships match it since your last visit, using the same filters as the list, and the bell tells you too. |
| Interview-day checklist | In Interview prep: a countdown and 8 checks. Practice, research, resume version and questions to ask tick themselves from what you've done; the rest (test the link, have your resume, pick 3 stories, send a thank-you) you tick. |
| Saved drafts | Every email and cover letter you write is kept with its application, including your edits: reopen it, mark it sent, or delete it (last 10 per application). A new cover letter can start from one you wrote for another application, with the company and role swapped. |
| Networking reminders | The bell reminds you to check in with a contact 3 weeks after you last talked, while the application is still open. |
| Leave things out | Add -word, "not X", "except X" or "without X" to a search ("data analyst -finance not healthcare") to drop roles with those words. |
| Storage meter | Settings shows how much of the browser's roughly 5 MB InternAgent uses, and warns at 80% to save a backup. If a save ever fails because storage is full, a banner says so instead of failing silently. |
| Your network | Everyone you've added under People, across all applications, in one list with when you last talked (oldest first), email and profile links. |
| Keyboard focus | Pop-up windows keep Tab inside them, and focus returns to where you were when they close. |
| Duplicate check | Adding an internship you already saved (same link, or same company and role) shows a warning with a link to the saved one, and saving the same role from search opens the one you already have. |
| Keyboard and recent searches | Press / to jump to the search box; Escape clears it. Your last 6 searches show under an empty box. Press ? to see every shortcut. |
| Practice timer | A 2-minute countdown in interview practice, a Random question button (hard ones first, then ones you haven't practiced) and Next question. Email tone and length choices are remembered. |
| Applications views | Board or table view (click a column to sort; tick rows to move them to a stage or remove them together, with Undo), search across your applications, and a "Your pipeline" panel: how far applications get (applied → heard back → interview → offer), applications per week for 8 weeks, and the skills your saved postings ask for most that your resume doesn't show. |
| Report a listing | Mark a listing as broken, closed, wrong or a possible scam. It's saved on your device, and you can open a prefilled GitHub issue (only the listing's details) to tell the maintainers. |
| Profile completion | Shows what's missing and why it matters (graduation year for eligibility, 5+ skills for keyword match, ...) and lets you correct what the resume reader got wrong. |
| Word download | Built and tailored resumes download as .docx as well as PDF, made in the browser with no extra library. |
| Compare | Tick up to 3 internships and compare match, priority, pay, dates, length, deadline, eligibility, visa, skills you'd need and source side by side, with "best for" picks that each say why. |
| Skill gaps tab | Counts, across today's postings that overlap with your resume, which missing skills are asked for most and which alone would make the most postings a strong match. Each has free resources (official docs, free courses, YouTube and freeCodeCamp searches) and a project idea. A What-If simulator recounts your strong matches if you learn the skills you tick, and a 4-week plan is built from them. Skills you mark as learning get a learning log: add hours as you study, see this week's total and progress toward about 20 hours. Once you can use a skill on your own, one click adds it to your profile so your matches update. No AI. |
| Plain-English explanation | On the details page: what the role involves, plus company background from Wikipedia with a source link. |
| Next steps for the job you chose | Saving a job opens a plan written for that posting and your stage (saved, applied, interview, offer, rejected): ordered steps with timing, what to prepare, and the email to send. Dates like the follow-up day are computed by the server, never guessed by the AI. |
| Internship email writer | Six email types (reach out, follow up, thank you, ask for a referral, accept, decline) drafted from your resume and notes, with [placeholders] for anything unknown, editable, copyable or opened in your email app. |
| Cover letters | A seventh writer type: a four-paragraph, 230–330 word letter from your resume and the posting, downloadable as a PDF. Choose a formal, conversational or enthusiastic tone and a standard or short length (emails too). |
| Interview prep | Seven likely questions for the posting (behavioral, technical, why this role, skill gap), each with why it's asked and which of your experiences to use. Answer by typing or out loud (browser speech recognition), see your speaking time, and get STAR feedback with a tighter version that adds no new facts. Also suggests questions to ask the interviewer, tracks your average score, and lets you mark hard questions to practice again. |
| Add a job from anywhere | Found a role on LinkedIn, Handshake or at a career fair? Add it with the pasted description and it gets the same plan, emails, cover letter and interview prep. |
| Contacts | A People tab on each application for recruiters, interviewers and friends at the company, with "last contacted" dates and a one-click email to them. |
| Application tracker | Weekly application goal, Saved → Applied → Assessment → Interview → Offer → Rejected → Withdrawn board, response rate, notes, application deadlines and interview dates, a "coming up" banner, 7-day follow-up reminders, one-click calendar export (.ics) and CSV export. |
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

**Tailoring guard.** `skills_shown = [AI-ordered skills that case-insensitively match your skills] + [your remaining skills]`; original bullets always come from your profile, never from the AI; a rewritten bullet is replaced by your original if it states any number your original doesn't, and summary sentences with numbers that aren't on your resume are removed.

**Number guard (shared).** `src/lib/honesty.ts` compares whole numbers ("1,200" = "1200", but "2024" does not allow "20" or "4"). It runs on tailored bullets and summaries, resume-builder bullets, ✨ bullet ideas and the interview "stronger answer", and strips filler like "successfully". `npm test` covers it.

**Skill guards (shared).** A sentence that ties a skill to an experience whose bullets never mention it ("your Excel skills from your survey project") loses that skill, or is dropped if the skill stood alone. In emails and cover letters, a first-person claim of a requirement your resume doesn't show ("I'm fluent in French") is removed, while plans to learn it are kept. A skill that's only on your skills list is never called "experience". These run on next-steps plans, emails, cover letters and the tailored summary.

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
| GET | `/api/job?id=` | job id | `{ status: "open" \| "closed" \| "unknown", job? }`, fetched fresh from the company's board |
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
1. Install Node.js 22.18+ (needed to run the tests directly from TypeScript).
2. Get a free Gemini API key at https://aistudio.google.com/apikey
3. Copy `.env.example` to `.env.local` and paste your key into `GEMINI_API_KEY`.
4. Run:
   ```bash
   npm install
   npm run dev
   ```
5. Open http://localhost:3000
6. Check your changes: `npm run typecheck` and `npm test` (the honesty guards and keyword match have unit tests). GitHub Actions runs both plus a production build on every push.

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
- Prompts forbid inventing skills or experience, and the server enforces it for skills and numbers. Tailored bullets are shown next to the originals so you can check every change.
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
