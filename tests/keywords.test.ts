import { test } from "node:test";
import assert from "node:assert/strict";
import { keywordMatch } from "../src/lib/keywords.ts";
import type { Job, Profile } from "../src/lib/types.ts";

const profile: Profile = {
  name: "Sam", email: "", school: "State U", major: "Computer Science", graduationYear: "2027",
  skills: ["Python", "JS", "Postgres"],
  experiences: [{ title: "Data intern", organization: "Lab", kind: "job", bullets: ["Analyzed data with pandas and built dashboards in Tableau"] }],
  interests: [],
};

const job = (description: string, source: Job["source"] = "greenhouse"): Job => ({
  id: "1", title: "Software Engineering Intern", company: "Acme", location: "Remote", url: "", source,
  description: description.padEnd(320, " "),
});

test("matches skills across spellings and lists what's missing", () => {
  const m = keywordMatch(job("We use Python, JavaScript, SQL, pandas, Tableau and Docker every day."), profile);
  assert.ok(m);
  assert.deepEqual(m.matched.sort(), ["JavaScript", "Python", "SQL", "Tableau", "pandas"].sort());
  assert.deepEqual(m.missing, ["Docker"]);
  assert.equal(m.pct, 83);
});

test("returns null when the posting is too short or names too few skills", () => {
  assert.equal(keywordMatch(job("Python and Docker."), profile), null);
  assert.equal(keywordMatch({ ...job("Python, SQL, Docker"), description: "Python, SQL, Docker" }, profile), null);
});

test("returns null for SimplifyJobs listings, which have no description", () => {
  assert.equal(keywordMatch(job("Python, SQL, Docker, Tableau", "simplify"), profile), null);
});

test("does not match one-letter or common-word skills from ordinary prose", () => {
  const m = keywordMatch(job("You will go to meetings and see a lot. Python, SQL, Docker and Kubernetes required."), profile);
  assert.ok(m);
  assert.ok(!m.matched.includes("Go") && !m.missing.includes("Go"));
  assert.ok(!m.missing.includes("C") && !m.missing.includes("R"));
});
