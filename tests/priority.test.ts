import { test } from "node:test";
import assert from "node:assert/strict";
import { priorityOf } from "../src/lib/priority.ts";
import type { Profile, ScoredJob } from "../src/lib/types.ts";

const NOW = Date.parse("2026-11-25T12:00:00Z");
const profile: Profile = {
  name: "Sam", email: "", school: "State U", major: "CS", graduationYear: "2028",
  skills: ["Python", "SQL", "React"], experiences: [], interests: [],
};
const job = (extra: Partial<ScoredJob>): ScoredJob => ({
  id: "1", title: "Software Intern", company: "Acme", location: "Remote", url: "https://x.com", source: "greenhouse",
  description: "Build things.", ...extra,
});
const factor = (p: ReturnType<typeof priorityOf>, label: string) => p.factors.find((f) => f.label === label)!;

test("score is the sum of the shown factors and never above 100", () => {
  const p = priorityOf(job({ fit: { id: "1", score: 100, matched: [], missing: [], reason: "" }, deadline: "2026-11-28T00:00:00Z", postedAt: "2026-11-24T00:00:00Z", description: "Graduating in 2028. Pay: $40 per hour." }), profile, NOW);
  assert.equal(p.score, p.factors.reduce((n, f) => n + f.points, 0));
  assert.equal(p.score, 100);
});

test("a graduation window that excludes the student scores 0 and warns", () => {
  const p = priorityOf(job({ description: "Candidates graduating between December 2026 and June 2027." }), profile, NOW);
  assert.equal(factor(p, "Eligibility").points, 0);
  assert.match(factor(p, "Eligibility").note, /2026–2027 graduates; you graduate in 2028/);
  assert.equal(p.warnings.length, 1);
});

test("'or later' windows include later graduates; passed deadlines drop to 0", () => {
  const p = priorityOf(job({ description: "Open to students graduating in 2027 or later.", deadline: "2026-11-01T00:00:00Z" }), profile, NOW);
  assert.equal(factor(p, "Eligibility").points, 20);
  assert.equal(factor(p, "Deadline").points, 0);
});

test("a PhD or MBA title is flagged for a student whose resume shows no graduate study", () => {
  const p = priorityOf(job({ title: "2027 Summer Intern, PhD, Data Science" }), profile, NOW);
  assert.equal(factor(p, "Eligibility").points, 3);
  assert.match(p.warnings[0], /PhD students/);
  const grad = priorityOf(job({ title: "MBA Intern, Strategy" }), { ...profile, major: "MBA" }, NOW);
  assert.notEqual(factor(grad, "Eligibility").points, 3);
});

test("unknowns get middle points, not zero, and say why", () => {
  const p = priorityOf(job({}), profile, NOW);
  assert.match(factor(p, "Deadline").note, /No deadline listed/);
  assert.match(factor(p, "Eligibility").note, /doesn't state/);
  assert.ok(p.score > 30 && p.score < 60);
});
