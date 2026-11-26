import { test } from "node:test";
import assert from "node:assert/strict";
import { dropSentencesWithNewNumbers, keepKnown, numbersIn, onlyKnownNumbers, scrubFiller } from "../src/lib/honesty.ts";

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
