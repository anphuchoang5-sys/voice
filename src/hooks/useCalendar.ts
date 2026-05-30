import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";

import {
  deleteEvent as deleteSystemEvent,
  getEventsForMonth,
  requestCalendarPermission,
} from "../services/calendar.service";
import { cancelReminder } from "../services/notification.service";
import {
  type StoredCalendarEvent,
  useCalendarStore,
} from "../stores/calendar.store";
import type { CalendarEvent } from "../types";

type UseCalendarResult = {
  events: StoredCalendarEvent[];
  isLoading: boolean;
  errorMessage: string | null;
  hasCalendarPermission: boolean | null;
  loadEventsForMonth: () => Promise<void>;
  deleteCalendarEvent: (id: string) => Promise<void>;
};

export function useCalendar(year: number, month: number): UseCalendarResult {
  const events = useCalendarStore((state) => state.events);
  const setEvents = useCalendarStore((state) => state.setEvents);
  const removeEvent = useCalendarStore((state) => state.removeEvent);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasCalendarPermission, setHasCalendarPermission] = useState<
    boolean | null
  >(null);

  const loadEventsForMonth = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const permissionGranted = await requestCalendarPermission();
      setHasCalendarPermission(permissionGranted);

      if (!permissionGranted) {
        setEvents([]);
        setErrorMessage("请先授权日历权限");
        return;
      }

      const monthEvents = await getEventsForMonth(year, month);
      setEvents(monthEvents.filter(hasEventId));
    } catch {
      setErrorMessage("读取日历失败，请重试");
    } finally {
      setIsLoading(false);
    }
  }, [month, setEvents, year]);

  useFocusEffect(
    useCallback((): void => {
      void loadEventsForMonth();
    }, [loadEventsForMonth]),
  );

  const deleteCalendarEvent = useCallback(
    async (id: string): Promise<void> => {
      await deleteSystemEvent(id);
      try {
        await cancelReminder(id);
      } catch {
        // 取消通知失败不阻止删除流程
      }
      removeEvent(id);
    },
    [removeEvent],
  );

  return {
    events,
    isLoading,
    errorMessage,
    hasCalendarPermission,
    loadEventsForMonth,
    deleteCalendarEvent,
  };
}

function hasEventId(event: CalendarEvent): event is StoredCalendarEvent {
  return typeof event.id === "string" && event.id.length > 0;
}
