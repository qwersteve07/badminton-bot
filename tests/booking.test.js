import assert from "node:assert/strict";
import test from "node:test";
import { buildBookingUrl, buildRedirectUrl, parseBookingResponse } from "../utils/booking.js";

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

test("parseBookingResponse detects success markers", () => {
  const result = parseBookingResponse("<html><body>預約成功</body></html>");
  assert.equal(result.status, "success");
});

test("parseBookingResponse detects redirect script paths", () => {
  const result = parseBookingResponse("<script>window.location='../../booking/confirm.aspx';</script>");
  assert.equal(result.status, "redirect");
  assert.equal(result.redirectPath, "../../booking/confirm.aspx");
});
