import type { BuiltResume, Profile, TailoredResume } from "./types";

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

// ---------- Resume builder ----------

// Plain-text version for pasting into application forms.
export function builtResumeText(r: BuiltResume) {
  const lines = [r.name, r.contact.join(" | "), ""];
  if (r.summary) lines.push(r.summary, "");
  if (r.education.length) {
    lines.push("EDUCATION");
    for (const e of r.education) lines.push([e.school, e.date].filter(Boolean).join(" — "), e.degree, ...e.details);
    lines.push("");
  }
  if (r.experiences.length) {
    lines.push("EXPERIENCE");
    for (const e of r.experiences) {
      lines.push([[e.title, e.organization].filter(Boolean).join(", "), e.location, e.dates].filter(Boolean).join(" — "));
      lines.push(...e.bullets.map((b) => `• ${b}`), "");
    }
  }
  if (r.skills.length) lines.push("SKILLS", ...r.skills.map((g) => `${g.label}: ${g.items.join(", ")}`));
  return lines.join("\n").trim();
}

// Opens the built resume as a print-ready page; "Save as PDF" makes the file.
export function printBuiltResume(r: BuiltResume) {
  const win = window.open("", "_blank");
  if (!win) {
    alert("Please allow pop-ups for this site to download the PDF.");
    return;
  }
  const edu = r.education
    .map((e) => `<div class="exp"><div class="row"><b>${esc(e.school)}</b><span>${esc(e.date)}</span></div>
      ${e.degree ? `<div>${esc(e.degree)}</div>` : ""}${e.details.map((d) => `<div class="detail">${esc(d)}</div>`).join("")}</div>`)
    .join("");
  // Extra CSS for the chosen style (Classic is the base).
  const theme =
    r.template === "modern"
      ? `body { font-family: "Helvetica Neue", Arial, sans-serif; font-size: 10pt; } h1, .contact { text-align: left; } h2 { color: #1d4ed8; border-bottom: 2px solid #1d4ed8; }`
      : r.template === "compact"
        ? `body { font-family: "Helvetica Neue", Arial, sans-serif; font-size: 9.5pt; line-height: 1.22; } h1, .contact { text-align: left; } h1 { font-size: 17pt; } h2 { margin: 9px 0 4px; border-bottom-color: #bbb; } ul { margin: 1px 0 5px; }`
        : "";
  const exps = r.experiences
    .map((e) => `<div class="exp"><div class="row"><b>${esc(e.title)}${e.organization ? `, <span class="org">${esc(e.organization)}</span>` : ""}</b><span>${esc([e.location, e.dates].filter(Boolean).join(" · "))}</span></div>
      <ul>${e.bullets.filter(Boolean).map((b) => `<li>${esc(b)}</li>`).join("")}</ul></div>`)
    .join("");
  win.document.write(`<!doctype html><html><head><meta charset="utf-8">
<title>${esc(r.name || "Resume")} - Resume</title>
<style>
  @page { margin: 0.55in; }
  body { font-family: Georgia, "Times New Roman", serif; color: #111; font-size: 10.5pt; line-height: 1.32; max-width: 7.4in; margin: 0 auto; }
  h1 { font-size: 20pt; margin: 0; text-align: center; }
  .contact { color: #333; font-size: 9.5pt; margin-top: 3px; text-align: center; }
  h2 { font-size: 10.5pt; text-transform: uppercase; letter-spacing: .08em; border-bottom: 1px solid #888; padding-bottom: 2px; margin: 12px 0 5px; }
  .row { display: flex; justify-content: space-between; gap: 12px; }
  .row span { color: #333; font-style: italic; white-space: nowrap; }
  .org { font-weight: normal; }
  .detail { color: #222; }
  ul { margin: 2px 0 7px; padding-left: 17px; }
  li { margin: 1px 0; }
  p { margin: 0; }
  .exp { break-inside: avoid; margin-bottom: 4px; }
  ${theme}
</style></head><body>
<h1>${esc(r.name)}</h1>
<div class="contact">${r.contact.map(esc).join(" &nbsp;|&nbsp; ")}</div>
${r.summary ? `<h2>Summary</h2><p>${esc(r.summary)}</p>` : ""}
${edu ? `<h2>Education</h2>${edu}` : ""}
${exps ? `<h2>Experience</h2>${exps}` : ""}
${r.skills.length ? `<h2>Skills</h2>${r.skills.map((g) => `<div><b>${esc(g.label)}:</b> ${g.items.map(esc).join(", ")}</div>`).join("")}` : ""}
<script>window.onload = () => setTimeout(() => window.print(), 200);</script>
</body></html>`);
  win.document.close();
}

// A plain, print-ready letter (used for cover letters).
export function printLetter(title: string, body: string) {
  const win = window.open("", "_blank");
  if (!win) {
    alert("Please allow pop-ups for this site to download the PDF.");
    return;
  }
  const paras = body.split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  @page { margin: 1in; }
  body { font-family: Georgia, "Times New Roman", serif; color: #111; font-size: 11.5pt; line-height: 1.45; max-width: 6.5in; margin: 0 auto; }
  p { margin: 0 0 12px; }
</style></head><body>
<p>${esc(new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }))}</p>
${paras}
<script>window.onload = () => setTimeout(() => window.print(), 200);</script>
</body></html>`);
  win.document.close();
}
