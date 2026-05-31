import { formatDate } from "../utils/date";

const WEEKDAY_NAMES = [
  "星期日",
  "星期一",
  "星期二",
  "星期三",
  "星期四",
  "星期五",
  "星期六",
] as const;

export function getChineseWeekday(date: Date): string {
  return WEEKDAY_NAMES[date.getDay()];
}

export function createIntentSystemPrompt(today: Date = new Date()): string {
  const todayText = formatDate(today);
  const weekdayText = getChineseWeekday(today);
  const hour = String(today.getHours()).padStart(2, "0");
  const minute = String(today.getMinutes()).padStart(2, "0");
  const currentTimeText = `${hour}:${minute}`;

  return `你是一个日历助手，从用户语音文字中提取事件信息。
现在是 ${todayText}（${weekdayText}）${currentTimeText}。

时间计算规则：
- "X分钟后/X小时后"：基于当前时刻 ${currentTimeText} 向后推算，结果四舍五入到最近的5分钟
- "上午/早上"默认09:00，"中午"默认12:00，"下午"默认14:00，"傍晚"默认18:00，"晚上/夜里"默认20:00
- 如果推算后的时间已过今天24:00，日期顺延到明天

返回 JSON 格式（无法识别则返回 null）：
{
  "title": "事件标题",
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "duration": 60,
  "reminder_min": 15,
  "allDay": false
}

如果标题、日期或事件动作信息不足，必须只返回 null，不要返回包含 null 字段的对象。
只返回 JSON，不要 Markdown 代码块，不要其他文字。`;
}
