import { test } from "node:test";
import assert from "node:assert/strict";
import { similarJobs, titleWords } from "../src/lib/similar.ts";
import type { Job } from "../src/lib/types.ts";

const j = (id: string, company: string, title: string): Job => ({ id, title, company, location: "", url: "", source: "greenhouse", description: "" });

test("title words drop season, year and filler, and fold short forms", () => {
  assert.deepEqual([...titleWords("SWE Intern (Summer 2027)")], ["software"]);
  assert.deepEqual([...titleWords("Software Engineering Intern")], ["software", "engineer"]);
});

test("finds the same kind of role at other companies, one per company", () => {
  const me = j("1", "A", "Data Analyst Intern");
  const all = [me, j("2", "A", "Data Analyst Intern II"), j("3", "B", "Data Analytics Intern"), j("4", "B", "Data Analyst Intern, Finance"), j("5", "C", "Marketing Intern"), j("6", "D", "Data Analyst")];
  const out = similarJobs(me, all).map((x) => x.id);
  assert.ok(!out.includes("2"), "same company excluded");
  assert.ok(!out.includes("5"), "different role excluded");
  assert.ok(out.includes("6"));
  assert.equal(out.filter((id) => id === "3" || id === "4").length, 1);
});
