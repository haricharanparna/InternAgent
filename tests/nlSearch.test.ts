import { test } from "node:test";
import assert from "node:assert/strict";
import { matchesSearch, parseSearch } from "../src/lib/nlSearch.ts";
import type { Job } from "../src/lib/types.ts";

const job = (extra: Partial<Job>): Job => ({ id: "1", title: "Machine Learning Intern", company: "Acme", location: "Remote", url: "", source: "greenhouse", description: "Pay: $25 per hour.", ...extra });

test("understands a full plain-English request", () => {
  const p = parseSearch("Find remote AI internships paying at least $20/hour for summer 2027");
  assert.equal(p.payMin, 20);
  assert.equal(p.remote, true);
  assert.equal(p.field, "AI / ML");
  assert.equal(p.season, "summer");
  assert.equal(p.year, "2027");
  assert.deepEqual(p.words, []);
});

test("leftover words still search titles, companies and places", () => {
  const p = parseSearch("data internships in new york");
  assert.equal(p.field, "Data");
  assert.deepEqual(p.words, ["new", "york"]);
  assert.equal(parseSearch("stripe").words[0], "stripe");
});

test("matches jobs against what it understood", () => {
  const p = parseSearch("remote AI paying $20/hr");
  assert.equal(matchesSearch(job({}), p), true);
  assert.equal(matchesSearch(job({ description: "Pay: $15 per hour." }), p), false);
  assert.equal(matchesSearch(job({ location: "Austin, TX" }), p), false);
  assert.equal(matchesSearch(job({ title: "Marketing Intern" }), p), false);
});

test("beginner-friendly leaves out PhD and MBA-only roles", () => {
  const p = parseSearch("beginner software internships");
  assert.equal(matchesSearch(job({ title: "Software Engineer Intern" }), p), true);
  assert.equal(matchesSearch(job({ title: "PhD Software Engineer Intern" }), p), false);
});

test("leaves out excluded words: -word, not, except, without", () => {
  const p = parseSearch("software internships not finance -sales except google");
  assert.deepEqual(p.exclude, ["finance", "sales", "google"]);
  assert.equal(p.field, "Software");
  const job = (title: string, company = "Acme") => ({ id: "1", title, company, location: "NYC", url: "", source: "greenhouse" as const, description: "" });
  assert.ok(matchesSearch(job("Software Engineer Intern"), p));
  assert.ok(!matchesSearch(job("Software Engineer Intern, Sales Tools"), p));
  assert.ok(!matchesSearch(job("Software Engineer Intern", "Google"), p));
  assert.deepEqual(parseSearch("no experience needed").exclude, []);
});

test("role nouns stay as words, so 'data analyst' finds analyst roles only", () => {
  const p = parseSearch("data analyst internships");
  assert.equal(p.field, "Data");
  assert.deepEqual(p.words, ["analyst"]);
  assert.equal(matchesSearch(job({ title: "Data Analyst Intern" }), p), true);
  assert.equal(matchesSearch(job({ title: "Data Engineering Intern" }), p), false);
});
