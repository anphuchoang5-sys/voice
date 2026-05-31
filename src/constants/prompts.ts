import { formatDate, formatTime } from "../utils/date";
import type { StoredCalendarEvent } from "../stores/calendar.store";

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

function formatEventForPrompt(event: StoredCalendarEvent): string {
  const timeLabel = event.allDay ? "全天" : event.time ?? "待定";
  return `- ${event.date}: ${event.title} (${timeLabel})`;
}

export function createIntentSystemPrompt(
  today: Date = new Date(),
  existingEvents: StoredCalendarEvent[] = [],
): string {
  const todayText = formatDate(today);
  const weekdayText = getChineseWeekday(today);
  const hour = String(today.getHours()).padStart(2, "0");
  const minute = String(today.getMinutes()).padStart(2, "0");
  const currentTimeText = `${hour}:${minute}`;

  const eventsBlock =
    existingEvents.length === 0
      ? "（无现有事件）"
      : existingEvents.map(formatEventForPrompt).join("\n");

  return `你是一个语音日历助手。根据用户说的话判断意图并返回对应 JSON。

现在是 ${todayText}（${weekdayText}）${currentTimeText}。

当前日历中的事件：
${eventsBlock}

时间计算规则：
- "X分钟后/X小时后"：基于当前时刻 ${currentTimeText} 向后推算，结果四舍五入到最近的5分钟
- "上午/早上"默认09:00，"中午"默认12:00，"下午"默认14:00，"傍晚"默认18:00，"晚上/夜里"默认20:00
- 如果推算后的时间已过今天24:00，日期顺延到明天

根据用户意图，返回以下 JSON 之一：

1. 创建事件 → {"action": "create", "events": [{"title": "事件标题", "date": "YYYY-MM-DD", "time": "HH:MM", "duration": 60, "reminder_min": 15, "allDay": false}]}
   - 用户一句话可能包含多个事件（如"明天上午9点上课，下午2点出去玩"），必须全部提取放入 events 数组
   - 即使只有一个事件也用 events 数组包裹
2. 删除事件 → {"action": "delete", "eventTitle": "要删除的事件标题", "eventDate": "YYYY-MM-DD"}
   - 用户说的标题是口语化的，需要提取核心关键词。例如"那个产品评审会"、"明天下午的会议" → 提取"产品评审会"或"会议"
   - 日期从用户的表达中推断（今天/明天/后天/周几等），填入 eventDate
3. 查询事件 → {"action": "query", "date": "YYYY-MM-DD"}
   - 用户问某天/某月/某周有什么安排时，返回要查询的日期
4. 无法识别 → {"action": "unknown"}
   - 信息不足以确定意图、标题或日期时返回此值

只返回 JSON，不要 Markdown 代码块，不要其他文字。`;
}
