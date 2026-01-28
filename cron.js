import { CronJob } from "cron";
import { run } from "./app.js";

new CronJob(
	"0 59 23 * * *", // cronTime
	function () {
		run();
	}, // onTick
	null, // onComplete
	true, // start
);
//
