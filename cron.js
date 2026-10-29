import { CronJob } from "cron";
import { runSchedule } from "./app.js";
import { getNextMidnight } from "./utils/get-date.js";
import { SCHEDULES } from "./utils/schedules.js";

function startJob(cronExpression, scheduleKey) {
  return new CronJob(
    cronExpression,
    function () {
      const releaseAt = getNextMidnight();
      void runSchedule(scheduleKey, { releaseAt }).catch((error) => {
        console.error(error);
      });
    },
    null,
    true,
    "Asia/Taipei",
  );
}

for (const schedule of Object.values(SCHEDULES)) {
  startJob(schedule.cronExpression, schedule.key);
}
