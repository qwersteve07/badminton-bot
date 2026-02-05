import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);

export function getToday() {
	return dayjs().tz("Asia/Taipei").format("YYYY/MM/DD dddd");
}
export function getNextTargetDate() {
	// 取得目前日期
	return dayjs().tz("Asia/Taipei").add(8, "d").format("YYYY/MM/DD");
}
