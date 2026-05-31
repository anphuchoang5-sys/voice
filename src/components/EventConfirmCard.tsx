import { useCallback, useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import type { CalendarEvent } from "../types";

type ConfirmCardMode = "summary" | "editing";

type EventConfirmCardProps = {
  event: CalendarEvent | null;
  initialMode?: ConfirmCardMode;
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
  initialMode = "summary",
  visible,
  onCancel,
  onConfirm,
}: EventConfirmCardProps): React.JSX.Element | null {
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [currentEvent, setCurrentEvent] = useState<CalendarEvent | null>(null);
  const [mode, setMode] = useState<ConfirmCardMode>("summary");
  const [fields, setFields] = useState<EditableEventFields | null>(null);

  // 居中弹窗：用缩放 + 淡入代替底部滑入
  const scale = useSharedValue<number>(0.92);
  const opacity = useSharedValue<number>(0);
  const contentOpacity = useSharedValue<number>(1);
  const contentTranslateY = useSharedValue<number>(0);

  useEffect((): void => {
    if (event) {
      setCurrentEvent(event);
      setFields(createEditableFields(event));
      setMode(initialMode);
      contentOpacity.value = 1;
      contentTranslateY.value = 0;
    }
  }, [contentOpacity, contentTranslateY, event, initialMode]);

  const finishUnmount = useCallback((): void => {
    setIsMounted(false);
    setCurrentEvent(null);
    setFields(null);
    setMode("summary");
  }, []);

  useEffect((): void => {
    if (visible) {
      setIsMounted(true);
      scale.value = 0.92;
      opacity.value = 0;
      requestAnimationFrame((): void => {
        scale.value = withTiming(1, {
          duration: 220,
          easing: Easing.out(Easing.cubic),
        });
        opacity.value = withTiming(1, { duration: 180 });
      });
      return;
    }

    if (isMounted) {
      scale.value = withTiming(
        0.92,
        { duration: 160, easing: Easing.in(Easing.cubic) },
        (finished) => {
          if (finished) {
            runOnJS(finishUnmount)();
          }
        },
      );
      opacity.value = withTiming(0, { duration: 140 });
    }
  }, [finishUnmount, isMounted, opacity, scale, visible]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const previewEvent = useMemo((): CalendarEvent | null => {
    if (!currentEvent || !fields) {
      return null;
    }

    return buildCalendarEvent(currentEvent, fields);
  }, [currentEvent, fields]);

  if (!isMounted || !fields || !previewEvent) {
    return null;
  }

  const updateField = <TKey extends keyof EditableEventFields>(
    key: TKey,
    value: EditableEventFields[TKey],
  ): void => {
    setFields((currentFields) => {
      if (!currentFields) {
        return currentFields;
      }

      const nextFields = { ...currentFields, [key]: value };
      if (key === "allDay" && value === true) {
        nextFields.time = "";
      }

      return nextFields;
    });
  };

  const animateModeIn = (nextMode: ConfirmCardMode): void => {
    setMode(nextMode);
    contentOpacity.value = 0;
    contentTranslateY.value = 10;
    requestAnimationFrame((): void => {
      contentOpacity.value = withTiming(1, { duration: 160 });
      contentTranslateY.value = withTiming(0, { duration: 160 });
    });
  };

  const switchMode = (nextMode: ConfirmCardMode): void => {
    if (nextMode === mode) {
      return;
    }

    contentOpacity.value = withTiming(0, { duration: 120 }, (finished) => {
      if (finished) {
        runOnJS(animateModeIn)(nextMode);
      }
    });
    contentTranslateY.value = withTiming(-8, { duration: 120 });
  };

  const returnToSummary = (): void => {
    setFields((currentFields) =>
      currentFields ? { ...currentFields } : currentFields,
    );
    switchMode("summary");
  };

  const handleConfirm = (): void => {
    onConfirm(previewEvent);
  };

  return (
    <Modal
      animationType="none"
      onRequestClose={onCancel}
      statusBarTranslucent
      transparent
      visible={isMounted}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        {/* 半透明遮罩 */}
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={styles.backdropPress} onPress={onCancel} />
        </Animated.View>

        {/* 居中卡片 */}
        <Animated.View style={[styles.card, cardStyle]}>
          {/* 标题栏 */}
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text className="text-xl font-semibold text-white">确认事件</Text>
              <Text className="mt-1 text-sm leading-5 text-slate-300">
                {mode === "summary"
                  ? "检查识别结果，确认后写入系统日历。"
                  : "调整字段后保存。"}
              </Text>
            </View>
            <Text className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-violetSoft">
              {mode === "summary" ? "预览" : "编辑中"}
            </Text>
          </View>

          {/* 可滚动内容区域 */}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.scrollArea}
          >
            <Animated.View style={contentStyle}>
              {mode === "summary" ? (
                <SummaryContent event={previewEvent} />
              ) : (
                <View className="gap-4">
                  <View>
                    <Text className="mb-2 text-sm font-medium text-slate-300">
                      标题
                    </Text>
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
                      <Text className="mb-2 text-sm font-medium text-slate-300">
                        日期
                      </Text>
                      <TextInput
                        className="h-12 rounded-2xl border border-white/10 bg-white/10 px-4 text-base text-white"
                        onChangeText={(value): void =>
                          updateField("date", value)
                        }
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor="#94A3B8"
                        value={fields.date}
                      />
                    </View>
                    <View className="w-28">
                      <Text className="mb-2 text-sm font-medium text-slate-300">
                        时间
                      </Text>
                      <TextInput
                        className="h-12 rounded-2xl border border-white/10 bg-white/10 px-4 text-base text-white disabled:bg-white/5 disabled:text-slate-400"
                        editable={!fields.allDay}
                        onChangeText={(value): void =>
                          updateField("time", value)
                        }
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
                        onChangeText={(value): void =>
                          updateField("reminderMin", value.replace(/\D/g, ""))
                        }
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
                      <Text className="text-sm font-semibold text-white">
                        {fields.allDay ? "全天开启" : "全天"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </Animated.View>
          </ScrollView>

          {/* 底部按钮 */}
          {mode === "summary" ? (
            <View className="mt-5 flex-row gap-3">
              <Pressable
                className="h-12 flex-1 items-center justify-center rounded-full border border-white/10 bg-white/10 active:opacity-70"
                onPress={onCancel}
              >
                <Text className="text-sm font-semibold text-slate-200">
                  取消
                </Text>
              </Pressable>
              <Pressable
                className="h-12 flex-1 items-center justify-center rounded-full border border-violetSoft/40 bg-white/10 active:opacity-70"
                onPress={(): void => switchMode("editing")}
              >
                <Text className="text-sm font-semibold text-violetSoft">
                  ✏️ 编辑
                </Text>
              </Pressable>
              <Pressable
                className="h-12 items-center justify-center rounded-full bg-violetDeep px-5 active:opacity-70"
                onPress={handleConfirm}
              >
                <Text className="text-sm font-semibold text-white">
                  ✅ 确认
                </Text>
              </Pressable>
            </View>
          ) : (
            <View className="mt-5 flex-row gap-3">
              <Pressable
                className="h-12 flex-1 items-center justify-center rounded-full border border-white/10 bg-white/10 active:opacity-70"
                onPress={returnToSummary}
              >
                <Text className="text-sm font-semibold text-slate-200">
                  ← 返回
                </Text>
              </Pressable>
              <Pressable
                className="h-12 flex-1 items-center justify-center rounded-full bg-violetDeep active:opacity-70"
                onPress={returnToSummary}
              >
                <Text className="text-sm font-semibold text-white">
                  💾 保存
                </Text>
              </Pressable>
            </View>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  backdropPress: {
    flex: 1,
  },
  card: {
    backgroundColor: "#181426",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
    maxHeight: "85%",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
  },
  scrollArea: {
    flexGrow: 0,
  },
});

function SummaryContent({ event }: { event: CalendarEvent }): React.JSX.Element {
  const displayTime = event.allDay || event.time === null ? "全天" : event.time;

  return (
    <View className="gap-3 rounded-[24px] border border-white/10 bg-white/10 p-4">
      <SummaryRow label="标题" value={event.title} />
      <SummaryRow label="日期" value={event.date} />
      <SummaryRow label="时间" value={displayTime} />
      <SummaryRow label="提醒" value={`提前 ${event.reminder_min} 分钟`} />
    </View>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.JSX.Element {
  return (
    <View className="flex-row items-center justify-between gap-4">
      <Text className="text-sm font-medium text-slate-400">{label}</Text>
      <Text className="flex-1 text-right text-base font-semibold text-white">
        {value}
      </Text>
    </View>
  );
}
