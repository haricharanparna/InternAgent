import { test } from "node:test";
import assert from "node:assert/strict";
import { postingFacts, postingSections } from "../src/lib/postingFacts.ts";
import type { Job } from "../src/lib/types.ts";
import { hourlyPay } from "../src/lib/jobFacts.ts";

test("hourlyPay puts hourly, monthly and yearly pay on one scale for sorting", () => {
  assert.equal(hourlyPay("$45–$50/hr"), 45);
  assert.equal(hourlyPay("$12.5K per month"), 72);
  assert.equal(hourlyPay("$90,000–$100,000/year"), 43);
  assert.equal(hourlyPay(undefined), 0);
});

const job = (description: string, extra: Partial<Job> = {}): Job => ({
  id: "gh-acme-1", title: "Software Engineering Intern (Summer 2027)", company: "Acme", location: "New York, NY; Remote",
  url: "https://example.com", source: "greenhouse", description, ...extra,
});

const POSTING = [
  "About Acme",
  "Acme builds tools for small farms. You may work across teams.",
  "What you'll do",
  "• Build features in our React app",
  "• Write tests and ship code weekly",
  "Minimum qualifications",
  "• Currently enrolled in a Bachelor's degree in Computer Science or a related field",
  "• Graduating between December 2027 and June 2028",
  "Preferred qualifications",
  "• Experience with TypeScript",
  "Details",
  "This is a 12-week summer internship from June 8 to August 28, 2027. You'll be in the office 3 days a week.",
  "The pay for this internship is $45 - $50 per hour. Housing stipend provided.",
  "We are unable to sponsor visas for this role. Apply by March 15, 2027.",
  "Strong performers may receive a return offer.",
].join("\n");

const facts = (d: string, extra?: Partial<Job>) => Object.fromEntries(postingFacts(job(d, extra)).map((f) => [f.key, f]));

test("reads pay, dates, length, workplace and deadline straight from the posting", () => {
  const f = facts(POSTING);
  assert.equal(f.pay.value, "$45–$50/hr");
  assert.equal(f.dates.value, "June 8 to August 28, 2027");
  assert.equal(f.length.value, "12 weeks");
  assert.match(f.workplace.value, /3 days a week in person/);
  assert.equal(f.deadline.value, "March 15, 2027");
});

test("finds who can apply, visa, housing and return offers, each with its source sentence", () => {
  const f = facts(POSTING);
  assert.equal(f.who.value, "Bachelor's students, graduating between December 2027 and June 2028");
  assert.equal(f.visa.value, "Not offered, per the posting");
  assert.equal(f.visa.tone, "warn");
  assert.match(f.visa.quote!, /unable to sponsor/);
  assert.ok(f.housing && f.return);
});

test("doesn't invent facts the posting doesn't state", () => {
  const f = facts("Build things with our team. You may join standups. We value curiosity.", { title: "Software Engineering Intern" });
  for (const k of ["pay", "dates", "length", "deadline", "visa", "housing", "return", "who"]) assert.equal(f[k], undefined, k);
  assert.equal(f.where.value, "New York, NY · Remote");
});

test("structured board fields win: compensation, workplace and deadline", () => {
  const soon = new Date(Date.now() + 3 * 86_400_000).toISOString();
  const f = facts("No details.", { compensation: "$12.5K per month", workplace: "Hybrid", deadline: soon, team: "Data" });
  assert.equal(f.pay.value, "$12.5K per month");
  assert.equal(f.workplace.value, "Hybrid");
  assert.match(f.deadline.value, /3 days left/);
  assert.equal(f.deadline.tone, "warn");
  assert.equal(f.team.value, "Data");
});

test("a graduation season isn't mistaken for the internship term, and degree level is read", () => {
  const d = "Internships for the summer of 2027.\nPursuit of a Master's degree in Computer Science, with the expectation of graduating in winter 2027 or spring 2028.";
  const f = facts(d, { title: "Machine Learning Engineer, Intern" });
  assert.equal(f.dates.value, "Summer 2027");
  assert.match(f.who.value, /^Master's students, graduating in winter 2027 or spring 2028/);
});

test("splits a posting into labeled sections", () => {
  const s = postingSections(POSTING);
  const byHeading = Object.fromEntries(s.map((x) => [x.heading, x]));
  assert.equal(byHeading["About Acme"].kind, "about");
  assert.equal(byHeading["What you'll do"].kind, "role");
  assert.deepEqual(byHeading["What you'll do"].items, ["Build features in our React app", "Write tests and ship code weekly"]);
  assert.equal(byHeading["Minimum qualifications"].kind, "requirements");
  assert.equal(byHeading["Preferred qualifications"].kind, "preferred");
});
