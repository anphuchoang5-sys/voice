const WEEKDAY_NAMES = [
  "星期日",
  "星期一",
  "星期二",
  "星期三",
  "星期四",
  "星期五",
  "星期六",
] as const;

export function formatDateForPrompt(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getChineseWeekday(date: Date): string {
  return WEEKDAY_NAMES[date.getDay()];
}

export function createIntentSystemPrompt(today: Date = new Date()): string {
  const todayText = formatDateForPrompt(today);
  const weekdayText = getChineseWeekday(today);

  return `你是一个日历助手，从用户语音文字中提取事件信息。
今天是 ${todayText}（${weekdayText}）。

返回 JSON 格式（无法识别则返回 null）：
{
  "title": "事件标题",
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "duration": 60,
  "reminder_min": 15,
  "allDay": false
}

只返回 JSON，不要其他文字。`;
}
