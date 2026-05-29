export type RecordingStatus = "idle" | "recording" | "processing";

export type CalendarEvent = {
  title: string;
  date: string;
  time: string | null;
  duration: number;
  reminder_min: number;
  allDay: boolean;
};
