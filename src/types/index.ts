export type RecordingStatus = "idle" | "recording" | "processing";

export type CalendarEvent = {
  id?: string;
  title: string;
  date: string;
  time: string | null;
  duration: number;
  reminder_min: number;
  allDay: boolean;
};

export type VoiceIntent =
  | { action: "create"; events: CalendarEvent[] }
  | { action: "delete"; titles: { eventTitle: string; eventDate: string }[] }
  | { action: "update"; eventTitle: string; eventDate: string; updatedEvent: CalendarEvent }
  | { action: "query"; date: string }
  | { action: "unknown" };
