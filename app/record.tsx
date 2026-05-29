import { Link } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { RecordButton } from "../src/components/RecordButton";
import { WaveformAnimation } from "../src/components/WaveformAnimation";
import type { RecordingStatus } from "../src/types";

const TRANSCRIPT_PLACEHOLDER = "点击录音按钮，说出要加入日历的事情。";
const PHASE_ONE_TRANSCRIPT =
  "阶段二接入 Groq Whisper 后，这里会显示实时语音转写结果。";

const STATUS_HINTS: Record<RecordingStatus, string> = {
  idle: "准备就绪",
  recording: "正在记录你的语音",
  processing: "正在整理录音状态",
};

export default function RecordScreen(): React.JSX.Element {
  const [status, setStatus] = useState<RecordingStatus>("idle");
  const [transcript, setTranscript] = useState<string>("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect((): (() => void) => {
    return (): void => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleToggleRecording = (): void => {
    if (status === "processing") {
      return;
    }

    if (status === "idle") {
      setTranscript("");
      setStatus("recording");
      return;
    }

    setStatus("processing");
    timeoutRef.current = setTimeout((): void => {
      setTranscript(PHASE_ONE_TRANSCRIPT);
      setStatus("idle");
    }, 900);
  };

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
          <Text className="mt-8 text-center text-sm leading-6 text-slate-400">
            {status === "recording"
              ? "再次点击停止录音"
              : "长按桌面图标选择语音记录，也会直达这个页面"}
          </Text>
        </View>

        <View className="min-h-[156px] rounded-[28px] border border-white/10 bg-white/5 p-5">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-semibold text-white">转写文字</Text>
            {status === "processing" ? <ActivityIndicator color="#A78BFA" /> : null}
          </View>
          <Text className="mt-4 text-base leading-7 text-slate-200">
            {transcript || TRANSCRIPT_PLACEHOLDER}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
