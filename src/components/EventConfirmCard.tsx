import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import type { CalendarEvent } from "../types";

type EventConfirmCardProps = {
  event: CalendarEvent | null;
  visible: boolean;
  onCancel: () => void;
  onConfirm: (event: CalendarEvent) => void;
};

type EditableEventFields = {
  title: string;
  date: string;
  time: string;
  reminderMin: string;
  allDay: boolean;
};

function createEditableFields(event: CalendarEvent): EditableEventFields {
  return {
    title: event.title,
    date: event.date,
    time: event.time ?? "",
    reminderMin: String(event.reminder_min),
    allDay: event.allDay,
  };
}

function buildCalendarEvent(
  originalEvent: CalendarEvent,
  fields: EditableEventFields,
): CalendarEvent {
  const reminderMin = Number.parseInt(fields.reminderMin, 10);
  const normalizedTime = fields.time.trim();

  return {
    ...originalEvent,
    title: fields.title.trim() || originalEvent.title,
    date: fields.date.trim() || originalEvent.date,
    time: fields.allDay || normalizedTime.length === 0 ? null : normalizedTime,
    reminder_min: Number.isFinite(reminderMin) ? Math.max(0, reminderMin) : 15,
    allDay: fields.allDay,
  };
}

export function EventConfirmCard({
  event,
  visible,
  onCancel,
  onConfirm,
}: EventConfirmCardProps): React.JSX.Element | null {
  const [fields, setFields] = useState<EditableEventFields | null>(null);
  const translateY = useSharedValue<number>(360);
  const opacity = useSharedValue<number>(0);

  useEffect((): void => {
    if (event) {
      setFields(createEditableFields(event));
    }
  }, [event]);

  useEffect((): void => {
    translateY.value = withTiming(visible ? 0 : 360, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
    });
    opacity.value = withTiming(visible ? 1 : 0, { duration: 200 });
  }, [opacity, translateY, visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!event || !fields) {
    return null;
  }

  const updateField = <TKey extends keyof EditableEventFields>(
    key: TKey,
    value: EditableEventFields[TKey],
  ): void => {
    setFields((currentFields) =>
      currentFields ? { ...currentFields, [key]: value } : currentFields,
    );
  };

  const handleConfirm = (): void => {
    onConfirm(buildCalendarEvent(event, fields));
  };

  return (
    <View className="absolute inset-0 justify-end bg-black/45">
      <Pressable className="flex-1" onPress={onCancel} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={16}
      >
        <Animated.View
          className="rounded-t-[32px] border border-white/10 bg-[#181426] px-6 pb-8 pt-6"
          style={sheetStyle}
        >
          <View className="mb-5 h-1.5 w-12 self-center rounded-full bg-white/20" />

          <Text className="text-xl font-semibold text-white">确认事件</Text>
          <Text className="mt-2 text-sm leading-6 text-slate-300">
            检查识别出的时间和提醒，确认后下一阶段会写入系统日历。
          </Text>

          <View className="mt-5 gap-4">
            <View>
              <Text className="mb-2 text-sm font-medium text-slate-300">标题</Text>
              <TextInput
                className="h-12 rounded-2xl border border-white/10 bg-white/10 px-4 text-base text-white"
                onChangeText={(value): void => updateField("title", value)}
                placeholder="事件标题"
                placeholderTextColor="#94A3B8"
                value={fields.title}
              />
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="mb-2 text-sm font-medium text-slate-300">日期</Text>
                <TextInput
                  className="h-12 rounded-2xl border border-white/10 bg-white/10 px-4 text-base text-white"
                  onChangeText={(value): void => updateField("date", value)}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94A3B8"
                  value={fields.date}
                />
              </View>
              <View className="w-28">
                <Text className="mb-2 text-sm font-medium text-slate-300">时间</Text>
                <TextInput
                  className="h-12 rounded-2xl border border-white/10 bg-white/10 px-4 text-base text-white"
                  editable={!fields.allDay}
                  onChangeText={(value): void => updateField("time", value)}
                  placeholder="HH:MM"
                  placeholderTextColor="#94A3B8"
                  value={fields.time}
                />
              </View>
            </View>

            <View className="flex-row items-end gap-3">
              <View className="flex-1">
                <Text className="mb-2 text-sm font-medium text-slate-300">
                  提前提醒（分钟）
                </Text>
                <TextInput
                  className="h-12 rounded-2xl border border-white/10 bg-white/10 px-4 text-base text-white"
                  keyboardType="number-pad"
                  onChangeText={(value): void => updateField("reminderMin", value)}
                  placeholder="15"
                  placeholderTextColor="#94A3B8"
                  value={fields.reminderMin}
                />
              </View>
              <Pressable
                className={`h-12 justify-center rounded-2xl border px-4 ${
                  fields.allDay
                    ? "border-violetSoft bg-violetDeep"
                    : "border-white/10 bg-white/10"
                }`}
                onPress={(): void => updateField("allDay", !fields.allDay)}
              >
                <Text className="text-sm font-semibold text-white">全天</Text>
              </Pressable>
            </View>
          </View>

          <View className="mt-6 flex-row gap-3">
            <Pressable
              className="h-14 flex-1 items-center justify-center rounded-full border border-white/10 bg-white/10 active:opacity-80"
              onPress={onCancel}
            >
              <Text className="text-base font-semibold text-slate-200">❌ 取消</Text>
            </Pressable>
            <Pressable
              className="h-14 flex-1 items-center justify-center rounded-full bg-violetDeep active:opacity-80"
              onPress={handleConfirm}
            >
              <Text className="text-base font-semibold text-white">✅ 确认</Text>
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}
