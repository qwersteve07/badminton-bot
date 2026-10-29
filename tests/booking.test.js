import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBookingPageUrl,
  buildBookingUrl,
  buildLoginUrl,
  buildRedirectUrl,
  extractQpidFromHtml,
  parseBookingResponse,
} from "../utils/booking.js";
import { getSchedule } from "../utils/schedules.js";

test("buildBookingUrl creates the expected booking endpoint", () => {
  const url = buildBookingUrl({
    baseUrl: "https://bwd.xuanen.com.tw/",
    homePath: "wd27.aspx",
    date: "2026/07/03",
    time: "20",
    qpid: "1196",
  });

  assert.equal(
    url,
    "https://bwd.xuanen.com.tw/wd27.aspx?module=net_booking&files=booking_place&StepFlag=25&QPid=1196&PT=1&D=2026/07/03&QTime=20",
  );
});

test("buildRedirectUrl resolves relative redirect paths", () => {
  const url = buildRedirectUrl({
    baseUrl: "https://bwd.xuanen.com.tw/",
    redirectPath: "../../booking/confirm.aspx?x=1",
  });

  assert.equal(url, "https://bwd.xuanen.com.tw/booking/confirm.aspx?x=1");
});

test("buildLoginUrl creates the expected login endpoint", () => {
  const url = buildLoginUrl({
    baseUrl: "https://scr.cyc.org.tw/",
    homePath: "tp01.aspx",
  });

  assert.equal(url, "https://scr.cyc.org.tw/tp01.aspx?module=login_page&files=login&PT=1");
});

test("buildBookingPageUrl creates the expected booking page endpoint", () => {
  const url = buildBookingPageUrl({
    baseUrl: "https://www.cjcf.com.tw/",
    homePath: "CG02.aspx",
  });

  assert.equal(url, "https://www.cjcf.com.tw/CG02.aspx?module=net_booking&files=booking_place&PT=1");
});

test("parseBookingResponse detects success markers", () => {
  const result = parseBookingResponse("<html><body>預約成功</body></html>");
  assert.equal(result.status, "success");
});

test("parseBookingResponse detects redirect script paths", () => {
  const result = parseBookingResponse("<script>window.location='../../booking/confirm.aspx';</script>");
  assert.equal(result.status, "redirect");
  assert.equal(result.redirectPath, "../../booking/confirm.aspx");
});

test("extractQpidFromHtml finds qpid near the court name", () => {
  const html = `
    <a href="wd27.aspx?module=net_booking&files=booking_place&StepFlag=25&QPid=1196&PT=1&D=2026/07/23&QTime=20">
      7-1
    </a>
  `;

  assert.equal(extractQpidFromHtml(html, "7-1"), "1196");
});

test("getSchedule returns the Thursday schedule definition", () => {
  const schedule = getSchedule("thursday");
  assert.equal(schedule.label, "週四 00:00");
  assert.equal(schedule.targetDateOffsetDays, 7);
  assert.equal(schedule.venues.length, 2);
});
