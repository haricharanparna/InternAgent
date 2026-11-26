import { test } from "node:test";
import assert from "node:assert/strict";
import { dropSentencesWithNewNumbers, keepKnown, listedOnly, numbersIn, onlyKnownNumbers, scrubFiller, softenListedSkills } from "../src/lib/honesty.ts";

test("listedOnly finds skills no experience mentions", () => {
  const profile = {
    skills: ["R", "Tableau", "C++", "Excel"],
    experiences: [{ title: "Survey project", bullets: ["Cleaned survey data in R and wrote C++ helpers"] }],
  };
  assert.deepEqual(listedOnly(profile), ["Tableau", "Excel"]);
});

test("softenListedSkills turns 'experience' claims into 'skills' for listed-only skills", () => {
  const only = ["Tableau", "C++"];
  assert.equal(softenListedSkills("Highlight your Tableau experience.", only), "Highlight your Tableau skills.");
  assert.equal(softenListedSkills("Mention your experience with Tableau and SQL.", only), "Mention your Tableau skills and SQL.");
  assert.equal(softenListedSkills("Show your C++ projects.", only), "Show your C++ skills.");
  assert.equal(softenListedSkills("Highlight your R experience.", only), "Highlight your R experience.");
});

test("numbersIn normalizes commas and ignores trailing punctuation", () => {
  assert.deepEqual([...numbersIn("Served 1,200 users in 2024. GPA 3.5.")], ["1200", "2024", "3.5"]);
});

test("a number from the source is allowed, in either spelling", () => {
  assert.ok(onlyKnownNumbers("Built a tool for 1200 students", "built a tool used by 1,200 students"));
  assert.ok(onlyKnownNumbers("Led weekly meetings", "led meetings"));
});

test("a number the student never gave is rejected", () => {
  assert.equal(onlyKnownNumbers("Cut load time by 40%", "made the site faster"), false);
});

test("whole numbers are compared, so 2024 does not allow 20 or 4", () => {
  assert.equal(onlyKnownNumbers("Grew signups 20%", "Started the club in 2024"), false);
  assert.equal(onlyKnownNumbers("Managed 4 volunteers", "Started the club in 2024"), false);
});

test("dropSentencesWithNewNumbers keeps true sentences and drops invented ones", () => {
  const out = dropSentencesWithNewNumbers(
    "I cleaned the survey data. That saved the team 10 hours a week. We shared it with 3 classes.",
    "I cleaned survey data and we shared it with 3 classes",
  );
  assert.equal(out, "I cleaned the survey data. We shared it with 3 classes.");
});

test("dropSentencesWithNewNumbers leaves text without numbers alone", () => {
  assert.equal(dropSentencesWithNewNumbers("Plain answer. No numbers here!", ""), "Plain answer. No numbers here!");
});

test("scrubFiller removes inflating adverbs only", () => {
  assert.equal(scrubFiller("Successfully built and effectively tested the app"), "built and tested the app");
  assert.equal(scrubFiller("Built the app"), "Built the app");
});

test("keepKnown keeps only listed skills, in the student's spelling, without duplicates", () => {
  assert.deepEqual(keepKnown(["python", "Kubernetes", "PYTHON", "excel "], ["Python", "Excel"]), ["Python", "Excel"]);
});
