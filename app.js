import { chromium } from "@playwright/test";
import { getNextTargetDate } from "./utils/get-date.js";
import { sendLineMessage } from "./utils/line-message.js";
import "dotenv/config";

const pickTimes = ["20", "21"];
const nextTargetDate = getNextTargetDate();
// 中山運動中心
const zhongShanSportsCenterUrl = "https://scr.cyc.org.tw/";
const zhongShanSportsCenterHomePath = "tp01.aspx";
const targetSportsCenterUrl = zhongShanSportsCenterUrl;
const targetSportsCenterHomePath = zhongShanSportsCenterHomePath;

export const run = async () => {
	const browser = await chromium.launch();
	const context = await browser.newContext();

	console.log("browser launched");

	const page = await context.newPage();
	// Navigate to login
	await page.goto(
		`${targetSportsCenterUrl}${targetSportsCenterHomePath}?module=login_page&files=login&PT=1`,
	);

	console.log(`${nextTargetDate} start!`);

	// login
	const username = process.env.USERNAME;
	const password = process.env.PASSWORD;
	await page.locator("id=ContentPlaceHolder1_loginid").fill(username);
	await page.locator("id=loginpw").fill(password);
	await page.evaluate(() => window.DoSubmit());
	await page.waitForSelector("img[title=我的訂單]");

	console.log("is logged in");
	console.log("waiting for midnight...");

	// wait for midnight
	let isAvailable = new Date().toTimeString().includes("23:59:59");
	// while (!isAvailable) {
	// 	isAvailable = new Date().toTimeString().includes("23:59:59");
	// }

	console.log(`right now is ${new Date().toTimeString()}`);
	console.log("go!");

	// pick place
	const pickPlaceResponse = await page.evaluate(
		async ({
			pickTimes,
			date,
			targetSportsCenterUrl,
			targetSportsCenterHomePath,
		}) => {
			return await Promise.all(
				pickTimes.map(async (time) => {
					return fetch(
						`${targetSportsCenterUrl}${targetSportsCenterHomePath}?module=net_booking&files=booking_place&StepFlag=25&QPid=84&PT=1&D=${date}&QTime=${time}`,
					).then((res) => res.text());
				}),
			);
		},
		{
			pickTimes,
			date: nextTargetDate,
			targetSportsCenterUrl,
			targetSportsCenterHomePath,
		},
	);

	// get pick place result path
	const pickPlaceResultPath = pickPlaceResponse.map((res) => {
		const path = res.substring(
			res.indexOf("../../..") + 8,
			res.indexOf("' </script>"),
		);
		return `${targetSportsCenterUrl}${path}`;
	});

	// get pick place result
	const pickPlaceResult = await page.evaluate(
		async ({ pickPlaceResultPath }) => {
			return await Promise.all(
				pickPlaceResultPath.map((path) =>
					fetch(path).then((res) => res.text()),
				),
			);
		},
		{ pickPlaceResultPath },
	);

	pickPlaceResult.forEach(async (res, index) => {
		if (res.indexOf("預約成功") !== -1) {
			sendLineMessage(
				`預約成功🏸🏸🏸 \t\n日期: ${nextTargetDate}\t\n時段: ${pickTimes[index]}`,
			);
		} else {
			sendLineMessage(`預約失敗`);
		}
	});
	await browser.close();
};
