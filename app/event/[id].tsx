import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EventConfirmCard } from "../../src/components/EventConfirmCard";
import {
  createEvent,
  deleteEvent as deleteSystemEvent,
  requestCalendarPermission,
} from "../../src/services/calendar.service";
import {
  cancelReminder,
  requestNotificationPermission,
  scheduleReminder,
} from "../../src/services/notification.service";
import { useCalendarStore } from "../../src/stores/calendar.store";
import type { StoredCalendarEvent } from "../../src/stores/calendar.store";
import type { CalendarEvent } from "../../src/types";

export default function EventDetailScreen(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const eventId = Array.isArray(id) ? id[0] : id;
  const decodedEventId = eventId ? decodeURIComponent(eventId) : "";
  const event = useCalendarStore((state) =>
    state.events.find(
      (currentEvent) =>
        currentEvent.id === eventId || currentEvent.id === decodedEventId,
    ),
  );
  const addEvent = useCalendarStore((state) => state.addEvent);
  const removeEvent = useCalendarStore((state) => state.removeEvent);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleDelete = async (targetEvent: StoredCalendarEvent): Promise<void> => {
    setIsBusy(true);
    setStatusMessage(null);

    try {
      await deleteSystemEvent(targetEvent.id);
      await cancelReminder(targetEvent.id);
      removeEvent(targetEvent.id);
      router.replace("/");
    } catch {
      setStatusMessage("删除事件失败，请重试");
    } finally {
      setIsBusy(false);
    }
  };

  const handleConfirmDelete = (): void => {
    if (!event) {
      return;
    }

    Alert.alert("删除事件", "确定要删除这个事件吗？", [
      { text: "取消", style: "cancel" },
      {
        text: "删除",
        style: "destructive",
        onPress: (): void => {
          void handleDelete(event);
        },
      },
    ]);
  };

  const handleUpdate = async (updatedEvent: CalendarEvent): Promise<void> => {
    if (!event) {
      return;
    }

    setIsBusy(true);
    setStatusMessage("正在更新事件...");

    try {
      const hasCalendarPermission = await requestCalendarPermission();
      if (!hasCalendarPermission) {
        setStatusMessage("请先授权日历权限");
        return;
      }

      await deleteSystemEvent(event.id);
      await cancelReminder(event.id);
      removeEvent(event.id);

      const nextEventId = await createEvent(updatedEvent);
      const savedEvent: StoredCalendarEvent = {
        ...updatedEvent,
        id: nextEventId,
      };

      const hasNotificationPermission = await requestNotificationPermission();
      if (hasNotificationPermission) {
        try {
          await scheduleReminder(savedEvent, nextEventId);
        } catch {
          setStatusMessage("事件已更新，但提醒设置失败");
        }
      }

      addEvent(savedEvent);
      setIsEditing(false);
      setStatusMessage("事件已更新");
      router.replace(`/event/${encodeURIComponent(nextEventId)}`);
    } catch {
      setStatusMessage("更新事件失败，请重试");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-night">
      <StatusBar style="light" />
      <ScrollView className="flex-1 px-6 py-5" contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="flex-row items-center justify-between">
          <Pressable
            className="h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 active:bg-white/10"
            onPress={(): void => router.back()}
          >
            <Ionicons color="#E2E8F0" name="chevron-back" size={22} />
          </Pressable>
          <Text className="text-lg font-semibold text-white">事件详情</Text>
          <View className="h-11 w-11" />
        </View>

        {!event ? (
          <View className="mt-8 rounded-[28px] border border-white/10 bg-white/5 p-6">
            <Text className="text-lg font-semibold text-white">未找到事件</Text>
            <Text className="mt-2 text-sm leading-6 text-slate-400">
              请回到主页刷新当前月份后再试。
            </Text>
          </View>
        ) : (
          <View className="mt-8 rounded-[28px] border border-white/10 bg-white/5 p-6">
            <Text className="text-2xl font-semibold text-white">{event.title}</Text>
            <View className="mt-6 gap-4">
              <DetailRow label="日期" value={event.date} />
              <DetailRow label="时间" value={getTimeLabel(event)} />
              <DetailRow label="持续" value={`${event.duration} 分钟`} />
              <DetailRow label="提醒" value={`提前 ${event.reminder_min} 分钟`} />
            </View>

            {statusMessage ? (
              <Text
                className={`mt-5 text-sm ${
                  statusMessage.includes("失败") ||
                  statusMessage.includes("授权")
                    ? "text-red-200"
                    : "text-slate-300"
                }`}
              >
                {statusMessage}
              </Text>
            ) : null}

            <View className="mt-7 flex-row gap-3">
              <Pressable
                className="h-14 flex-1 items-center justify-center rounded-full border border-violetSoft/40 bg-white/10 active:opacity-80"
                disabled={isBusy}
                onPress={(): void => setIsEditing(true)}
              >
                <Text className="text-base font-semibold text-violetSoft">
                  编辑
                </Text>
              </Pressable>
              <Pressable
                className="h-14 flex-1 items-center justify-center rounded-full bg-red-500 active:opacity-80"
                disabled={isBusy}
                onPress={handleConfirmDelete}
              >
                {isBusy ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-base font-semibold text-white">删除</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>

      <EventConfirmCard
        event={event ?? null}
        initialMode="editing"
        onCancel={(): void => setIsEditing(false)}
        onConfirm={(updatedEvent): void => {
          void handleUpdate(updatedEvent);
        }}
        visible={isEditing && Boolean(event)}
      />
    </SafeAreaView>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.JSX.Element {
  return (
    <View className="flex-row items-start justify-between gap-4">
      <Text className="text-sm font-medium text-slate-400">{label}</Text>
      <Text className="flex-1 text-right text-base font-semibold text-white">
        {value}
      </Text>
    </View>
  );
}

function getTimeLabel(event: StoredCalendarEvent): string {
  if (event.allDay || event.time === null) {
    return "全天";
  }

  return event.time;
}
