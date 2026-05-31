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
  | { action: "create"; event: CalendarEvent }
  | { action: "delete"; eventTitle: string; eventDate: string }
  | { action: "query"; date: string }
  | { action: "unknown" };
