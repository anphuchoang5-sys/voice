import * as Haptics from "expo-haptics";
import { Link } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EventConfirmCard } from "../src/components/EventConfirmCard";
import { RecordButton } from "../src/components/RecordButton";
import { WaveformAnimation } from "../src/components/WaveformAnimation";
import { useRecording } from "../src/hooks/useRecording";
import {
  createEvent,
  getOrCreateVoiceCalendar,
  requestCalendarPermission,
} from "../src/services/calendar.service";
import { parseIntent } from "../src/services/intent.service";
import {
  requestNotificationPermission,
  scheduleReminder,
} from "../src/services/notification.service";
import { transcribeAudio } from "../src/services/stt.service";
import { useCalendarStore } from "../src/stores/calendar.store";
import type { CalendarEvent, RecordingStatus } from "../src/types";

const TRANSCRIPT_PLACEHOLDER = "点击录音按钮，说出要加入日历的事情。";

const STATUS_HINTS: Record<RecordingStatus, string> = {
  idle: "准备就绪",
  recording: "正在记录你的语音",
  processing: "识别中，请稍候",
};

function formatDuration(durationMillis: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMillis / 1000));
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export default function RecordScreen(): React.JSX.Element {
  const [transcript, setTranscript] = useState<string>("");
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [isParsingIntent, setIsParsingIntent] = useState<boolean>(false);
  const [isSavingEvent, setIsSavingEvent] = useState<boolean>(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(
    null,
  );
  const [intentError, setIntentError] = useState<string | null>(null);
  const [calendarMessage, setCalendarMessage] = useState<string | null>(null);
  const [parsedEvent, setParsedEvent] = useState<CalendarEvent | null>(null);
  const [confirmedEvent, setConfirmedEvent] = useState<CalendarEvent | null>(null);
  const lastProcessedAudioUriRef = useRef<string | null>(null);
  const addEvent = useCalendarStore((state) => state.addEvent);

  const {
    isRecording,
    audioUri,
    durationMillis,
    metering,
    errorMessage: recordingError,
    startRecording,
    stopRecording,
  } = useRecording();

  const status: RecordingStatus = isTranscribing || isParsingIntent || isSavingEvent
    ? "processing"
    : isRecording
      ? "recording"
      : "idle";

  const processAudio = useCallback(async (nextAudioUri: string): Promise<void> => {
    setIsTranscribing(true);
    setIsParsingIntent(false);
    setTranscriptionError(null);
    setIntentError(null);
    setCalendarMessage(null);
    setParsedEvent(null);
    setConfirmedEvent(null);

    try {
      const text = await transcribeAudio(nextAudioUri);
      setTranscript(text);
      setIsTranscribing(false);
      setIsParsingIntent(true);

      const event = await parseIntent(text);
      if (event) {
        setParsedEvent(event);
      } else {
        setIntentError("未能识别事件信息，请重新描述");
      }
    } catch {
      setTranscript("");
      setTranscriptionError("识别失败，请重试");
    } finally {
      setIsTranscribing(false);
      setIsParsingIntent(false);
    }
  }, []);

  useEffect((): void => {
    if (
      !audioUri ||
      isRecording ||
      isTranscribing ||
      isParsingIntent ||
      lastProcessedAudioUriRef.current === audioUri
    ) {
      return;
    }

    lastProcessedAudioUriRef.current = audioUri;
    void processAudio(audioUri);
  }, [audioUri, isParsingIntent, isRecording, isTranscribing, processAudio]);

  const handleToggleRecording = (): void => {
    if (isTranscribing || isParsingIntent || isSavingEvent) {
      return;
    }

    if (!isRecording) {
      lastProcessedAudioUriRef.current = null;
      setTranscript("");
      setTranscriptionError(null);
      setIntentError(null);
      setCalendarMessage(null);
      setParsedEvent(null);
      setConfirmedEvent(null);
      void startRecording();
      return;
    }

    void stopRecording();
  };

  const handleCancelEvent = (): void => {
    setParsedEvent(null);
  };

  const handleConfirmEvent = (event: CalendarEvent): void => {
    void saveEventToCalendar(event);
  };

  const saveEventToCalendar = async (event: CalendarEvent): Promise<void> => {
    setIsSavingEvent(true);
    setCalendarMessage("正在写入系统日历...");

    try {
      const hasCalendarPermission = await requestCalendarPermission();
      if (!hasCalendarPermission) {
        setCalendarMessage("未获得日历权限，无法写入系统日历");
        setParsedEvent(null);
        return;
      }

      await getOrCreateVoiceCalendar();
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
      setParsedEvent(null);
      setIntentError(null);
      setTranscriptionError(null);
      setCalendarMessage(`✅ 已加入日历${reminderMessage}`);
    } catch {
      setCalendarMessage("写入日历失败，请检查权限后重试");
    } finally {
      setIsSavingEvent(false);
    }
  };

  const displayText =
    transcriptionError ??
    recordingError ??
    intentError ??
    calendarMessage ??
    (confirmedEvent ? `已加入日历：${confirmedEvent.title}` : null) ??
    transcript ??
    TRANSCRIPT_PLACEHOLDER;

  const hasDisplayError =
    Boolean(transcriptionError ?? recordingError ?? intentError) ||
    calendarMessage?.includes("失败") === true ||
    calendarMessage?.includes("未获得") === true;

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
          <Text className="mb-8 text-base text-slate-300">{STATUS_HINTS[status]}</Text>
          <View className="h-56 w-56 items-center justify-center">
            <WaveformAnimation active={status === "recording"} />
            <RecordButton status={status} onPress={handleToggleRecording} />
          </View>
          <Text className="mt-6 text-center text-lg font-semibold text-white">
            {formatDuration(durationMillis)}
          </Text>
          <Text className="mt-2 text-center text-xs text-slate-500">
            {metering === null ? "音量检测待命" : `当前音量 ${Math.round(metering)} dB`}
          </Text>
          <Text className="mt-8 text-center text-sm leading-6 text-slate-400">
            {status === "recording"
              ? "再次点击停止录音，静音 1.5 秒也会自动停止"
              : status === "processing"
                ? "正在把语音整理成日历事件"
              : "长按桌面图标选择语音记录，也会直达这个页面"}
          </Text>
        </View>

        <View className="min-h-[156px] rounded-[28px] border border-white/10 bg-white/5 p-5">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-semibold text-white">转写文字</Text>
            {isTranscribing || isParsingIntent || isSavingEvent ? (
              <ActivityIndicator color="#A78BFA" />
            ) : null}
          </View>
          <Text
            className={`mt-4 text-base leading-7 ${
              hasDisplayError
                ? "text-red-200"
                : "text-slate-200"
            }`}
          >
            {isTranscribing
              ? "识别中..."
              : isParsingIntent
                ? "正在解析事件信息..."
                : isSavingEvent
                  ? "正在写入系统日历..."
                : displayText}
          </Text>
        </View>
      </View>

      <EventConfirmCard
        event={parsedEvent}
        onCancel={handleCancelEvent}
        onConfirm={handleConfirmEvent}
        visible={parsedEvent !== null}
      />
    </SafeAreaView>
  );
}
