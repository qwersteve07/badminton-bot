// 取得下週時間
export const getNextTargetDate = () => {
  // 取得目前日期
  let today = new Date();
  let targetDate = new Date(today);
  targetDate.setDate(targetDate.getDate() + 14);

  let year = targetDate.getFullYear();
  let month = targetDate.getMonth() + 1;
  let day = targetDate.getDate();

  return `${year}/${month}/${day}`;
};
