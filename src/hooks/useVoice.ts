import { useCallback, useEffect, useRef, useState } from "react";
import {
  NativeEventEmitter,
  NativeModules,
  type EmitterSubscription,
} from "react-native";

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

type XfASRNativeModule = {
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  addListener: (eventName: string) => void;
  removeListeners: (count: number) => void;
};

type XfASRTextEvent = {
  text?: string;
};

type XfASRErrorEvent = {
  code?: number;
  message?: string;
};

const { XfASR } = NativeModules as {
  XfASR?: XfASRNativeModule;
};

const xfASREmitter = XfASR
  ? new NativeEventEmitter(XfASR as never)
  : null;

function getTrimmedText(event: XfASRTextEvent): string {
  return event.text?.trim() ?? "";
}

function getNativeErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.trim().length > 0
  ) {
    return error.message;
  }

  return fallback;
}

export function useVoice(): UseVoiceResult {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [partialText, setPartialText] = useState<string>("");
  const [finalText, setFinalText] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const accumulatedTextRef = useRef<string>("");

  const appendFinalSegment = useCallback((segment: string): string => {
    if (segment.length === 0) {
      return accumulatedTextRef.current;
    }

    const current = accumulatedTextRef.current;
    if (segment.startsWith(current)) {
      accumulatedTextRef.current = segment;
      return segment;
    }

    if (current.endsWith(segment)) {
      return current;
    }

    accumulatedTextRef.current = `${current}${segment}`;
    return accumulatedTextRef.current;
  }, []);

  const resetVoice = useCallback((): void => {
    accumulatedTextRef.current = "";
    setVoiceState("idle");
    setPartialText("");
    setFinalText(null);
    setErrorMessage(null);
  }, []);

  useEffect((): (() => void) => {
    if (!xfASREmitter) {
      return (): void => undefined;
    }

    const subscriptions: EmitterSubscription[] = [
      xfASREmitter.addListener(
        "onXfASRPartialResult",
        (event: XfASRTextEvent): void => {
          const segment = getTrimmedText(event);
          const combinedText = `${accumulatedTextRef.current}${segment}`;
          setPartialText(combinedText);
        },
      ),
      xfASREmitter.addListener(
        "onXfASRFinalResult",
        (event: XfASRTextEvent): void => {
          const combinedText = appendFinalSegment(getTrimmedText(event));
          setPartialText(combinedText);
          setFinalText(combinedText.length > 0 ? combinedText : null);
          setVoiceState("idle");
        },
      ),
      xfASREmitter.addListener(
        "onXfASRError",
        (event: XfASRErrorEvent): void => {
          const code = event.code ?? -1;
          const message = event.message?.trim() ?? "语音识别失败，请重试";
          setErrorMessage(
            code >= 0 ? `${message}（错误码 ${code}）` : message,
          );
          setVoiceState("idle");
        },
      ),
    ];

    return (): void => {
      void XfASR?.stopListening().catch(() => undefined);
      subscriptions.forEach((subscription) => subscription.remove());
    };
  }, [appendFinalSegment]);

  const startListening = useCallback(async (): Promise<void> => {
    resetVoice();

    if (!XfASR) {
      setErrorMessage("当前安装包不支持讯飞语音识别，请重新构建 APK");
      return;
    }

    try {
      await XfASR.startListening();
      setVoiceState("listening");
    } catch (error) {
      setVoiceState("idle");
      setErrorMessage(
        getNativeErrorMessage(error, "讯飞语音识别启动失败，请重试"),
      );
    }
  }, [resetVoice]);

  const stopListening = useCallback(async (): Promise<void> => {
    if (!XfASR) {
      setErrorMessage("当前安装包不支持讯飞语音识别，请重新构建 APK");
      return;
    }

    setVoiceState("processing");
    try {
      await XfASR.stopListening();
    } catch (error) {
      setVoiceState("idle");
      setErrorMessage(
        getNativeErrorMessage(error, "讯飞语音识别失败，请重试"),
      );
    }
  }, []);

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
