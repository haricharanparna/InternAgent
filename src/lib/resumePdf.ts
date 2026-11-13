import type { Profile, TailoredResume } from "./types";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Opens a print-ready resume in a new tab; the browser's "Save as PDF" does the rest.
export function downloadResumePdf(profile: Profile, resume: TailoredResume, company: string) {
  const win = window.open("", "_blank");
  if (!win) {
    alert("Please allow pop-ups for this site to download the PDF.");
    return;
  }
  const contact = [profile.email, profile.school, profile.major, profile.graduationYear && `Class of ${profile.graduationYear}`]
    .filter(Boolean)
    .map(esc)
    .join(" · ");
  const experiences = resume.experiences
    .map(
      (e) => `<div class="exp"><div class="row"><b>${esc(e.title)}</b><span>${esc(e.organization)}</span></div>
      <ul>${e.bullets.map((b) => `<li>${esc(b.tailored)}</li>`).join("")}</ul></div>`,
    )
    .join("");

  win.document.write(`<!doctype html><html><head><meta charset="utf-8">
<title>${esc(profile.name || "Resume")} - ${esc(company)}</title>
<style>
  @page { margin: 0.6in; }
  body { font-family: Georgia, "Times New Roman", serif; color: #111; font-size: 11pt; line-height: 1.35; max-width: 7.3in; margin: 0 auto; }
  h1 { font-size: 20pt; margin: 0; }
  .contact { color: #444; font-size: 10pt; margin-top: 2px; }
  h2 { font-size: 11pt; text-transform: uppercase; letter-spacing: .08em; border-bottom: 1px solid #999; padding-bottom: 2px; margin: 16px 0 6px; }
  .row { display: flex; justify-content: space-between; gap: 12px; }
  .row span { color: #444; font-style: italic; }
  ul { margin: 3px 0 8px; padding-left: 18px; }
  li { margin: 2px 0; }
  .exp { break-inside: avoid; }
</style></head><body>
<h1>${esc(profile.name)}</h1>
<div class="contact">${contact}</div>
<h2>Summary</h2><p>${esc(resume.summary)}</p>
<h2>Skills</h2><p>${resume.skills.map(esc).join(" · ")}</p>
<h2>Experience &amp; Projects</h2>${experiences}
<script>window.onload = () => setTimeout(() => window.print(), 200);</script>
</body></html>`);
  win.document.close();
}
