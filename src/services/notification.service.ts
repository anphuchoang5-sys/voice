import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import type { CalendarEvent } from "../types";
import { parseDateString } from "../utils/date";

const REMINDER_CHANNEL_ID = "voice-calendar-reminders";
const MIN_FUTURE_TRIGGER_MS = 60_000;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
        name: "语音日历提醒",
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#6C3CE1",
      });
    }

    const permission = await Notifications.requestPermissionsAsync();
    return permission.granted;
  } catch {
    return false;
  }
}

export async function scheduleReminder(
  event: CalendarEvent,
  eventId: string,
): Promise<void> {
  const triggerDate = getReminderTriggerDate(event);

  await Notifications.cancelScheduledNotificationAsync(
    getNotificationIdentifier(eventId),
  );
  await Notifications.scheduleNotificationAsync({
    identifier: getNotificationIdentifier(eventId),
    content: {
      title: "语音日历提醒",
      body: event.title,
      sound: true,
      color: "#6C3CE1",
      data: {
        eventId,
        date: event.date,
      },
    },
    trigger: {
      date: triggerDate,
      channelId: REMINDER_CHANNEL_ID,
    },
  });
}

export async function cancelReminder(eventId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(
    getNotificationIdentifier(eventId),
  );
}

function getNotificationIdentifier(eventId: string): string {
  return `voice-calendar-${eventId}`;
}

function getReminderTriggerDate(event: CalendarEvent): Date {
  const eventStartDate = getEventStartDate(event);
  const reminderOffset = Math.max(0, event.reminder_min) * 60_000;
  const triggerDate = new Date(eventStartDate.getTime() - reminderOffset);

  if (triggerDate.getTime() <= Date.now()) {
    return new Date(Date.now() + MIN_FUTURE_TRIGGER_MS);
  }

  return triggerDate;
}

function getEventStartDate(event: CalendarEvent): Date {
  const { year, monthIndex, day } = parseDateString(event.date);
  if (event.allDay || event.time === null) {
    return new Date(year, monthIndex, day, 9, 0, 0, 0);
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

