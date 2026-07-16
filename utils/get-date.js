import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const TAIPEI_TZ = "Asia/Taipei";

export function getToday() {
  return dayjs().tz(TAIPEI_TZ).format("YYYY/MM/DD dddd");
}

export function getNextTargetDate(daysAhead = 8) {
  return dayjs().tz(TAIPEI_TZ).add(daysAhead, "day").format("YYYY/MM/DD");
}

export function getReleaseMoment(fireOffsetMs = 0) {
  return dayjs
    .tz(TAIPEI_TZ)
    .startOf("day")
    .add(23, "hour")
    .add(59, "minute")
    .add(59, "second")
    .add(fireOffsetMs, "millisecond");
}

export function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function waitUntil(targetTimeMs, { spinMs = 80 } = {}) {
  const initialDelay = Math.max(0, targetTimeMs - Date.now() - spinMs);
  if (initialDelay > 0) {
    await sleep(initialDelay);
  }

  while (Date.now() < targetTimeMs) {
    // Busy wait only for the final few milliseconds so the actual request fires as close as possible.
  }
}
