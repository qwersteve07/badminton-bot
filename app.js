import { chromium } from "@playwright/test";
import { getNextTargetDate } from "./utils/get-date.js";
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
	const page = await context.newPage();
	// Navigate to login
	await page.goto(
		`${targetSportsCenterUrl}${targetSportsCenterHomePath}?module=login_page&files=login&PT=1`,
	);

	// login
	const username = process.env.USERNAMES;
	const password = process.env.PASSWORD;
	await page.locator("id=ContentPlaceHolder1_loginid").fill(username);
	await page.locator("id=loginpw").fill(password);
	await page.evaluate(() => window.DoSubmit());
	await page.waitForSelector("img[title=我的訂單]");

	// wait for midnight
	let isAvailable = new Date().toTimeString().includes("23:59:59");
	while (!isAvailable) {
		isAvailable = new Date().toTimeString().includes("23:59:59");
	}

	// pick place
	await page.evaluate(
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

	await browser.close();
};

run();
