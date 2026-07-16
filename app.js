import { chromium, request as playwrightRequest } from "@playwright/test";
import "dotenv/config";
import { getNextTargetDate, getReleaseMoment, getToday, waitUntil } from "./utils/get-date.js";
import { buildBookingUrl, buildRedirectUrl, parseBookingResponse } from "./utils/booking.js";
import { sendLineMessage } from "./utils/line-message.js";

const targetSportsCenterUrl = "https://bwd.xuanen.com.tw/";
const targetSportsCenterHomePath = "wd27.aspx";
const pickTimes = (process.env.PICK_TIMES ?? "20,21")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const bookingStepDelayMs = Number(process.env.BOOKING_FIRE_DELAY_MS ?? 120);
const bookingSpinMs = Number(process.env.BOOKING_SPIN_MS ?? 80);
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

async function login(page, username, password) {
  await page.goto(
    `${targetSportsCenterUrl}${targetSportsCenterHomePath}?module=login_page&files=login&PT=1`,
    { waitUntil: "domcontentloaded" },
  );

  await page.locator("#ContentPlaceHolder1_loginid").fill(username);
  await page.locator("#loginpw").fill(password);

  await page.evaluate(() => window.DoSubmit());
  await page.waitForSelector("img[title='我的訂單']", { timeout: 15_000 });
}

async function buildBookingClient(storageState) {
  return await playwrightRequest.newContext({
    storageState,
    extraHTTPHeaders: {
      Origin: targetSportsCenterUrl,
      Referer: `${targetSportsCenterUrl}${targetSportsCenterHomePath}`,
    },
  });
}

async function reserveTimeSlot(bookingClient, date, time) {
  const bookingUrl = buildBookingUrl({
    baseUrl: targetSportsCenterUrl,
    homePath: targetSportsCenterHomePath,
    date,
    time,
    qpid: process.env.BOOKING_QPID ?? "1196",
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
    baseUrl: targetSportsCenterUrl,
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

function buildDryRunOutcome(date, time) {
  const bookingUrl = buildBookingUrl({
    baseUrl: targetSportsCenterUrl,
    homePath: targetSportsCenterHomePath,
    date,
    time,
    qpid: process.env.BOOKING_QPID ?? "1196",
  });

  return {
    time,
    status: "unknown",
    detail: "dry-run",
    bookingUrl,
  };
}

function formatSummary(date, outcomes) {
  const lines = [`日期: ${date}`];
  for (const outcome of outcomes) {
    const statusText =
      outcome.status === "success"
        ? "成功"
        : outcome.status === "redirect"
          ? "轉址"
          : outcome.status === "failure"
            ? "失敗"
            : "未知";
    lines.push(`${outcome.time}: ${statusText}${outcome.detail ? ` (${outcome.detail})` : ""}`);
  }
  return lines.join("\n");
}

export const run = async () => {
  const username = requireEnv("USERNAME");
  const password = requireEnv("PASSWORD");
  const dryRun = shouldDryRun();
  const nextTargetDate = getNextTargetDate();
  const releaseMoment = getReleaseMoment(bookingStepDelayMs);

  let browser;
  let context;
  let bookingClient;

  try {
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext();
    const page = await context.newPage();

    console.log("-------browser launched-------");
    console.log(`today is ${getToday()}`);
    console.log(`target date is ${nextTargetDate}`);
    console.log(`mode: ${dryRun ? "dry-run" : "live"}`);

    await login(page, username, password);
    console.log("is logged in");

    if (!dryRun) {
      const storageState = await context.storageState();
      bookingClient = await buildBookingClient(storageState);
    }

    const waitMs = releaseMoment.valueOf() - Date.now();
    console.log(
      `waiting ${Math.max(0, waitMs)}ms until ${releaseMoment
        .tz("Asia/Taipei")
        .format("YYYY/MM/DD HH:mm:ss.SSS")}`,
    );
    await waitUntil(releaseMoment.valueOf(), { spinMs: bookingSpinMs });

    console.log("GO!");
    console.time("Used Time");

    const normalizedOutcomes = dryRun
      ? pickTimes.map((time) => buildDryRunOutcome(nextTargetDate, time))
      : (
          await Promise.allSettled(
            pickTimes.map((time) => reserveTimeSlot(bookingClient, nextTargetDate, time)),
          )
        ).map((result, index) => {
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

    console.timeEnd("Used Time");
    console.log(formatSummary(nextTargetDate, normalizedOutcomes));

    if (dryRun) {
      console.log("dry-run mode: no booking requests were sent and no LINE message was sent.");
      normalizedOutcomes.forEach((outcome) => {
        console.log(`planned booking: ${outcome.bookingUrl}`);
      });
    } else {
      const successTimes = normalizedOutcomes.filter((outcome) => outcome.status === "success");
      const message =
        successTimes.length > 0
          ? `預約成功🏸\n${formatSummary(nextTargetDate, normalizedOutcomes)}`
          : `預約失敗\n${formatSummary(nextTargetDate, normalizedOutcomes)}`;

      await sendLineMessage(message);
    }
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
    try {
      if (!dryRun) {
        await sendLineMessage(`搶場流程失敗\n日期: ${nextTargetDate}\n${String(error)}`);
      }
    } catch {
      // 如果通知也失敗，保留原始錯誤輸出即可。
    }
  } finally {
    await bookingClient?.dispose();
    await context?.close();
    await browser?.close();
  }
};

const isMainModule =
  import.meta.url === new URL(process.argv[1], "file:").href;

if (isMainModule) {
  void run();
}
