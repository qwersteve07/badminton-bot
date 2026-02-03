import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);
// 取得下週時間
export const getNextTargetDate = () => {
	// 取得目前日期
	console.log(dayjs().tz("Asia/Taipei").format());
	return dayjs().tz("Asia/Taipei").add(7, "d").format("YYYY/MM/DD");
};
