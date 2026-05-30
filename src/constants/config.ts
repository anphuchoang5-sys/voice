export const REQUEST_TIMEOUT_MS = 15_000;

export const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

export const DEEPSEEK_MODEL = "deepseek-chat";

export const DEEPSEEK_API_KEY =
  process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY ?? "";
