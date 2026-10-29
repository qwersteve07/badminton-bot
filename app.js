import { chromium, request as playwrightRequest } from "@playwright/test";
import "dotenv/config";
import { getNextTargetDate, getToday, waitUntil } from "./utils/get-date.js";
import {
  buildBookingPageUrl,
  buildBookingUrl,
  buildLoginUrl,
  buildRedirectUrl,
  extractQpidFromHtml,
  parseBookingResponse,
} from "./utils/booking.js";
import { sendLineMessage } from "./utils/line-message.js";
import { SCHEDULES, getSchedule } from "./utils/schedules.js";

const pickTimes = (process.env.PICK_TIMES ?? "20,21")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const requestTimeoutMs = Number(process.env.BOOKING_TIMEOUT_MS ?? 8000);

function isTruthy(value) {
  return value !== undefined && !["", "0", "false", "off", "no"].includes(value.toLowerCase());
}

function shouldDryRun() {
  return process.argv.includes("--dry-run") || isTruthy(process.env.DRY_RUN);
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function buildPrefix(schedule, venue) {
  return `[${schedule.label}] ${venue.name}`;
}

async function login(page, venue, username, password) {
  await page.goto(buildLoginUrl(venue), { waitUntil: "domcontentloaded" });
  await page.locator("#ContentPlaceHolder1_loginid").fill(username);
  await page.locator("#loginpw").fill(password);
  await page.evaluate(() => window.DoSubmit());
  await page.waitForSelector("img[title='我的訂單']", { timeout: 15_000 });
}

async function resolveVenueQpid(page, venue) {
  if (venue.qpid) {
    return venue.qpid;
  }

  await page.goto(buildBookingPageUrl(venue), { waitUntil: "domcontentloaded" });

  const html = await page.content();
  const qpid = extractQpidFromHtml(html, venue.courtName);
  if (qpid) {
    return qpid;
  }

  const bodyText = await page.locator("body").innerText().catch(() => "");
  const fallbackQpid = extractQpidFromHtml(bodyText, venue.courtName);
  if (fallbackQpid) {
    return fallbackQpid;
  }

  throw new Error(`Unable to resolve court id for ${venue.name} (${venue.courtName})`);
}

async function buildBookingClient(storageState, venue) {
  return await playwrightRequest.newContext({
    storageState,
    extraHTTPHeaders: {
      Origin: venue.baseUrl,
      Referer: buildBookingPageUrl(venue),
    },
  });
}

async function reserveTimeSlot(bookingClient, venue, date, time, qpid) {
  const bookingUrl = buildBookingUrl({
    baseUrl: venue.baseUrl,
    homePath: venue.homePath,
    date,
    time,
    qpid,
  });

  const firstResponse = await bookingClient.get(bookingUrl, {
    timeout: requestTimeoutMs,
  });
  const firstHtml = await firstResponse.text();
  const firstResult = parseBookingResponse(firstHtml);

  if (firstResult.status === "success") {
    return { time, status: "success", detail: "direct-success", bookingUrl };
  }

  if (firstResult.status !== "redirect" || !firstResult.redirectPath) {
    return {
      time,
      status: firstResult.status,
      detail: firstResult.reason ?? "unexpected-response",
      bookingUrl,
    };
  }

  const redirectUrl = buildRedirectUrl({
    baseUrl: venue.baseUrl,
    redirectPath: firstResult.redirectPath,
  });

  const secondResponse = await bookingClient.get(redirectUrl, {
    timeout: requestTimeoutMs,
  });
  const secondHtml = await secondResponse.text();
  const secondResult = parseBookingResponse(secondHtml);

  return {
    time,
    status: secondResult.status,
    detail: secondResult.reason ?? "redirect-followed",
    bookingUrl,
    redirectUrl,
  };
}

function buildDryRunOutcome(venue, date, time, qpid) {
  return {
    time,
    status: "unknown",
    detail: "dry-run",
    bookingUrl: buildBookingUrl({
      baseUrl: venue.baseUrl,
      homePath: venue.homePath,
      date,
      time,
      qpid,
    }),
  };
}

function formatTimeOutcome(outcome) {
  const statusText =
    outcome.status === "success"
      ? "成功"
      : outcome.status === "redirect"
        ? "轉址"
        : outcome.status === "failure"
          ? "失敗"
          : "未知";

  return `${outcome.time}: ${statusText}${outcome.detail ? ` (${outcome.detail})` : ""}`;
}

function formatVenueResult(venueResult) {
  if (venueResult.status === "error") {
    return [
      `${venueResult.venueName} (${venueResult.courtName})`,
      `狀態: 失敗 (${venueResult.detail})`,
    ].join("\n");
  }

  const lines = [
    `${venueResult.venueName} (${venueResult.courtName})`,
    `狀態: ${venueResult.status}`,
  ];

  if (venueResult.qpid) {
    lines.push(`QPid: ${venueResult.qpid}`);
  }

  if (venueResult.outcomes?.length) {
    lines.push(...venueResult.outcomes.map(formatTimeOutcome));
  }

  return lines.join("\n");
}

function buildNotificationMessage(schedule, targetDate, venueResults) {
  const successCount = venueResults.filter((venueResult) =>
    venueResult.outcomes?.some((outcome) => outcome.status === "success"),
  ).length;

  const lines = [
    `場館預約結果`,
    `排程: ${schedule.label}`,
    `目標日期: ${targetDate}`,
    `成功場館數: ${successCount}/${venueResults.length}`,
  ];

  for (const venueResult of venueResults) {
    lines.push("");
    lines.push(formatVenueResult(venueResult));
  }

  return lines.join("\n");
}

async function runVenue(browser, schedule, venue, { username, password, dryRun, targetDate, releaseAt }) {
  const context = await browser.newContext();
  const page = await context.newPage();
  let bookingClient;

  try {
    console.log(`${buildPrefix(schedule, venue)} logging in...`);
    await login(page, venue, username, password);
    console.log(`${buildPrefix(schedule, venue)} is logged in`);

    const qpid = await resolveVenueQpid(page, venue);
    console.log(`${buildPrefix(schedule, venue)} resolved QPid=${qpid}`);

    if (dryRun) {
      return {
        venueKey: venue.key,
        venueName: venue.name,
        courtName: venue.courtName,
        qpid,
        status: "dry-run",
        outcomes: pickTimes.map((time) => buildDryRunOutcome(venue, targetDate, time, qpid)),
      };
    }

    const storageState = await context.storageState();
    bookingClient = await buildBookingClient(storageState, venue);

    console.log(`${buildPrefix(schedule, venue)} ready; waiting until ${new Date(releaseAt).toISOString()}`);
    await waitUntil(releaseAt, { spinMs: 0 });

    const outcomes = await Promise.allSettled(
      pickTimes.map((time) => reserveTimeSlot(bookingClient, venue, targetDate, time, qpid)),
    );

    const normalizedOutcomes = outcomes.map((result, index) => {
      const time = pickTimes[index];
      if (result.status === "fulfilled") {
        return result.value;
      }

      return {
        time,
        status: "unknown",
        detail: result.reason instanceof Error ? result.reason.message : String(result.reason),
      };
    });

    return {
      venueKey: venue.key,
      venueName: venue.name,
      courtName: venue.courtName,
      qpid,
      status: normalizedOutcomes.some((outcome) => outcome.status === "success")
        ? "success"
        : "failure",
      outcomes: normalizedOutcomes,
    };
  } catch (error) {
    return {
      venueKey: venue.key,
      venueName: venue.name,
      courtName: venue.courtName,
      status: "error",
      detail: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await bookingClient?.dispose();
    await context?.close();
  }
}

export async function runSchedule(scheduleKey, { releaseAt = Date.now() } = {}) {
  const schedule = getSchedule(scheduleKey);
  const username = requireEnv("USERNAME");
  const password = requireEnv("PASSWORD");
  const dryRun = shouldDryRun();
  const targetDate = getNextTargetDate(schedule.targetDateOffsetDays, releaseAt);

  let browser;

  try {
    browser = await chromium.launch({ headless: true });

    console.log("-------browser launched-------");
    console.log(`today is ${getToday()}`);
    console.log(`schedule: ${schedule.label}`);
    console.log(`target date is ${targetDate}`);
    console.log(`mode: ${dryRun ? "dry-run" : "live"}`);

    console.time("Used Time");

    const venueRuns = await Promise.allSettled(
      schedule.venues.map((venue) =>
        runVenue(browser, schedule, venue, {
          username,
          password,
          dryRun,
          targetDate,
          releaseAt,
        }),
      ),
    );

    const venueResults = venueRuns.map((result, index) => {
      const venue = schedule.venues[index];
      if (result.status === "fulfilled") {
        return result.value;
      }

      return {
        venueKey: venue.key,
        venueName: venue.name,
        courtName: venue.courtName,
        status: "error",
        detail: result.reason instanceof Error ? result.reason.message : String(result.reason),
      };
    });

    console.timeEnd("Used Time");

    venueResults.forEach((venueResult) => {
      console.log(formatVenueResult(venueResult));
      console.log("---");
    });

    if (dryRun) {
      console.log("dry-run mode: no booking requests were sent and no LINE message was sent.");
      venueResults.forEach((venueResult) => {
        venueResult.outcomes?.forEach((outcome) => {
          console.log(`planned booking: ${outcome.bookingUrl}`);
        });
      });
      return venueResults;
    }

    const message = buildNotificationMessage(schedule, targetDate, venueResults);
    await sendLineMessage(message);
    return venueResults;
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
    try {
      if (!dryRun) {
        await sendLineMessage(
          `搶場流程失敗\n排程: ${schedule.label}\n日期: ${targetDate}\n${String(error)}`,
        );
      }
    } catch {
      // 如果通知也失敗，保留原始錯誤輸出即可。
    }
  } finally {
    await browser?.close();
  }
}

export async function runAllSchedules(scheduleKeys = Object.keys(SCHEDULES)) {
  const results = [];
  for (const scheduleKey of scheduleKeys) {
    results.push(await runSchedule(scheduleKey));
  }
  return results;
}

const isMainModule = import.meta.url === new URL(process.argv[1], "file:").href;

if (isMainModule) {
  const scheduleArg = process.argv[2] ?? (shouldDryRun() ? "all" : null);

  if (scheduleArg === "all") {
    void runAllSchedules();
  } else if (scheduleArg === "thursday" || scheduleArg === "friday") {
    void runSchedule(scheduleArg);
  } else {
    console.error("Usage: node app.js [all|thursday|friday]");
    process.exitCode = 1;
  }
}
