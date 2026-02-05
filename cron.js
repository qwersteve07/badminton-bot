import { CronJob } from "cron";
import { run } from "./app.js";

new CronJob(
	"0 59 23 * * *",
	function () {
		run();
	},
	null,
	true,
	"Asia/Taipei",
);
