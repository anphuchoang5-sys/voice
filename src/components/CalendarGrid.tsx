import { Pressable, Text, View } from "react-native";

import type { CalendarEvent } from "../types";
import { formatDate } from "../utils/date";

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];
const CELL_WIDTH = `${100 / 7}%`;

type CalendarGridProps = {
  year: number;
  month: number;
  events: CalendarEvent[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
};

export function CalendarGrid({
  year,
  month,
  events,
  selectedDate,
  onSelectDate,
}: CalendarGridProps): React.JSX.Element {
  const todayDate = formatDate(new Date());
  const eventDates = new Set(events.map((event) => event.date));
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const leadingEmptyCells = (firstWeekday + 6) % 7;

  return (
    <View className="rounded-[28px] border border-white/10 bg-white/5 p-3">
      <View className="flex-row">
        {WEEKDAYS.map((weekday) => (
          <View key={weekday} className="items-center py-2" style={{ width: CELL_WIDTH }}>
            <Text className="text-xs font-semibold text-slate-400">{weekday}</Text>
          </View>
        ))}
      </View>

      <View className="flex-row flex-wrap">
        {Array.from({ length: leadingEmptyCells }).map((_, index) => (
          <View key={`empty-${index}`} className="h-14" style={{ width: CELL_WIDTH }} />
        ))}

        {Array.from({ length: daysInMonth }).map((_, index) => {
          const day = index + 1;
          const date = formatDate(new Date(year, month - 1, day));
          const isSelected = selectedDate === date;
          const isToday = todayDate === date;
          const hasEvent = eventDates.has(date);

          return (
            <View key={date} className="h-14 p-1" style={{ width: CELL_WIDTH }}>
              <Pressable
                className={`h-full items-center justify-center rounded-2xl border ${
                  isSelected
                    ? isToday
                      ? "border-white bg-violetDeep"
                      : "border-violetDeep bg-violetDeep"
                    : isToday
                      ? "border-white bg-white/5"
                      : "border-transparent bg-transparent"
                } active:opacity-80`}
                onPress={(): void => onSelectDate(date)}
              >
                <Text
                  className={`text-base font-semibold ${
                    isSelected ? "text-white" : "text-slate-100"
                  }`}
                >
                  {day}
                </Text>
                <View
                  className={`mt-1 h-1.5 w-1.5 rounded-full ${
                    hasEvent ? "bg-violetSoft" : "bg-transparent"
                  }`}
                />
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

