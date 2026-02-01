import { CronJob } from "cron";
import { run } from "./app.js";

new CronJob(
  "0 * * * * *", // cronTime
  function () {
    run();
  }, // onTick
  null, // onComplete
  true, // start
);
//
