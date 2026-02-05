import { CronJob } from "cron";
import { run } from "./app.js";

new CronJob(
	"0 43 10 * * *",
	function () {
		run();
	},
	null,
	true,
	"Asia/Taipei",
);
