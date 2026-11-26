import { test } from "node:test";
import assert from "node:assert/strict";
import { skillGaps, whatIf } from "../src/lib/skillGaps.ts";
import type { Job, Profile } from "../src/lib/types.ts";

const profile: Profile = { name: "Sam", email: "", school: "", major: "CS", graduationYear: "2028", skills: ["Python", "SQL", "Git"], experiences: [], interests: [] };
const pad = (s: string) => s.padEnd(320, " ");
const job = (id: string, skills: string): Job => ({ id, title: "Software Intern", company: "A", location: "", url: "", source: "greenhouse", description: pad(`We use ${skills}.`) });

const jobs = [
  job("a", "Python, SQL, Git and React"), // 75% now
  job("b", "Python, SQL, React, Docker"), // 50% → 75% with React
  job("c", "Python, SQL, Git, React, Docker"), // 60% → 80% with React
  job("d", "Figma, Photoshop, Illustrator"), // not relevant (0 overlap)
];

test("ranks missing skills by how many postings they'd push into a strong match", () => {
  const r = skillGaps(jobs, profile);
  assert.equal(r.analyzed, 4);
  assert.equal(r.strongNow, 1);
  assert.equal(r.gaps[0].skill, "React");
  assert.equal(r.gaps[0].unlocks, 2);
  assert.deepEqual(r.gaps[0].unlockIds.sort(), ["b", "c"]);
});

test("what-if recounts strong matches with the added skills", () => {
  const w = whatIf(jobs, profile, ["React"]);
  assert.equal(w.before, 1);
  assert.equal(w.after, 3);
  assert.deepEqual(w.newlyStrong.map((x) => x.job.id).sort(), ["b", "c"]);
  assert.equal(whatIf(jobs, profile, []).after, 1);
});
