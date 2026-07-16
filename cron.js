import { CronJob } from "cron";
import { run } from "./app.js";

new CronJob(
	"0 59 23 * * *",
	function () {
		void run().catch((error) => {
			console.error(error);
		});
	},
	null,
	true,
	"Asia/Taipei",
);
