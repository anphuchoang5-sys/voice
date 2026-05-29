import * as Calendar from "expo-calendar";
import { Platform } from "react-native";

import type { CalendarEvent } from "../types";

const VOICE_CALENDAR_TITLE = "语音日历";
const VOICE_CALENDAR_COLOR = "#6C3CE1";
const DEFAULT_EVENT_DURATION_MINUTES = 60;
const DEFAULT_REMINDER_MINUTES = 15;

let cachedVoiceCalendarId: string | null = null;

export async function requestCalendarPermission(): Promise<boolean> {
  try {
    const permission = await Calendar.requestCalendarPermissionsAsync();
    return permission.granted;
  } catch {
    return false;
  }
}

export async function getOrCreateVoiceCalendar(): Promise<string> {
  if (cachedVoiceCalendarId) {
    return cachedVoiceCalendarId;
  }

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const existingCalendar = calendars.find(
    (calendar) =>
      calendar.title === VOICE_CALENDAR_TITLE && calendar.allowsModifications,
  );

  if (existingCalendar) {
    cachedVoiceCalendarId = existingCalendar.id;
    return existingCalendar.id;
  }

  const calendarId = await Calendar.createCalendarAsync(
    await buildVoiceCalendarDetails(),
  );
  cachedVoiceCalendarId = calendarId;
  return calendarId;
}

export async function createEvent(event: CalendarEvent): Promise<string> {
  const calendarId = await getOrCreateVoiceCalendar();
  const allDay = event.allDay || event.time === null;
  const startDate = getEventStartDate(event);
  const endDate = allDay
    ? addDays(startDate, 1)
    : addMinutes(startDate, getNormalizedDuration(event.duration));

  return Calendar.createEventAsync(calendarId, {
    title: event.title,
    startDate,
    endDate,
    allDay,
    alarms:
      event.reminder_min > 0 && !allDay
        ? [
            {
              relativeOffset: -event.reminder_min,
              method: Calendar.AlarmMethod.ALERT,
            },
          ]
        : [],
    notes: "由 VoiceCalendar 语音创建",
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
}

export async function deleteEvent(eventId: string): Promise<void> {
  await Calendar.deleteEventAsync(eventId);
}

export async function getEventsForMonth(
  year: number,
  month: number,
): Promise<CalendarEvent[]> {
  const calendarId = await getOrCreateVoiceCalendar();
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);
  const events = await Calendar.getEventsAsync([calendarId], startDate, endDate);

  return events.map(mapCalendarEvent);
}

async function buildVoiceCalendarDetails(): Promise<Partial<Calendar.Calendar>> {
  if (Platform.OS === "ios") {
    const defaultCalendar = await Calendar.getDefaultCalendarAsync();
    return {
      title: VOICE_CALENDAR_TITLE,
      color: VOICE_CALENDAR_COLOR,
      entityType: Calendar.EntityTypes.EVENT,
      sourceId: defaultCalendar.sourceId,
      source: defaultCalendar.source,
    };
  }

  return {
    title: VOICE_CALENDAR_TITLE,
    name: VOICE_CALENDAR_TITLE,
    color: VOICE_CALENDAR_COLOR,
    entityType: Calendar.EntityTypes.EVENT,
    ownerAccount: "VoiceCalendar",
    source: {
      name: "VoiceCalendar",
      type: Calendar.SourceType.LOCAL,
      isLocalAccount: true,
    },
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
    allowedReminders: [Calendar.AlarmMethod.ALERT],
    isVisible: true,
    isSynced: true,
  };
}

function mapCalendarEvent(event: Calendar.Event): CalendarEvent {
  const startDate = new Date(event.startDate);
  const endDate = new Date(event.endDate);
  const duration = Math.max(
    1,
    Math.round((endDate.getTime() - startDate.getTime()) / 60_000),
  );
  const reminderMin = Math.abs(event.alarms?.[0]?.relativeOffset ?? 0);

  return {
    id: event.id,
    title: event.title,
    date: formatDate(startDate),
    time: event.allDay ? null : formatTime(startDate),
    duration: event.allDay ? DEFAULT_EVENT_DURATION_MINUTES : duration,
    reminder_min:
      reminderMin > 0 ? reminderMin : DEFAULT_REMINDER_MINUTES,
    allDay: event.allDay,
  };
}

function getEventStartDate(event: CalendarEvent): Date {
  const { year, monthIndex, day } = parseDateString(event.date);
  if (event.allDay || event.time === null) {
    return new Date(year, monthIndex, day, 0, 0, 0, 0);
  }

  const [hourText, minuteText] = event.time.split(":");
  const hour = Number.parseInt(hourText, 10);
  const minute = Number.parseInt(minuteText ?? "0", 10);

  return new Date(
    year,
    monthIndex,
    day,
    Number.isFinite(hour) ? hour : 0,
    Number.isFinite(minute) ? minute : 0,
    0,
    0,
  );
}

function parseDateString(date: string): {
  year: number;
  monthIndex: number;
  day: number;
} {
  const [yearText, monthText, dayText] = date.split("-");
  const year = Number.parseInt(yearText, 10);
  const month = Number.parseInt(monthText, 10);
  const day = Number.parseInt(dayText, 10);

  return {
    year: Number.isFinite(year) ? year : new Date().getFullYear(),
    monthIndex: Number.isFinite(month) ? Math.max(0, month - 1) : 0,
    day: Number.isFinite(day) ? day : 1,
  };
}

function getNormalizedDuration(duration: number): number {
  return Number.isFinite(duration) && duration > 0
    ? duration
    : DEFAULT_EVENT_DURATION_MINUTES;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60_000);
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTime(date: Date): string {
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${hour}:${minute}`;
}
