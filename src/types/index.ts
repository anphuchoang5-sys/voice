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
