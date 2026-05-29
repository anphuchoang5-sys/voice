export const GROQ_TRANSCRIPTION_URL =
  "https://api.groq.com/openai/v1/audio/transcriptions";

export const GROQ_WHISPER_MODEL = "whisper-large-v3";

export const GROQ_TRANSCRIPTION_LANGUAGE = "zh";

export const REQUEST_TIMEOUT_MS = 15_000;

export const SILENCE_DETECTION_MIN_DURATION_MS = 2_000;

export const SILENCE_DETECTION_WINDOW_MS = 1_500;

export const SILENCE_THRESHOLD_DB = -50;

export const RECORDING_STATUS_INTERVAL_MS = 200;

export const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY ?? "";

export const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

export const DEEPSEEK_MODEL = "deepseek-chat";

export const DEEPSEEK_API_KEY =
  process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY ?? "";
