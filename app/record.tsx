import * as Haptics from "expo-haptics";
import { Link, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EventConfirmCard } from "../src/components/EventConfirmCard";
import { RecordButton } from "../src/components/RecordButton";
import { WaveformAnimation } from "../src/components/WaveformAnimation";
import { useVoice } from "../src/hooks/useVoice";
import {
  createEvent,
  deleteEvent as deleteSystemEvent,
  requestCalendarPermission,
} from "../src/services/calendar.service";
import { parseIntent } from "../src/services/intent.service";
import {
  cancelReminder,
  requestNotificationPermission,
  scheduleReminder,
} from "../src/services/notification.service";
import { useCalendarStore } from "../src/stores/calendar.store";
import type { StoredCalendarEvent } from "../src/stores/calendar.store";
import type { CalendarEvent, RecordingStatus, VoiceIntent } from "../src/types";

type RecordAppState = "idle" | "parsing" | "saving" | "deleting";

const TRANSCRIPT_PLACEHOLDER = "点击录音按钮，说出要加入日历的事情。";

const STATUS_HINTS: Record<RecordingStatus, string> = {
  idle: "准备就绪",
  recording: "仔细聆听中",
  processing: "思考中",
};

export default function RecordScreen(): React.JSX.Element {
  const [appState, setAppState] = useState<RecordAppState>("idle");
  const [intentError, setIntentError] = useState<string | null>(null);
  const [calendarMessage, setCalendarMessage] = useState<string | null>(null);
  const [parsedIntent, setParsedIntent] = useState<VoiceIntent | null>(null);
  const [confirmedEvent, setConfirmedEvent] = useState<CalendarEvent | null>(null);
  const lastParsedTextRef = useRef<string | null>(null);
  const addEvent = useCalendarStore((state) => state.addEvent);
  const removeEvent = useCalendarStore((state) => state.removeEvent);
  const existingEvents = useCalendarStore((state) => state.events);

  const {
    voiceState,
    partialText,
    finalText,
    errorMessage: voiceError,
    startListening,
    stopListening,
  } = useVoice();

  const status: RecordingStatus =
    appState !== "idle" || voiceState === "processing"
      ? "processing"
      : voiceState === "listening"
        ? "recording"
        : "idle";

  const handleDeleteIntent = useCallback(
    async (intent: VoiceIntent & { action: "delete" }): Promise<void> => {
      setAppState("deleting");

      const deleted: string[] = [];
      const notFound: string[] = [];

      for (const title of intent.titles) {
        const match = existingEvents.find(
          (event) =>
            event.date === title.eventDate &&
            event.title
              .toLowerCase()
              .includes(title.eventTitle.toLowerCase()),
        );

        if (match) {
          try {
            await deleteSystemEvent(match.id);
            await cancelReminder(match.id).catch(() => {});
            removeEvent(match.id);
            deleted.push(match.title);
          } catch {
            // skip
          }
        } else {
          notFound.push(`"${title.eventTitle}"`);
        }
      }

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (deleted.length > 0) {
        const suffix =
          notFound.length > 0 ? `（未找到 ${notFound.join("、")}）` : "";
        setCalendarMessage(`已删除：${deleted.join("、")}${suffix}`);
      } else {
        setCalendarMessage("未找到匹配的事件");
      }

      setParsedIntent(null);
      setAppState("idle");
    },
    [existingEvents, removeEvent],
  );

  const handleUpdateIntent = useCallback(
    async (intent: VoiceIntent & { action: "update" }): Promise<void> => {
      const match = existingEvents.find(
        (event) =>
          event.date === intent.eventDate &&
          event.title
            .toLowerCase()
            .includes(intent.eventTitle.toLowerCase()),
      );

      if (!match) {
        setIntentError(
          `未找到 ${intent.eventDate} 的"${intent.eventTitle}"相关事件`,
        );
        setAppState("idle");
        return;
      }

      try {
        await deleteSystemEvent(match.id);
        await cancelReminder(match.id).catch(() => {});
        removeEvent(match.id);

        const hasCalendarPermission = await requestCalendarPermission();
        if (!hasCalendarPermission) {
          setCalendarMessage("未获得日历权限，无法修改事件");
          return;
        }

        const eventId = await createEvent(intent.updatedEvent);
        addEvent({ ...intent.updatedEvent, id: eventId });

        const hasNotificationPermission = await requestNotificationPermission();
        if (hasNotificationPermission) {
          try {
            await scheduleReminder(intent.updatedEvent, eventId);
          } catch {
            // reminder failure is non-fatal
          }
        }

        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setCalendarMessage(
          `已将「${match.title}」改为「${intent.updatedEvent.title}」`,
        );
      } catch {
        setCalendarMessage("修改事件失败，请重试");
      } finally {
        setParsedIntent(null);
        setAppState("idle");
      }
    },
    [existingEvents, removeEvent, addEvent],
  );

  const handleBatchCreate = useCallback(
    async (events: CalendarEvent[]): Promise<void> => {
      setAppState("saving");
      setCalendarMessage(`正在添加 ${events.length} 个事件...`);

      try {
        const hasCalendarPermission = await requestCalendarPermission();
        if (!hasCalendarPermission) {
          setCalendarMessage("未获得日历权限，无法写入系统日历");
          return;
        }

        const hasNotificationPermission = await requestNotificationPermission();
        const titles: string[] = [];
        let reminderFailed = false;

        for (const event of events) {
          const eventId = await createEvent(event);
          titles.push(event.title);
          addEvent({ ...event, id: eventId });

          if (hasNotificationPermission) {
            try {
              await scheduleReminder(event, eventId);
            } catch {
              reminderFailed = true;
            }
          }
        }

        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setConfirmedEvent(events[events.length - 1]);
        setCalendarMessage(
          `✅ 已添加 ${events.length} 个事件：${titles.join("、")}${reminderFailed ? "（部分提醒设置失败）" : ""}`,
        );
      } catch {
        setCalendarMessage("写入日历失败，请重试");
      } finally {
        setParsedIntent(null);
        setAppState("idle");
      }
    },
    [addEvent],
  );

  const handleQueryIntent = useCallback(
    (intent: VoiceIntent & { action: "query" }): void => {
      setParsedIntent(null);
      router.replace({
        pathname: "/",
        params: { focusDate: intent.date },
      });
    },
    [],
  );

  const parseFinalText = useCallback(
    async (text: string): Promise<void> => {
      setAppState("parsing");
      setIntentError(null);
      setCalendarMessage(null);
      setParsedIntent(null);

      try {
        const intent = await parseIntent(text, existingEvents);

        switch (intent.action) {
          case "create": {
            if (intent.events.length === 1) {
              setParsedIntent(intent);
            } else if (intent.events.length > 1) {
              void handleBatchCreate(intent.events);
            } else {
              setIntentError("未能识别事件信息，请重新描述");
            }
            break;
          }
          case "delete": {
            setParsedIntent(intent);
            const titleText = intent.titles
              .map((t) => `「${t.eventTitle}」${t.eventDate}`)
              .join("、");
            Alert.alert(
              "删除事件",
              `要删除 ${titleText} 吗？`,
              [
                { text: "取消", style: "cancel" },
                {
                  text: "删除",
                  style: "destructive",
                  onPress: (): void => {
                    void handleDeleteIntent(intent);
                  },
                },
              ],
            );
            break;
          }
          case "update":
            setAppState("deleting");
            void handleUpdateIntent(intent);
            break;
          case "query":
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            handleQueryIntent(intent);
            break;
          case "unknown":
            setIntentError("未能识别事件信息，请重新描述");
            break;
        }
      } catch {
        setIntentError("未能识别事件信息，请重新描述");
      } finally {
        setAppState("idle");
      }
    },
    [existingEvents, handleDeleteIntent, handleQueryIntent],
  );

  useEffect((): void => {
    const normalizedFinalText = finalText?.trim();
    if (
      !normalizedFinalText ||
      lastParsedTextRef.current === normalizedFinalText
    ) {
      return;
    }

    lastParsedTextRef.current = normalizedFinalText;
    void parseFinalText(normalizedFinalText);
  }, [finalText, parseFinalText]);

  const handleToggleRecording = (): void => {
    if (voiceState === "idle" && appState === "idle") {
      lastParsedTextRef.current = null;
      setIntentError(null);
      setCalendarMessage(null);
      setParsedIntent(null);
      setConfirmedEvent(null);
      void startListening();
      return;
    }

    if (voiceState === "listening") {
      void stopListening();
    }
  };

  const handleCancelEvent = (): void => {
    setParsedIntent(null);
  };

  const handleConfirmEvent = (event: CalendarEvent): void => {
    void saveEventToCalendar(event);
  };

  const saveEventToCalendar = async (event: CalendarEvent): Promise<void> => {
    setAppState("saving");
    setCalendarMessage("正在写入系统日历...");

    try {
      const hasCalendarPermission = await requestCalendarPermission();
      if (!hasCalendarPermission) {
        setCalendarMessage("未获得日历权限，无法写入系统日历");
        setParsedIntent(null);
        return;
      }

      const eventId = await createEvent(event);
      const savedEvent: CalendarEvent & { id: string } = {
        ...event,
        id: eventId,
      };
      let reminderMessage = "";

      const hasNotificationPermission = await requestNotificationPermission();
      if (hasNotificationPermission) {
        try {
          await scheduleReminder(event, eventId);
        } catch {
          reminderMessage = "（提醒设置失败）";
        }
      } else {
        reminderMessage = "（未开启通知权限，未设置提醒）";
      }

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      addEvent(savedEvent);
      setConfirmedEvent(savedEvent);
      setParsedIntent(null);
      setIntentError(null);
      setCalendarMessage(`✅ 已加入日历${reminderMessage}`);
    } catch {
      setCalendarMessage("写入日历失败，请重试");
    } finally {
      setAppState("idle");
    }
  };

  const recognizedText = partialText || finalText;
  const displayText =
    voiceError ??
    intentError ??
    calendarMessage ??
    (confirmedEvent ? `已加入日历：${confirmedEvent.title}` : null) ??
    recognizedText ??
    TRANSCRIPT_PLACEHOLDER;

  const hasDisplayError =
    Boolean(voiceError ?? intentError) ||
    (calendarMessage?.includes("失败") === true &&
      !calendarMessage.startsWith("✅") &&
      !calendarMessage.startsWith("已删除")) ||
    calendarMessage?.includes("未获得") === true;

  const transcriptText =
    voiceState === "listening"
      ? partialText || "正在仔细聆听..."
      : voiceState === "processing"
        ? "正在整理语音..."
        : appState === "parsing"
          ? "正在解析事件信息..."
          : appState === "saving"
            ? "正在写入系统日历..."
            : appState === "deleting"
              ? "正在删除事件..."
              : displayText;

  const createEventData =
    parsedIntent?.action === "create" && parsedIntent.events.length === 1
      ? parsedIntent.events[0]
      : null;

  return (
    <SafeAreaView className="flex-1 bg-night">
      <StatusBar style="light" />
      <View className="flex-1 px-6 py-5">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-sm font-medium uppercase tracking-[2px] text-violetSoft">
              VoiceCalendar
            </Text>
            <Text className="mt-2 text-2xl font-semibold text-white">语音记录</Text>
          </View>

          <Link href="/" asChild>
            <Pressable className="h-11 justify-center rounded-full border border-white/10 px-4 active:bg-white/10">
              <Text className="text-sm font-medium text-slate-200">返回</Text>
            </Pressable>
          </Link>
        </View>

        <View className="flex-1 items-center justify-center">
          <Text className="mb-8 text-base text-slate-300">
            {STATUS_HINTS[status]}
          </Text>
          <View className="h-56 w-56 items-center justify-center">
            <WaveformAnimation isActive={voiceState === "listening"} />
            <RecordButton status={status} onPress={handleToggleRecording} />
          </View>
          <Text className="mt-6 text-center text-lg font-semibold text-white">
            {voiceState === "listening" ? "正在聆听" : "语音记录"}
          </Text>
          <Text className="mt-8 text-center text-sm leading-6 text-slate-400">
            {voiceState === "listening"
              ? "环境安静约 2 秒会自动停止，也可以再次点击停止"
              : status === "processing"
                ? "正在把语音整理成日历事件"
                : "试试说「明天下午三点开会」「删除明天下午的会议」「后天有什么安排」"}
          </Text>
        </View>

        <View className="min-h-[156px] rounded-[28px] border border-white/10 bg-white/5 p-5">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-semibold text-white">识别文字</Text>
            {status === "processing" ? (
              <ActivityIndicator color="#A78BFA" />
            ) : null}
          </View>
          <Text
            className={`mt-4 text-base leading-7 ${
              hasDisplayError ? "text-red-200" : "text-slate-200"
            }`}
          >
            {transcriptText}
          </Text>
        </View>
      </View>

      <EventConfirmCard
        event={createEventData}
        onCancel={handleCancelEvent}
        onConfirm={handleConfirmEvent}
        visible={createEventData !== null}
      />
    </SafeAreaView>
  );
}
