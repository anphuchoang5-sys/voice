import { create } from "zustand";

import type { CalendarEvent } from "../types";

type StoredCalendarEvent = CalendarEvent & { id: string };

type CalendarStore = {
  events: StoredCalendarEvent[];
  addEvent: (event: StoredCalendarEvent) => void;
  removeEvent: (id: string) => void;
};

export const useCalendarStore = create<CalendarStore>((set) => ({
  events: [],
  addEvent: (event) =>
    set((state) => ({
      events: [
        event,
        ...state.events.filter((currentEvent) => currentEvent.id !== event.id),
      ],
    })),
  removeEvent: (id) =>
    set((state) => ({
      events: state.events.filter((event) => event.id !== id),
    })),
}));
