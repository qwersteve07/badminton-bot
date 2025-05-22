import cron from "node-cron";
import { run } from "./app.js";

cron.schedule("59 11 * * *", () => {
  console.log("running a task at 11:59 every day");
  run();
});
