import { useEffect, useState } from "react";
import Voice, {
  type SpeechErrorEvent,
  type SpeechResultsEvent,
} from "@react-native-voice/voice";

export type VoiceState = "idle" | "listening" | "processing";

type UseVoiceResult = {
  voiceState: VoiceState;
  partialText: string;
  finalText: string | null;
  errorMessage: string | null;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  resetVoice: () => void;
};

const NO_SPEECH_ERROR_CODE = "7";

export function useVoice(): UseVoiceResult {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [partialText, setPartialText] = useState<string>("");
  const [finalText, setFinalText] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetVoice = (): void => {
    setVoiceState("idle");
    setPartialText("");
    setFinalText(null);
    setErrorMessage(null);
  };

  useEffect((): (() => void) => {
    Voice.onSpeechStart = (): void => {
      setVoiceState("listening");
      setErrorMessage(null);
    };

    Voice.onSpeechEnd = (): void => {
      setVoiceState("processing");
    };

    Voice.onSpeechPartialResults = (event: SpeechResultsEvent): void => {
      setPartialText(event.value?.[0] ?? "");
    };

    Voice.onSpeechResults = (event: SpeechResultsEvent): void => {
      const result = event.value?.[0]?.trim() ?? "";
      setFinalText(result.length > 0 ? result : null);
      setPartialText(result);
      setVoiceState("idle");
    };

    Voice.onSpeechError = (event: SpeechErrorEvent): void => {
      setVoiceState("idle");
      if (event.error?.code === NO_SPEECH_ERROR_CODE) {
        return;
      }

      const code = event.error?.code ?? "?";
      setErrorMessage(`语音识别失败（错误码 ${code}），请重试`);
    };

    return (): void => {
      void Voice.destroy().then(() => Voice.removeAllListeners());
    };
  }, []);

  const startListening = async (): Promise<void> => {
    resetVoice();

    try {
      const available = await Voice.isAvailable();
      if (!available) {
        setErrorMessage("当前设备不支持语音识别服务");
        return;
      }
      await Voice.start("zh-CN");
    } catch {
      setVoiceState("idle");
      setErrorMessage("语音识别启动失败，请重试");
    }
  };

  const stopListening = async (): Promise<void> => {
    try {
      await Voice.stop();
      setVoiceState("processing");
    } catch {
      setVoiceState("idle");
      setErrorMessage("语音识别失败，请重试");
    }
  };

  return {
    voiceState,
    partialText,
    finalText,
    errorMessage,
    startListening,
    stopListening,
    resetVoice,
  };
}
