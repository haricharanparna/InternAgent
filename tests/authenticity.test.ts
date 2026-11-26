import { test } from "node:test";
import assert from "node:assert/strict";
import { trustOf } from "../src/lib/authenticity.ts";
import type { Job } from "../src/lib/types.ts";

const job = (extra: Partial<Job>): Job => ({
  id: "x", title: "Marketing Intern", company: "Acme", location: "Remote", url: "https://boards.greenhouse.io/acme/jobs/1",
  source: "greenhouse", description: "You will help plan campaigns and write posts.", ...extra,
});

test("company board postings are labeled official, Simplify ones third-party, added ones unverified", () => {
  assert.equal(trustOf(job({})).level, "official");
  assert.equal(trustOf(job({ source: "simplify", url: "https://acme.com/careers/1" })).level, "third-party");
  assert.equal(trustOf(job({ custom: true, url: "https://acme.com/careers/1" })).level, "unverified");
});

test("scam signs are flagged with the sentence they came from", () => {
  const t = trustOf(job({
    custom: true, url: "https://acme.com/jobs",
    description: "Great remote role! You must purchase a starter kit for $89 before training. Interviews are held on Telegram. Send your SSN to begin.",
  }));
  assert.equal(t.level, "suspicious");
  const labels = t.flags.map((f) => f.label).join(" | ");
  assert.match(labels, /pay for something/);
  assert.match(labels, /chat app/);
  assert.match(labels, /sensitive personal/);
  assert.match(t.flags[0].quote!, /starter kit/);
});

test("links that hide or don't match the company are flagged", () => {
  assert.equal(trustOf(job({ custom: true, url: "https://bit.ly/abc" })).level, "suspicious");
  assert.equal(trustOf(job({ custom: true, url: "http://acme.com/jobs" })).level, "suspicious");
  assert.match(trustOf(job({ custom: true, url: "https://random-jobs-hub.net/apply" })).flags[0].label, /isn't Acme's site/);
  assert.equal(trustOf(job({ custom: true, url: "https://acme.wd5.myworkdayjobs.com/x" })).level, "unverified");
});

test("anti-fraud notices in a posting aren't mistaken for scam signs", () => {
  const t = trustOf(job({ custom: true, url: "https://acme.com/jobs", description: "Beware of fraud: we will never ask for your SSN or for gift cards during hiring." }));
  assert.equal(t.level, "unverified");
});

test("ordinary postings that mention pay and benefits aren't flagged", () => {
  const t = trustOf(job({ description: "The pay is $45 per hour. We offer a housing stipend. Apply online; no fee is required." }));
  assert.equal(t.level, "official");
});
