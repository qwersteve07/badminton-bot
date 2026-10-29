import assert from "node:assert/strict";
import test from "node:test";
import { getNextMidnight, getNextTargetDate, waitUntil } from "../utils/get-date.js";
import { SCHEDULES } from "../utils/schedules.js";

test("Thursday preparation uses Friday midnight for the Daan target date", () => {
  const releaseAt = getNextMidnight("2026-10-29T23:59:00+08:00");
  assert.equal(new Date(releaseAt).toISOString(), "2026-10-29T16:00:00.000Z");
  assert.equal(getNextTargetDate(13, releaseAt), "2026/11/12");
});

test("Wednesday preparation keeps the Thursday booking date across month boundaries", () => {
  const releaseAt = getNextMidnight("2026-09-30T23:59:00+08:00");
  assert.equal(getNextTargetDate(7, releaseAt), "2026/10/08");
  assert.equal(SCHEDULES.thursday.cronExpression, "0 59 23 * * 3");
  assert.equal(SCHEDULES.friday.cronExpression, "0 59 23 * * 4");
});

test("waiting does not resolve before the release time and accepts late preparation", async () => {
  const releaseAt = Date.now() + 30;
  await waitUntil(releaseAt, { spinMs: 0 });
  assert.ok(Date.now() >= releaseAt);
  await waitUntil(Date.now() - 100, { spinMs: 0 });
});
