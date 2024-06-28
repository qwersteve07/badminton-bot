import { chromium } from "playwright";
import { getNextTargetDate } from "./utils/get-date.js";
import { sendLineNotify } from "./utils/line-notify.js";
import "dotenv/config";

const pickTimes = ["20", "21"];
const nextTargetDate = getNextTargetDate();
const sportsCenterUrl = "https://www.cjcf.com.tw/";
const sportsCenterHomePath = "jj01.aspx";

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  // Navigate to login
  await page.goto(
    `${sportsCenterUrl}${sportsCenterHomePath}?module=login_page&files=login&PT=1`
  );

  // login
  const username = process.env.USERNAME;
  const password = process.env.PASSWORD;
  await page.locator("id=ContentPlaceHolder1_loginid").fill(username);
  await page.locator("id=loginpw").fill(password);
  await page.evaluate(() => window.DoSubmit());
  await page.waitForSelector("img[title=我的訂單]");

  // wait for midnight
  let isAvailable = new Date().toTimeString().includes("00:00:00");
  while (!isAvailable) {
    isAvailable = new Date().toTimeString().includes("00:00:00");
  }

  // pick place
  const pickPlaceResponse = await page.evaluate(
    async ({ pickTimes, date, sportsCenterUrl, sportsCenterHomePath }) => {
      return await Promise.all(
        pickTimes.map((time) =>
          fetch(
            `${sportsCenterUrl}${sportsCenterHomePath}?module=net_booking&files=booking_place&StepFlag=25&PT=1&D=${date}&Qpid=1112&QTime=${time}`
          ).then((res) => res.text())
        )
      );
    },
    { pickTimes, date: nextTargetDate, sportsCenterUrl, sportsCenterHomePath }
  );

  // get pick place result path
  const pickPlaceResultPath = pickPlaceResponse.map((res) => {
    const path = res.substring(
      res.indexOf("../../..") + 8,
      res.indexOf("' </script>")
    );
    return `${sportsCenterUrl}${path}`;
  });

  // get pick place result
  const pickPlaceResult = await page.evaluate(
    async ({ pickPlaceResultPath }) => {
      return await Promise.all(
        pickPlaceResultPath.map((path) => fetch(path).then((res) => res.text()))
      );
    },
    { pickPlaceResultPath }
  );

  // send notify
  pickPlaceResult.forEach(async (res, index) => {
    if (res.indexOf("預約成功") !== -1) {
      sendLineNotify(
        `預約成功🏸🏸🏸 \t\n日期: ${nextTargetDate}\t\n時段: ${pickTimes[index]}`
      );
    } else {
      sendLineNotify(`預約失敗`);
    }
  });

  await browser.close();
})();
