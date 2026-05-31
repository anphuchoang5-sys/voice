# VoiceCalendar 进度记录

> 当前工作方式：每个阶段完成后停在检查点，等待确认再继续。

## 总览

| 阶段 | 状态 | 完成时间 | Git 提交 | 备注 |
|------|------|----------|----------|------|
| 阶段一：项目基础 + 录音 UI | 已完成 | 2026-05-29 | `a8a24cb 完成阶段一项目基础与录音界面` | 已停在检查点 |
| 阶段二：录音 + 语音转文字 | 代码完成，待实机/API 验证 | 2026-05-29 | 已提交：实现阶段二录音与语音转写 | Groq Key 仍为占位 |
| 阶段三：意图解析 | 已完成 | 2026-05-29 | 已提交：实现阶段三意图解析 | DeepSeek 临时实测通过，Key 未写入文件 |
| 阶段四：写入日历 + 提醒 | 代码完成，待实机验证 | 2026-05-29 | 本次提交：完成阶段四日历写入与提醒 | 日历/通知权限需 Android 真机确认 |
| 阶段五：App 内日历视图 | 代码完成，待实机验证 | 2026-05-30 | 本次提交：完成阶段五 App 内日历视图 | 左滑删除和系统同步需 Android 真机确认 |
| 阶段六：原生语音识别切换 | ✅ 已完成 | 2026-05-30 | 切换阶段六原生语音识别 | 从 Groq STT 切到 Android SpeechRecognizer（Google ASR） |
| 阶段七：打包 + 演示准备 | ✅ 已完成 | 2026-05-30 | EAS Build 配置完成 | APK 构建成功，DeepSeek Key 写入 EAS 生产环境 |
| 阶段八：切换讯飞 SparkChain ASR | 🚧 进行中 | 2026-05-31 | — | Google ASR 国行不可用，切换讯飞原生 SDK + Kotlin Native Module |

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
- `npx expo export --platform android`：通过。
- `npx expo install --check`：通过。
- `npx expo export --platform android`：通过。

### 已知风险

- `expo-quick-actions` 在 Expo Go 中可能只能降级为 no-op，长按图标快捷方式需要 Android 真机开发构建验证。
- 阶段二的 `expo-av` 录音权限、m4a 文件格式和静音检测需要实机验证。
- Groq Whisper 的 React Native `FormData` 上传细节需要重点测试。

## 下一步

等待用户确认后进入下一阶段。

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

## 阶段三记录

### 阶段三前置修复

- 已将 `src/constants/config.ts` 中 `REQUEST_TIMEOUT_MS` 从 `30_000` 改为 `15_000`。
- 已运行 `npx expo install expo-haptics expo-secure-store`。

### 已完成

- 新增 `CalendarEvent` 类型。
- 新增 DeepSeek 配置：`DEEPSEEK_API_URL`、`DEEPSEEK_MODEL`、`DEEPSEEK_API_KEY`。
- 新增 `src/constants/prompts.ts`，按当天日期和中文星期生成系统提示词。
- 新增 `src/services/intent.service.ts`，使用 `fetch` 调用 DeepSeek API，temperature 为 `0.1`，异常统一返回 `null`。
- 新增 `src/components/EventConfirmCard.tsx`，实现底部滑入确认卡，支持编辑标题、日期、时间、提醒和全天状态。
- 更新 `app/record.tsx`，STT 完成后自动调用 `parseIntent`，成功时弹出确认卡，失败时显示“未能识别事件信息，请重新描述”。

### 验证结果

- `npm run typecheck`：通过。
- `npx expo export --platform android`：通过。
- `npm ls --depth=0`：通过，已安装 `expo-haptics` 与 `expo-secure-store`。

### DeepSeek 实测结果

- 使用用户临时提供的 DeepSeek API Key 完成 5 条测试，Key 未写入 `.env` 或任何项目文件。
- 平均响应时间约 `855ms`。
- 5 条测试均满足阶段三要求：
  - “明天下午三点开产品会” -> `{"title":"产品会","date":"2026-05-30","time":"15:00","duration":60,"reminder_min":15,"allDay":false}`
  - “后天上午九点半牙医预约，提前一小时提醒我” -> `{"title":"牙医预约","date":"2026-05-31","time":"09:30","duration":60,"reminder_min":60,"allDay":false}`
  - “下周一下午两点跟客户视频会议” -> `{"title":"跟客户视频会议","date":"2026-06-01","time":"14:00","duration":60,"reminder_min":15,"allDay":false}`
  - “今晚记得买菜” -> `{"title":"买菜","date":"2026-05-29","time":"20:00","duration":60,"reminder_min":15,"allDay":false}`
  - “帮我提醒一下” -> `null`

### Prompt 调整

- 首轮实测中，第 5 条 DeepSeek 原始返回为字段全为 `null` 的对象。
- 已加强 prompt：信息不足时必须只返回字面量 `null`，不要返回包含 `null` 字段的对象。

## 阶段四记录

### 已完成

- 更新 `EventConfirmCard`：新增 summary / editing 双模式，summary 下显示只读字段与取消/编辑/确认按钮，editing 下支持编辑标题、日期、时间、提醒分钟和全天开关。
- 修复确认卡关闭动画：新增 `isMounted` 控制，`visible` 变 false 后先播放滑出动画，再卸载组件。
- 更新 `app.json`，加入 `expo-calendar` 与 `expo-notifications` 插件。
- 新增 `src/services/calendar.service.ts`，封装日历权限、创建“语音日历”、写入/删除系统事件、按月读取事件。
- 新增 `src/services/notification.service.ts`，封装通知权限、Android 通知频道、按事件提醒时间调度/取消通知。
- 新增 `src/stores/calendar.store.ts`，用 Zustand 维护 App 内事件列表。
- 更新 `app/record.tsx`，确认事件后请求权限、写入系统日历、调度提醒、触发震动反馈并同步到 store。

### 验证结果

- `npm run typecheck`：通过。

### 待实机验证

- 当前桌面环境无法弹出 Android 日历/通知权限，也无法打开系统日历截图确认。
- 通知触发逻辑已实现：若提醒时间已过，会改为 60 秒后触发，便于真机快速验证。

## 阶段五记录

### 阶段五前置修复

- 已移除 `app/record.tsx` 中多余的 `getOrCreateVoiceCalendar()` 外部调用。
- 已将写入失败提示改为“写入日历失败，请重试”。

### 已完成

- 更新 `app/index.tsx`，实现月历主页：月份切换、日期选中、今日白色边框、事件小圆点、选中日期事件列表和右下角录音 FAB。
- 新增 `src/components/CalendarGrid.tsx`，按周一到周日渲染月历网格。
- 新增 `src/components/EventListItem.tsx`，使用 `Swipeable` 支持左滑删除。
- 新增 `src/hooks/useCalendar.ts`，封装日历权限检查、按月加载事件、删除事件并同步系统日历/通知/Zustand。
- 新增 `app/event/[id].tsx`，实现事件详情、编辑和二次确认删除。
- 安装 `@expo/vector-icons`，用于 Ionicons 图标。

### 验证结果

- `npm run typecheck`：通过。
- `npx expo export --platform android`：通过。

### 待实机验证

- 当前桌面环境无法实际验证系统日历读取、左滑手势触感和 Android 通知取消结果。
- 事件编辑目前通过“删除旧系统事件 + 新建更新后事件”的方式保持系统日历同步。

## 阶段六记录

### 已完成

- 安装 `@react-native-voice/voice`，并执行 `npx expo prebuild --platform android --clean` 生成 Android 原生工程。
- 在 AndroidManifest 中确认 `RECORD_AUDIO` 权限，并补充 `android.speech.RecognitionService` query。
- 删除 Groq STT 服务和旧 `expo-av` 录音 hook。
- 新增 `src/hooks/useVoice.ts`，封装 Android 原生语音识别、实时 partial 文本、final 文本和错误处理。
- 更新 `app/record.tsx`，改为实时语音识别，finalText 自动调用 DeepSeek 意图解析，保留写入日历流程。
- 更新 `WaveformAnimation`，改为只依赖 `isActive` 播放循环脉冲。
- 清理 Groq 配置、`.env.example` 和本地 `.env` 中的 Groq Key 行。
- 修复 Q8：事件详情页不再展示系统 ID。
- 修复 Q9：左滑删除增加二次确认。

### 验证结果

- `npm run typecheck`：通过。
- 运行代码搜索确认已无 Groq STT 依赖。

### 待实机验证

- 需要构建 dev APK 验证 Google ASR 可用性、中文识别效果、静音自动结束和实时 partial 文本表现。

## 阶段七记录

EAS Build 曾成功产出 APK。下载链接不记录在仓库中，避免公开分发包和凭证风险。

实机验证结果：Google ASR 在国行 Redmi 完全不可用。
- 无 VPN：错误码 11（ERROR_SERVER_DISCONNECTED，GFW 拦截）
- 有 VPN：错误码 12（ERROR_LANGUAGE_NOT_SUPPORTED，设备缺 zh-CN 语言包）
→ 决定阶段八切换讯飞 SparkChain ASR

## 阶段八记录（进行中）

### 背景
Google ASR 两条路都死，转讯飞 SparkChain SDK（原生 Android AAR）。

### 计划
1. 复制 `SparkChain.aar` + `Codec.aar` 到 `android/app/libs/`
2. 修改 `android/app/build.gradle`：加 flatDir + implementation files
3. 新建 `XfASRModule.kt`（Native Module）+ `XfASRPackage.kt`
4. 修改 `MainApplication.kt`：注册 XfASRPackage
5. 重写 `src/hooks/useVoice.ts`：改用 NativeModules.XfASR
6. 卸载 `@react-native-voice/voice`
7. EAS Build 重新构建
## 2026-05-31 阶段八执行记录补充

- 已从 `@react-native-voice/voice` 切换到讯飞 SparkChain ASR。
- 已复制 `SparkChain.aar` 和 `Codec.aar` 到 `android/app/libs/`。
- 已新增 Android Native Module：`XfASRModule.kt`、`XfASRPackage.kt`，并在 `MainApplication.kt` 注册。
- 已重写 `src/hooks/useVoice.ts`，继续对外保持原 `useVoice` 接口。
- 已通过 `npx tsc --noEmit`。
- 已通过 `./gradlew.bat :app:compileDebugKotlin`。
- 已通过本地 `./gradlew.bat :app:assembleRelease`，APK 输出到 `android/app/build/outputs/apk/release/app-release.apk`。
- EAS Cloud 构建因会上传硬编码讯飞 demo 凭证到 Expo 外部服务，需用户明确确认风险后再执行。
