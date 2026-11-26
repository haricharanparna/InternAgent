import { test } from "node:test";
import assert from "node:assert/strict";
import { checkResume } from "../src/lib/resumeCheck.ts";
import type { Profile } from "../src/lib/types.ts";

const base: Profile = {
  name: "Sam", email: "sam@uni.edu", school: "State U", major: "CS", graduationYear: "2028",
  skills: ["Python", "SQL", "Git", "React", "Excel"], interests: [],
  experiences: [{ title: "Tutor", organization: "Math Center", kind: "job", bullets: [
    "Tutored 40 students a week in calculus and statistics",
    "Built a Python script that cut grading time by 30%",
    "Organized 6 review sessions before finals",
  ] }],
};

test("a clean resume passes with a high score", () => {
  const r = checkResume(base);
  assert.equal(r.findings.length, 0);
  assert.equal(r.score, 100);
  assert.ok(r.passed.some((p) => p.includes("3 of 3 bullets")));
});

test("flags weak openers, pronouns and missing contact, quoting the bullet", () => {
  const r = checkResume({ ...base, email: "", experiences: [{ ...base.experiences[0], bullets: ["Responsible for helping students with homework", "I made flashcards for my classes"] }] });
  assert.ok(r.findings.some((f) => f.level === "fix" && f.text.includes("email")));
  const weak = r.findings.find((f) => f.text.includes("responsible for"));
  assert.equal(weak?.quote, "Responsible for helping students with homework");
  assert.ok(r.findings.some((f) => f.text.includes('"I"') && f.quote === "I made flashcards for my classes"));
  assert.ok(r.score < 80);
});

test("flags experiences with no bullets and few numbers", () => {
  const r = checkResume({ ...base, experiences: [
    { title: "Robotics Club", organization: "", kind: "club", bullets: [] },
    { title: "Intern", organization: "Shop", kind: "job", bullets: ["Answered customer questions by phone", "Restocked shelves every morning shift", "Trained new hires on the register"] },
  ] });
  assert.ok(r.findings.some((f) => f.text.includes('"Robotics Club" has no bullet')));
  assert.ok(r.findings.some((f) => f.text.startsWith("0 of 3 bullets have a number")));
});

test("doesn't read AI or the letter I inside words as a pronoun", () => {
  const r = checkResume({ ...base, experiences: [{ ...base.experiences[0], bullets: ["Trained an AI model on 2,000 images", "Implemented 3 iOS screens in Swift", "Led a team of 4 in the campus hackathon"] }] });
  assert.ok(!r.findings.some((f) => f.text.includes('"I"')));
});
