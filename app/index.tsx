import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CalendarGrid } from "../src/components/CalendarGrid";
import { EventListItem } from "../src/components/EventListItem";
import { useCalendar } from "../src/hooks/useCalendar";
import type { StoredCalendarEvent } from "../src/stores/calendar.store";
import { formatDate } from "../src/utils/date";

export default function HomeScreen(): React.JSX.Element {
  const today = useMemo(() => new Date(), []);
  const [visibleMonth, setVisibleMonth] = useState<Date>(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState<string>(formatDate(today));
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [operationMessage, setOperationMessage] = useState<string | null>(null);

  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth() + 1;
  const {
    events,
    isLoading,
    errorMessage,
    hasCalendarPermission,
    loadEventsForMonth,
    deleteCalendarEvent,
  } = useCalendar(year, month);

  const selectedDateEvents = useMemo(
    () =>
      events
        .filter((event) => event.date === selectedDate)
        .sort(compareEventsByTime),
    [events, selectedDate],
  );

  const changeMonth = (offset: number): void => {
    const nextMonth = new Date(year, visibleMonth.getMonth() + offset, 1);
    setVisibleMonth(nextMonth);
    setOperationMessage(null);

    if (isSameMonth(nextMonth, today)) {
      setSelectedDate(formatDate(today));
      return;
    }

    setSelectedDate(formatDate(nextMonth));
  };

  const handleDeleteEvent = async (
    event: StoredCalendarEvent,
  ): Promise<void> => {
    setDeletingId(event.id);
    setOperationMessage(null);

    try {
      await deleteCalendarEvent(event.id);
      setOperationMessage("事件已删除");
    } catch {
      setOperationMessage("删除事件失败，请重试");
    } finally {
      setDeletingId(null);
    }
  };

  const openEventDetail = (event: StoredCalendarEvent): void => {
    router.push(`/event/${encodeURIComponent(event.id)}`);
  };

  return (
    <SafeAreaView className="flex-1 bg-night">
      <StatusBar style="light" />
      <View className="flex-1 px-5 pb-5 pt-4">
        <View className="flex-row items-center justify-between">
          <Pressable
            className="h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 active:bg-white/10"
            onPress={(): void => changeMonth(-1)}
          >
            <Ionicons color="#E2E8F0" name="chevron-back" size={22} />
          </Pressable>

          <View className="items-center">
            <Text className="text-xs font-semibold uppercase tracking-[2px] text-violetSoft">
              VoiceCalendar
            </Text>
            <Text className="mt-1 text-2xl font-semibold text-white">
              {formatMonthTitle(year, month)}
            </Text>
          </View>

          <Pressable
            className="h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 active:bg-white/10"
            onPress={(): void => changeMonth(1)}
          >
            <Ionicons color="#E2E8F0" name="chevron-forward" size={22} />
          </Pressable>
        </View>

        <ScrollView
          className="mt-5 flex-1"
          contentContainerStyle={{ paddingBottom: 96 }}
          showsVerticalScrollIndicator={false}
        >
          <CalendarGrid
            events={events}
            month={month}
            onSelectDate={(date): void => {
              setSelectedDate(date);
              setOperationMessage(null);
            }}
            selectedDate={selectedDate}
            year={year}
          />

          <View className="mt-5 rounded-[28px] border border-white/10 bg-white/5 p-5">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-lg font-semibold text-white">
                  {formatSelectedDateTitle(selectedDate)}
                </Text>
                <Text className="mt-1 text-sm text-slate-400">
                  {selectedDateEvents.length > 0
                    ? `${selectedDateEvents.length} 个事件`
                    : "暂无事件"}
                </Text>
              </View>

              {isLoading ? <ActivityIndicator color="#A78BFA" /> : null}
            </View>

            {hasCalendarPermission === false ? (
              <PermissionPrompt onRetry={loadEventsForMonth} />
            ) : (
              <View className="mt-4 gap-3">
                {selectedDateEvents.map((event) => (
                  <EventListItem
                    key={event.id}
                    disabled={deletingId === event.id}
                    event={event}
                    onDelete={(nextEvent): void => {
                      void handleDeleteEvent(nextEvent);
                    }}
                    onPress={openEventDetail}
                  />
                ))}

                {!isLoading && selectedDateEvents.length === 0 ? (
                  <View className="rounded-2xl border border-dashed border-white/10 p-5">
                    <Text className="text-center text-sm leading-6 text-slate-400">
                      这一天还没有语音创建的日历事件
                    </Text>
                  </View>
                ) : null}
              </View>
            )}

            {errorMessage && hasCalendarPermission !== false ? (
              <Text className="mt-4 text-sm text-red-200">{errorMessage}</Text>
            ) : null}
            {operationMessage ? (
              <Text className="mt-4 text-sm text-slate-300">
                {operationMessage}
              </Text>
            ) : null}
          </View>
        </ScrollView>

        <Pressable
          className="absolute bottom-6 right-6 h-16 w-16 items-center justify-center rounded-full bg-violetDeep shadow-lg active:opacity-80"
          onPress={(): void => router.push("/record")}
        >
          <Ionicons color="#FFFFFF" name="mic" size={28} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function PermissionPrompt({
  onRetry,
}: {
  onRetry: () => Promise<void>;
}): React.JSX.Element {
  return (
    <View className="mt-4 rounded-2xl border border-violetSoft/30 bg-violetDeep/20 p-4">
      <Text className="text-base font-semibold text-white">请先授权日历权限</Text>
      <Text className="mt-2 text-sm leading-6 text-slate-300">
        授权后才能读取和管理“语音日历”中的事件。
      </Text>
      <Pressable
        className="mt-4 h-11 items-center justify-center rounded-full bg-violetDeep active:opacity-80"
        onPress={(): void => {
          void onRetry();
        }}
      >
        <Text className="text-sm font-semibold text-white">重新授权</Text>
      </Pressable>
    </View>
  );
}

function compareEventsByTime(
  first: StoredCalendarEvent,
  second: StoredCalendarEvent,
): number {
  if (first.time === null && second.time !== null) {
    return -1;
  }

  if (first.time !== null && second.time === null) {
    return 1;
  }

  return (first.time ?? "00:00").localeCompare(second.time ?? "00:00");
}

function isSameMonth(date: Date, targetDate: Date): boolean {
  return (
    date.getFullYear() === targetDate.getFullYear() &&
    date.getMonth() === targetDate.getMonth()
  );
}

function formatMonthTitle(year: number, month: number): string {
  return `${year}年${month}月`;
}

function formatSelectedDateTitle(date: string): string {
  const [, month, day] = date.split("-");
  return `${Number(month)}月${Number(day)}日`;
}
