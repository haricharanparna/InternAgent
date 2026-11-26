import { test } from "node:test";
import assert from "node:assert/strict";
import { dropMissingClaims, dropSentencesWithNewNumbers, keepKnown, listedOnly, numbersIn, onlyKnownNumbers, scrubFiller, softenListedSkills, unlinkUnusedSkills } from "../src/lib/honesty.ts";

const maya = {
  skills: ["Python", "R", "Excel", "Tableau"],
  experiences: [
    { title: "Cashier", organization: "Kroger", bullets: ["Handled customer checkout and helped train new cashiers"] },
    { title: "Campus Dining Survey Analysis", organization: "Class project", bullets: ["Cleaned survey responses in R and made charts for the dining office"] },
  ],
};

test("unlinkUnusedSkills removes a skill tied to an experience that never used it", () => {
  assert.equal(
    unlinkUnusedSkills("Highlight your Excel and R skills from your Campus Dining Survey Analysis project.", maya),
    "Highlight your R skills from your Campus Dining Survey Analysis project.",
  );
  assert.equal(
    unlinkUnusedSkills("Mention the Python, Excel and R work in your Campus Dining project.", maya),
    "Mention the R work in your Campus Dining project.",
  );
});

test("unlinkUnusedSkills drops the sentence when the false skill stands alone, keeping the rest", () => {
  assert.equal(
    unlinkUnusedSkills("Update your resume. Show how you used Tableau at Kroger. Then apply.", maya),
    "Update your resume. Then apply.",
  );
});

test("dropMissingClaims removes claims of a skill the resume doesn't show", () => {
  const missing = ["Fluent French", "SQL"];
  assert.equal(dropMissingClaims("I also bring skills in Python, Tableau, and fluent English and French.", missing, maya.skills),
    "I also bring skills in Python, Tableau, and fluent English.");
  assert.equal(dropMissingClaims("Hello. I am fluent in French. Thank you.", missing, maya.skills), "Hello. Thank you.");
  assert.equal(dropMissingClaims("I have used SQL and R.", missing, maya.skills), "I have used R.");
});

test("dropMissingClaims keeps learning plans, the posting's own words and skills the student has", () => {
  const missing = ["Fluent French", "SQL"];
  const ok = [
    "I'm taking an online SQL course this month.",
    "The role asks for fluent French and English.",
    "I cleaned survey data in R.",
  ];
  for (const t of ok) assert.equal(dropMissingClaims(t, missing, maya.skills), t);
});

test("unlinkUnusedSkills leaves true links and unlinked mentions alone", () => {
  const ok = [
    "Highlight the R analysis from your Campus Dining Survey Analysis project.",
    "Add your Python skill and your Campus Dining Survey Analysis project to your resume.",
    "List Excel in your skills section.",
    "Practice Tableau this week; your Kroger job shows customer service.",
  ];
  for (const t of ok) assert.equal(unlinkUnusedSkills(t, maya), t);
});

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
