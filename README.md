# InternAgent

An honest AI agent for students hunting internships. Upload your resume and it finds live internships, scores how well you fit each one, and explains exactly what you match and what you're missing. It never invents experience.

Built for SLAY HACKS 2026.

## Features
- **Resume → profile:** upload a PDF (or try the built-in sample), and Gemini extracts your skills, experience, projects and interests.
- **4,600+ live internships from 1,300+ companies:** pulled from public company job boards (Greenhouse, Lever, Ashby) and the community-run SimplifyJobs list, with duplicates removed and expired terms filtered out.
- **Honest fit scoring:** the AI scores each posting 0–100 and lists matched and missing requirements with a one-line reason.
- **Tailored resumes:** bullets rewritten for one posting, shown side by side with the original, downloadable as a PDF. The server rejects any skill not on your resume.
- **Application tracker:** a Saved → Applied → Interview → Offer → Rejected board with stats, notes, and 7-day follow-up reminders.
- **Near me and remote filters:** one click uses your location (city and state only) to show nearby and remote roles.
- **AI assistant:** a chat bubble for interview prep, follow-up emails and skill advice, personalized to your profile.
- **Accessibility settings:** text size, high contrast, a readable font (Atkinson Hyperlegible), wider spacing, reduced motion, and strong focus outlines.
- **Dark mode** and real company logos.

## Tech stack (100% free)
- Next.js 15, React 19, Tailwind CSS 4
- Google Gemini API (free tier) via `@google/genai`, with automatic fallback between models
- Greenhouse, Lever and Ashby public job board APIs, plus SimplifyJobs on GitHub (no keys needed)
- BigDataCloud free reverse geocoding (city lookup) and Google's favicon service (company logos)
- Your profile, tracker and settings are stored only in your browser (localStorage)

## Setup
1. Install Node.js 20+.
2. Get a free Gemini API key at https://aistudio.google.com/apikey
3. Copy `.env.example` to `.env.local` and paste your key into `GEMINI_API_KEY`.
4. Run:
   ```bash
   npm install
   npm run dev
   ```
5. Open http://localhost:3000

## Responsible AI
- Prompts forbid inventing skills or experience. Scores are based only on what's in your resume.
- Scores are estimates and can be wrong. The app says so and links to the full posting.
- Resumes are not stored on a server. Location is only used to find your city and state; coordinates are rounded and never saved. On Gemini's free tier, Google may use prompts to improve its products, so don't upload anything you consider sensitive.
- Job data comes only from official public job board APIs and the public SimplifyJobs list on GitHub. Nothing is scraped.

## Limitations
- Company job boards are hand-picked in `src/lib/jobs.ts` (add Greenhouse, Lever or Ashby slugs there). SimplifyJobs postings only include a title and category, so their fit scores are rougher.
- The free Gemini tier has rate limits, so scoring runs 12 postings at a time.
