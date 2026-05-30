export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatTime(date: Date): string {
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${hour}:${minute}`;
}

export function parseDateString(date: string): {
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
