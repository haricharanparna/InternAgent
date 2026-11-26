import type { TrackedApp } from "./tracker";
import type { Profile, TailoredResume } from "./types";
import { postingFacts } from "./postingFacts";

// One printable page with everything for an interview: the role, key facts from
// the posting, the resume you sent, your research notes, practice questions and
// questions to ask. Built from what's already saved in this browser.

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const read = <T,>(key: string, fallback: T): T => { try { return JSON.parse(localStorage.getItem(key) || "") as T; } catch { return fallback; } };
const RESEARCH_Q = ["What they make, and who uses it", "What this team does", "Recent news", "A value in their words", "Why you"];

export function packetHtml(app: TrackedApp, profile: Profile | null): string {
  const facts = postingFacts({ id: app.id, title: app.title, company: app.company, location: app.location, url: app.url, source: "greenhouse", description: app.description || "" })
    .filter((f) => f.key !== "where" || app.location === "Not listed");
  const versions = read<Record<string, { at: string; resume: TailoredResume }[]>>("internagent.resumeVersions", {})[app.id] || [];
  const sent = app.resumeUsed?.kind === "tailored" ? versions.find((v) => v.at === app.resumeUsed!.at)?.resume : undefined;
  const research = read<Record<string, string[]>>("internagent.research", {})[app.company] || [];
  const prep = app.prep;
  const list = (items: string[]) => items.length ? `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>` : "";
  const section = (title: string, body: string) => (body.trim() ? `<h2>${esc(title)}</h2>${body}` : "");
  const when = (iso?: string) => (iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: iso.length > 10 ? "numeric" : undefined, minute: iso.length > 10 ? "2-digit" : undefined }) : "");

  const resumeBody = sent
    ? `<p class="muted">Tailored version you sent (${esc(when(app.resumeUsed!.at))}).</p>${sent.summary ? `<p>${esc(sent.summary)}</p>` : ""}${sent.experiences.map((e) => `<h3>${esc(e.title)}${e.organization ? `, ${esc(e.organization)}` : ""}</h3>${list(e.bullets.map((b) => b.tailored))}`).join("")}`
    : profile
      ? `<p class="muted">${app.resumeUsed?.kind === "original" ? "Your original resume." : "Your resume (mark which version you sent in Next steps)."}</p>${profile.experiences.map((e) => `<h3>${esc(e.title)}${e.organization ? `, ${esc(e.organization)}` : ""}</h3>${list(e.bullets)}`).join("")}`
      : "";

  const practice = prep?.questions.length
    ? `<ol>${prep.questions.map((q, i) => `<li><b>${esc(q.q)}</b>${q.useThis ? `<br><span class="muted">Use: ${esc(q.useThis)}</span>` : ""}${prep.feedback?.[i]?.stronger ? `<br>Your answer: ${esc(prep.feedback[i].stronger)}` : prep.answers?.[i] ? `<br>Your answer: ${esc(prep.answers[i])}` : ""}</li>`).join("")}</ol>`
    : "";

  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(`${app.company} interview packet`)}</title>
<style>
  @page { margin: 0.7in; }
  body { font-family: Georgia, "Times New Roman", serif; color: #111; font-size: 10.5pt; line-height: 1.4; max-width: 7in; margin: 0 auto; }
  h1 { font-size: 17pt; margin: 0; } h2 { font-size: 12pt; margin: 16px 0 4px; border-bottom: 1px solid #ccc; padding-bottom: 2px; }
  h3 { font-size: 10.5pt; margin: 8px 0 2px; } ul, ol { margin: 2px 0; padding-left: 18px; } li { margin: 2px 0; }
  .muted { color: #555; } table { border-collapse: collapse; } td { padding: 1px 12px 1px 0; vertical-align: top; }
</style></head><body>
<h1>${esc(app.title)}</h1>
<p class="muted">${esc(app.company)} · ${esc(app.location)}${app.interviewAt ? ` · Interview ${esc(when(app.interviewAt))}` : ""}${app.appliedAt ? ` · Applied ${esc(when(app.appliedAt.slice(0, 10)))}` : ""}<br>${esc(app.url)}</p>
${section("Key facts from the posting", facts.length ? `<table>${facts.map((f) => `<tr><td><b>${esc(f.label)}</b></td><td>${esc(f.value)}</td></tr>`).join("")}</table>` : "")}
${section("Your research", research.some((r) => r?.trim()) ? `<table>${RESEARCH_Q.map((q, i) => research[i]?.trim() ? `<tr><td><b>${esc(q)}</b></td><td>${esc(research[i])}</td></tr>` : "").join("")}</table>` : "")}
${section("Practice questions", practice)}
${section("Questions to ask them", list((prep?.askThem || []).map((q) => q.q)))}
${section("People", list((app.contacts || []).map((c) => [c.name, c.role, c.email].filter(Boolean).join(", "))))}
${section("Your notes", app.notes ? `<p>${esc(app.notes).replace(/\n/g, "<br>")}</p>` : "")}
${section("Resume", resumeBody)}
<p class="muted" style="margin-top:18px;font-size:9pt">Made with InternAgent from what's saved in your browser.</p>
<script>window.onload = () => setTimeout(() => window.print(), 200);</script>
</body></html>`;
}

export function printPacket(app: TrackedApp, profile: Profile | null) {
  const win = window.open("", "_blank");
  if (!win) { alert("Please allow pop-ups for this site to print the packet."); return; }
  win.document.write(packetHtml(app, profile));
  win.document.close();
}
