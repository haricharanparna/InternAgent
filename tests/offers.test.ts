import { test } from "node:test";
import assert from "node:assert/strict";
import { offerScore, sameJob } from "../src/lib/offers.ts";

test("offer score weighs your ratings more than pay", () => {
  const rich = offerScore({ pay: 50, ratings: { learning: 2, team: 2, location: 2, future: 2 } }, 50);
  const good = offerScore({ pay: 35, ratings: { learning: 5, team: 5, location: 4, future: 5 } }, 50);
  assert.ok(good > rich, `${good} > ${rich}`);
  assert.equal(offerScore({ pay: 50, ratings: { learning: 5, team: 5, location: 5, future: 5 } }, 50), 100);
});

test("unrated and unpaid offers sit in the middle", () => {
  assert.equal(offerScore({}, 0), 50);
});

test("spots the same internship saved twice", () => {
  assert.ok(sameJob({ company: "Stripe", title: "Data Analyst, Intern" }, { company: "stripe", title: "Data Analyst Intern (Summer 2027)" }));
  assert.ok(sameJob({ company: "A", title: "X", url: "https://www.jobs.com/1?src=li" }, { company: "B", title: "Y", url: "http://jobs.com/1/" }));
  assert.ok(!sameJob({ company: "Stripe", title: "Data Analyst Intern" }, { company: "Stripe", title: "Software Engineer Intern" }));
  assert.ok(!sameJob({ company: "Stripe", title: "Intern" }, { company: "Stripe", title: "Intern 2027" }));
});
