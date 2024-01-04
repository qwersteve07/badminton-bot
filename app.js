const { chromium } = require("playwright");
require("dotenv").config();

(async () => {
  // Launch a new browser instance
  const browser = await chromium.launch({ headless: false });
  // Create a new browser context
  const context = await browser.newContext();
  // Create a new page within the context
  const page = await context.newPage();

  // Navigate to a website
  const CJCFurl =
    "https://www.cjcf.com.tw/jj01.aspx?module=login_page&files=login&PT=1";
  await page.goto(CJCFurl);

  // clear alert
  await page.locator('button:has-text("OK")').click();

  const username = process.env.USERNAME;
  const password = process.env.PASSWORD;

  await page.locator("id=ContentPlaceHolder1_loginid").fill(username);
  await page.locator("id=loginpw").fill(password);

  // login
  await page.evaluate(() => {
    const button = document.createElement("button");
    button.id = "customSubmit";
    button.textContent = "submit";
    button.onclick = () => DoSubmit();
    document.body.appendChild(button);
  });
  await page.locator("id=customSubmit").click();

  // wait for Thursday
  let currentDate = new Date().toDateString();
  while (currentDate.indexOf("Fri") === -1) {
    currentDate = new Date().toDateString();
  }

  // TODO: 改為自動抓取時間

  await page.evaluate(async () => {
    const month = "01";
    const date = "17";
    const times = ["06", "07"];

    await Promise.all(
      times.map((time) =>
        fetch(
          `https://www.cjcf.com.tw/jj01.aspx?module=net_booking&files=booking_place&StepFlag=25&PT=1&D=2024/${month}/${date}&Qpid=1112&QTime=${time}`
        )
      )
    );
  });

  await browser.close();
})();
