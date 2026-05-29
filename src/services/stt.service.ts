import {
  GROQ_API_KEY,
  GROQ_TRANSCRIPTION_LANGUAGE,
  GROQ_TRANSCRIPTION_URL,
  GROQ_WHISPER_MODEL,
  REQUEST_TIMEOUT_MS,
} from "../constants/config";

type ReactNativeFile = {
  uri: string;
  name: string;
  type: string;
};

type GroqErrorPayload = {
  message?: string;
};

type GroqTranscriptionPayload = {
  text?: string;
  error?: GroqErrorPayload;
};

function isPlaceholderApiKey(apiKey: string): boolean {
  return apiKey.trim().length === 0 || apiKey.startsWith("your_");
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "识别失败，请重试";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseGroqPayload(payload: unknown): GroqTranscriptionPayload {
  if (!isObject(payload)) {
    return {};
  }

  const text = typeof payload.text === "string" ? payload.text : undefined;
  const errorValue = payload.error;
  const error =
    isObject(errorValue) && typeof errorValue.message === "string"
      ? { message: errorValue.message }
      : undefined;

  return { text, error };
}

/**
 * 使用 Groq Whisper 将本地录音文件转写为中文文本。
 *
 * @param audioUri Expo AV 返回的本地音频 URI，通常为 m4a 文件。
 * @returns Whisper 识别出的纯文本内容。
 * @throws 当 API Key 缺失、网络失败、Groq 返回错误或识别结果为空时抛出错误。
 */
export async function transcribeAudio(audioUri: string): Promise<string> {
  try {
    if (isPlaceholderApiKey(GROQ_API_KEY)) {
      throw new Error("缺少 GROQ_API_KEY，请先在 .env 中配置有效 Key");
    }

    const controller = new AbortController();
    const timeoutId = setTimeout((): void => {
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    const formData = new FormData();
    const audioFile: ReactNativeFile = {
      uri: audioUri,
      name: "audio.m4a",
      type: "audio/m4a",
    };

    formData.append("file", audioFile as unknown as Blob);
    formData.append("model", GROQ_WHISPER_MODEL);
    formData.append("language", GROQ_TRANSCRIPTION_LANGUAGE);

    const response = await fetch(GROQ_TRANSCRIPTION_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const payload = parseGroqPayload(await response.json());

    if (!response.ok) {
      throw new Error(payload.error?.message ?? "Groq 语音识别请求失败");
    }

    const text = payload.text?.trim();

    if (!text) {
      throw new Error("识别结果为空，请重试");
    }

    return text;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error));
  }
}
