import {
  DEEPSEEK_API_KEY,
  DEEPSEEK_API_URL,
  DEEPSEEK_MODEL,
  REQUEST_TIMEOUT_MS,
} from "../constants/config";
import { createIntentSystemPrompt } from "../constants/prompts";
import type { StoredCalendarEvent } from "../stores/calendar.store";
import type { CalendarEvent, VoiceIntent } from "../types";

type DeepSeekMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type DeepSeekChoice = {
  message?: DeepSeekMessage;
};

type DeepSeekResponsePayload = {
  choices?: DeepSeekChoice[];
};

function isPlaceholderApiKey(apiKey: string): boolean {
  return apiKey.trim().length === 0 || apiKey.startsWith("your_");
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseDeepSeekPayload(payload: unknown): DeepSeekResponsePayload {
  if (!isObject(payload) || !Array.isArray(payload.choices)) {
    return {};
  }

  const choices = payload.choices
    .map((choice: unknown): DeepSeekChoice | null => {
      if (!isObject(choice) || !isObject(choice.message)) {
        return null;
      }

      const content = choice.message.content;
      if (typeof content !== "string") {
        return null;
      }

      return {
        message: {
          role: "assistant",
          content,
        },
      };
    })
    .filter((choice): choice is DeepSeekChoice => choice !== null);

  return { choices };
}

function extractJsonText(content: string): string {
  const trimmed = content.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }
  return trimmed;
}

function isDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isTimeString(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function normalizeCalendarEvent(value: unknown): CalendarEvent | null {
  if (!isObject(value)) {
    return null;
  }

  const { title, date, time, duration, reminder_min: reminderMin, allDay } = value;

  if (
    typeof title !== "string" ||
    title.trim().length === 0 ||
    typeof date !== "string" ||
    !isDateString(date) ||
    !(time === null || (typeof time === "string" && isTimeString(time))) ||
    typeof duration !== "number" ||
    !Number.isFinite(duration) ||
    typeof reminderMin !== "number" ||
    !Number.isFinite(reminderMin) ||
    typeof allDay !== "boolean"
  ) {
    return null;
  }

  return {
    title: title.trim(),
    date,
    time,
    duration: Math.max(1, Math.round(duration)),
    reminder_min: Math.max(0, Math.round(reminderMin)),
    allDay,
  };
}

function normalizeVoiceIntent(value: unknown): VoiceIntent {
  if (!isObject(value)) {
    return { action: "unknown" };
  }

  const { action } = value;

  if (action === "create") {
    const event = normalizeCalendarEvent(value.event);
    if (event) {
      return { action: "create", event };
    }
  }

  if (action === "delete") {
    const eventTitle = value.eventTitle;
    const eventDate = value.eventDate;
    if (
      typeof eventTitle === "string" &&
      eventTitle.trim().length > 0 &&
      typeof eventDate === "string" &&
      isDateString(eventDate)
    ) {
      return {
        action: "delete",
        eventTitle: eventTitle.trim(),
        eventDate,
      };
    }
  }

  if (action === "query") {
    const date = value.date;
    if (typeof date === "string" && isDateString(date)) {
      return { action: "query", date };
    }
  }

  return { action: "unknown" };
}

function parseVoiceIntent(content: string): VoiceIntent {
  const jsonText = extractJsonText(content);

  if (jsonText === "null") {
    return { action: "unknown" };
  }

  try {
    const parsed: unknown = JSON.parse(jsonText);
    return normalizeVoiceIntent(parsed);
  } catch {
    return { action: "unknown" };
  }
}

/**
 * 使用 DeepSeek 从语音转写文本中解析用户日历意图。
 *
 * @param text 用户语音转写后的中文文本。
 * @param existingEvents 当前月份已有的日历事件。
 * @returns VoiceIntent — create / delete / query / unknown。
 */
export async function parseIntent(
  text: string,
  existingEvents: StoredCalendarEvent[] = [],
): Promise<VoiceIntent> {
  try {
    const trimmedText = text.trim();
    if (!trimmedText || isPlaceholderApiKey(DEEPSEEK_API_KEY)) {
      return { action: "unknown" };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout((): void => {
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    const response = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          {
            role: "system",
            content: createIntentSystemPrompt(new Date(), existingEvents),
          },
          { role: "user", content: trimmedText },
        ],
        temperature: 0.1,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { action: "unknown" };
    }

    const payload = parseDeepSeekPayload(await response.json());
    const content = payload.choices?.[0]?.message?.content;

    if (!content) {
      return { action: "unknown" };
    }

    return parseVoiceIntent(content);
  } catch {
    return { action: "unknown" };
  }
}
