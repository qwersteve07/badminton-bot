import dayjs from "dayjs";
import utc from '"dayjs/plugin/utc"';
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);
// 取得下週時間
export const getNextTargetDate = () => {
	// 取得目前日期
	let today = dayjs();
	let targetDate = dayjs().add(7, "d");
	return targetDate.format("YYYY/MM/DD");
};
