export const SCHEDULES = {
  thursday: {
    key: "thursday",
    cronExpression: "0 59 23 * * 3",
    targetDateOffsetDays: 7,
    label: "週四 00:00",
    venues: [
      {
        key: "zhongzheng",
        name: "中正運動中心",
        baseUrl: "https://bwd.xuanen.com.tw/",
        homePath: "wd27.aspx",
        bookingPageUrl: "https://bwd.xuanen.com.tw/wd27.aspx?module=net_booking&files=booking_place&PT=1#",
        courtName: "7-1",
      },
      {
        key: "zhongshan",
        name: "中山運動中心",
        baseUrl: "https://scr.cyc.org.tw/",
        homePath: "tp01.aspx",
        bookingPageUrl: "https://scr.cyc.org.tw/tp01.aspx?module=net_booking&files=booking_place&PT=1",
        courtName: "羽A",
      },
    ],
  },
  friday: {
    key: "friday",
    cronExpression: "0 59 23 * * 4",
    targetDateOffsetDays: 13,
    label: "週五 00:00",
    venues: [
      {
        key: "daan",
        name: "大安運動中心",
        baseUrl: "https://www.cjcf.com.tw/",
        homePath: "CG02.aspx",
        bookingPageUrl: "https://www.cjcf.com.tw/CG02.aspx?module=net_booking&files=booking_place&PT=1",
        courtName: "羽3",
        qpid: 1114,
      },
    ],
  },
};

export function getSchedule(key) {
  const schedule = SCHEDULES[key];
  if (!schedule) {
    throw new Error(`Unknown schedule key: ${key}`);
  }
  return schedule;
}
