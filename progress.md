# VoiceCalendar 进度记录

> 当前工作方式：每个阶段完成后停在检查点，等待确认再继续。

## 总览

| 阶段 | 状态 | 完成时间 | Git 提交 | 备注 |
|------|------|----------|----------|------|
| 阶段一：项目基础 + 录音 UI | 已完成 | 2026-05-29 | `a8a24cb 完成阶段一项目基础与录音界面` | 已停在检查点 |
| 阶段二：录音 + 语音转文字 | 代码完成，待实机/API 验证 | 2026-05-29 | 已提交：实现阶段二录音与语音转写 | Groq Key 仍为占位 |
| 阶段三：意图解析 | 未开始 | - | - | - |
| 阶段四：写入日历 + 提醒 | 未开始 | - | - | - |
| 阶段五：App 内日历视图 | 未开始 | - | - | - |
| 阶段六：完善 + 边缘情况 | 未开始 | - | - | - |
| 阶段七：打包 + 演示准备 | 未开始 | - | - | - |

## 阶段一记录

### 已完成

- 使用 `npx create-expo-app . --template expo-template-blank-typescript` 在当前目录初始化项目。
- 将项目依赖固定到 Expo SDK 51 兼容版本。
- 安装并配置 `expo-router`、NativeWind v4、`expo-quick-actions`、`react-native-reanimated`。
- 创建 `.env` 和 `.env.example`，包含 Groq 与 DeepSeek API Key 占位。
- 实现 `app/index.tsx` 日历占位页。
- 实现 `app/record.tsx` 录音页 UI。
- 实现 `RecordButton` 和 `WaveformAnimation` 组件。
- 配置 quick action：长按图标出现“语音记录”，目标路径为 `/record`。
- 更新 `CLAUDE.md` 和 `AGENTS.md` 的阶段一报告。

### 验证结果

- `npm run typecheck`：通过。
- `npx expo install --check`：通过。
- `npx expo export --platform android`：通过。

### 已知风险

- `expo-quick-actions` 在 Expo Go 中可能只能降级为 no-op，长按图标快捷方式需要 Android 真机开发构建验证。
- 阶段二的 `expo-av` 录音权限、m4a 文件格式和静音检测需要实机验证。
- Groq Whisper 的 React Native `FormData` 上传细节需要重点测试。

## 下一步

等待用户确认后进入阶段二：录音 + Groq Whisper 语音转文字。

## 阶段二记录

### 阶段二前置调整

- 已执行 `npm uninstall deepseek`，DeepSeek 后续将直接使用 `fetch` 调用 API。
- 已将 `app.json` 中 `android.adaptiveIcon.backgroundColor` 从 `#E6F4FE` 改为 `#6C3CE1`。

### 已完成

- 新增 `src/hooks/useRecording.ts`，封装 `expo-av` 录音启动、停止、麦克风权限、音量计量和静音自动停止。
- 新增 `src/services/stt.service.ts`，通过 `fetch` 调用 Groq Whisper API，模型为 `whisper-large-v3`，语言为 `zh`。
- 新增 `src/constants/config.ts`，集中管理 Groq endpoint、模型名、超时、静音检测阈值等配置。
- 更新 `app/record.tsx`，停止录音后自动调用 STT，并展示“识别中...”和错误提示。
- 更新 `app.json`，加入 `expo-av` 麦克风权限配置。

### 验证结果

- `npm run typecheck`：通过。
- `npx expo export --platform android`：通过。
- `npm ls --depth=0`：通过，依赖树中已无 `deepseek`。

### 当前阻塞

- `.env` 中 `EXPO_PUBLIC_GROQ_API_KEY` 仍为占位值，无法进行真实 Groq API 转写测试。
- 当前环境没有连接 Android 真机或模拟器，静音检测和麦克风权限弹窗尚未实测。
