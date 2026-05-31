# VoiceCalendar — Codex 执行项目书

> 72小时黑客松项目 · Android 语音日历工具
> 作者交由 Codex 执行，请按阶段顺序完成，每阶段结束后**停止并输出总结**。

---

## 项目目标

构建一个 Android 原生体验的语音日历 App，核心价值：**说一句话，事件自动进日历**。

用户路径：
```
长按图标 → 点"语音"快捷方式
→ App 直接打开进入录音界面
→ 说话（讯飞 VAD 静音 2 秒自动停止，或手动点停止）
→ 讯飞 SparkChain ASR 实时转文字（边说边显示，无需上传文件）
→ DeepSeek 解析意图（时间/事件/提醒）
→ 确认卡弹出（摘要展示 + 三个按钮：取消 / 编辑 / 确认）
→ 点"编辑"进入编辑模式可修改字段
→ 点"确认"写入：① 手机系统日历 ② App 内日历
→ 震动反馈完成
```

---

## 技术栈（已锁定，不可更改）

| 层级 | 技术 | 说明 |
|------|------|------|
| 框架 | **Expo SDK 51 · Bare Workflow**（阶段六后） | TypeScript 模板，prebuild 后转 Bare |
| 导航 | **expo-router v3** | 文件路由系统 |
| 语音识别 | **XfASRModule**（Kotlin Native Module） | 封装讯飞 SparkChain ASR，AudioRecord 采集 PCM |
| STT 引擎 | **讯飞 SparkChain ASR**（SparkChain.aar） | 国内直连，中文准确率高，内置 VAD，实时流式 |
| 意图解析 | **DeepSeek API** (`deepseek-chat`) | 中文理解最强之一 |
| 系统日历 | **expo-calendar** | 读写手机原生日历 |
| 本地通知 | **expo-notifications** | 事件提醒 |
| App 快捷方式 | **expo-quick-actions** | 长按图标菜单 |
| 状态管理 | **Zustand** | 轻量，无模板代码 |
| 样式 | **NativeWind v4** (Tailwind for RN) | 熟悉的 class 写法 |
| 环境变量 | **expo-constants + .env** | API Keys 管理 |

---

## 项目结构（目标文件树）

```
VoiceCalendar/
├── app/                          # expo-router 路由
│   ├── _layout.tsx               # 根布局 + 权限初始化
│   ├── index.tsx                 # 主页（日历视图）
│   ├── record.tsx                # 录音页（快捷方式直跳此页）
│   └── event/[id].tsx            # 事件详情/编辑页
├── src/
│   ├── components/
│   │   ├── RecordButton.tsx      # 大录音按钮组件
│   │   ├── WaveformAnimation.tsx # 录音波形动画
│   │   ├── EventConfirmCard.tsx  # 录音完成后的确认卡
│   │   ├── CalendarGrid.tsx      # 月历网格组件
│   │   └── EventListItem.tsx     # 事件列表项
│   ├── services/
│   │   ├── intent.service.ts     # DeepSeek 意图解析
│   │   ├── calendar.service.ts   # expo-calendar 读写封装
│   │   └── notification.service.ts # 提醒设置封装
│   ├── stores/
│   │   └── calendar.store.ts     # Zustand 全局状态
│   ├── types/
│   │   └── index.ts              # 全局 TypeScript 类型
│   ├── hooks/
│   │   ├── useVoice.ts           # 语音识别 Hook（@react-native-voice/voice）
│   │   └── useCalendar.ts        # 日历操作 Hook
│   └── constants/
│       ├── config.ts             # API 端点、模型名等常量
│       └── prompts.ts            # DeepSeek 系统提示词
├── assets/
│   ├── icon.png
│   └── splash.png
├── .env                          # API Keys（不提交 git）
├── .env.example                  # Keys 模板（提交 git）
├── app.json                      # Expo 配置
├── tailwind.config.js
├── PROJECT_BRIEF.md              # 本文件
└── CLAUDE.md                     # 开发日志（Claude 维护）
```

---

## 编码规范（所有阶段强制执行）

1. **语言**：TypeScript 严格模式，禁止 `any`，所有函数需标注返回类型
2. **组件**：全部使用函数组件 + React Hooks，禁止 class 组件
3. **样式**：优先 NativeWind className，复杂动画才用 StyleSheet
4. **错误处理**：所有 API 调用必须有 try/catch，有 loading / error 状态
5. **注释**：每个 service 函数写 JSDoc，解释参数和返回值
6. **命名**：
   - 组件文件：PascalCase（`RecordButton.tsx`）
   - 工具/hooks：camelCase（`useRecording.ts`）
   - 常量：UPPER_SNAKE_CASE
7. **提交**：每个阶段完成后 `git commit`，message 用中文描述

---

## UI 设计规范

- **主色调**：深紫 `#6C3CE1` · 浅紫 `#A78BFA`
- **背景**：深色优先 `#0F0F1A`（深夜记事场景）
- **录音按钮**：屏幕中央大圆按钮，按下时波形动画扩散
- **确认卡**：底部弹出 Sheet，圆角，毛玻璃效果
- **字体**：系统默认 + 中文适配
- **动画**：所有状态切换需要过渡动画（`react-native-reanimated`）

---

## 阶段划分

---

### 阶段一：项目基础 + 录音 UI
**预计时间：0–8h**

**任务清单：**
1. `npx create-expo-app VoiceCalendar --template expo-template-blank-typescript`
2. 安装所有依赖（见下方命令）
3. 配置 NativeWind、expo-router、expo-quick-actions
4. 创建 `.env` 和 `.env.example`（含 `GROQ_API_KEY` 和 `DEEPSEEK_API_KEY` 占位）
5. 实现 `app/record.tsx`：
   - 全屏深色背景
   - 居中大圆录音按钮（点击开始/停止录音）
   - 按钮状态：idle / recording / processing
   - recording 状态显示波形动画（可用简单脉冲动画代替）
   - 底部显示实时转写文字区域（空状态显示提示文字）
6. 配置 `expo-quick-actions`，长按图标出现"语音记录"快捷方式，点击直跳 `/record`
7. 配置 `app/index.tsx`：简单的日历占位页（"日历视图，即将实现"）

**安装命令：**
```bash
cd VoiceCalendar
npx expo install expo-av expo-calendar expo-notifications expo-quick-actions expo-constants
npm install zustand nativewind tailwindcss react-native-reanimated
npm install deepseek  # 或直接用 fetch
npx expo install expo-router
```

**阶段一完成标准：**
- [ ] 在 Expo Go 扫码可以看到录音界面
- [ ] 录音按钮点击有视觉反馈
- [ ] 长按 App 图标出现"语音记录"快捷方式（需真机或 Android 模拟器）

**⛔ 阶段一检查点：停止，输出以下内容：**
```
=== 阶段一完成报告 ===
1. 已创建的文件列表
2. 依赖安装结果（哪些成功/失败）
3. 当前可运行的功能截图描述
4. 遇到的问题和解决方式
5. 下一阶段预计风险点
```

---

### 阶段二：录音 + 语音转文字
**预计时间：8–18h**

**任务清单：**
1. 实现 `src/hooks/useRecording.ts`：
   - 封装 `expo-av` 录音启动/停止
   - 请求麦克风权限（首次使用弹窗）
   - 静音检测：录音超过 2 秒且连续 1.5 秒无声音自动停止
   - 返回：`{ isRecording, startRecording, stopRecording, audioUri }`
2. 实现 `src/services/stt.service.ts`：
   ```typescript
   // 函数签名
   async function transcribeAudio(audioUri: string): Promise<string>
   // 使用 Groq API，模型 whisper-large-v3，语言 zh
   // 将 audioUri 的文件读取为 FormData 发送
   ```
3. 在 `record.tsx` 中连接：录音停止 → 自动调用 STT → 文字显示在界面上
4. 添加 loading 状态（转圈或"识别中..."文字）
5. 错误处理：网络失败显示"识别失败，请重试"

**阶段二完成标准：**
- [ ] 点击录音 → 说一句中文 → 停止 → 显示识别出的文字
- [ ] 网络错误有提示

**⛔ 阶段二检查点：停止，输出以下内容：**
```
=== 阶段二完成报告 ===
1. useRecording hook 最终实现要点
2. STT 服务调用成功的测试文字（至少3条）
3. 静音检测是否正常工作
4. Groq API 响应时间大约多少毫秒
5. 遇到的问题和解决方式
```

---

### 阶段三：意图解析
**预计时间：18–26h**

**任务清单：**
1. 在 `src/constants/prompts.ts` 中定义系统提示词：
   ```
   你是一个日历助手，从用户语音文字中提取事件信息。
   今天是 {TODAY}（{WEEKDAY}）。
   
   返回 JSON 格式（无法识别则返回 null）：
   {
     "title": "事件标题",
     "date": "YYYY-MM-DD",
     "time": "HH:MM",        // 没提到时间则 null
     "duration": 60,          // 分钟，默认60
     "reminder_min": 15,      // 提前提醒分钟，默认15
     "allDay": false
   }
   
   只返回 JSON，不要其他文字。
   ```
2. 实现 `src/services/intent.service.ts`：
   ```typescript
   async function parseIntent(text: string): Promise<CalendarEvent | null>
   // 调用 DeepSeek API (deepseek-chat 模型)
   // 注入今日日期到 prompt
   // 解析返回的 JSON
   ```
3. 定义 `src/types/index.ts` 中的 `CalendarEvent` 类型
4. 在 `record.tsx` 中：STT 文字出来后 → 自动调用 intent → 显示解析结果
5. 实现 `src/components/EventConfirmCard.tsx`，组件内部有两个 mode：
   **summary mode（默认）**：
   - 底部弹出 Sheet，只读展示：标题、日期、时间、提醒分钟
   - 三个按钮：❌ 取消 / ✏️ 编辑 / ✅ 确认
   **edit mode（点编辑进入）**：
   - 展示可编辑 TextInput：标题、日期、时间、提醒分钟、全天开关
   - 两个按钮：← 返回（回到 summary 并保留修改） / 💾 保存（同上）
   - mode 切换无需关闭卡片，内容区域平滑过渡

**测试用例（需全部通过）：**
```
"明天下午三点开产品会" → 明天 15:00 产品会
"后天上午九点半牙医预约，提前一小时提醒" → 后天 09:30，reminder=60
"下周一下午两点跟客户视频会议" → 下周一 14:00
"今晚记得买菜" → 今天 allDay 或合理时间
"帮我提醒一下" → null（信息不足）
```

**阶段三完成标准：**
- [ ] 上述测试用例至少通过 4/5
- [ ] 确认卡正常弹出，字段可编辑

**⛔ 阶段三检查点：停止，输出以下内容：**
```
=== 阶段三完成报告 ===
1. 5条测试用例各自的解析结果（原文 → JSON）
2. DeepSeek API 平均响应时间
3. prompt 是否需要调整（说明原因）
4. EventConfirmCard UI 描述
5. 遇到的问题和解决方式
```

---

### 阶段四：写入日历 + 提醒
**预计时间：26–36h**

**任务清单：**
1. 实现 `src/services/calendar.service.ts`：
   ```typescript
   // 请求日历权限
   async function requestCalendarPermission(): Promise<boolean>
   
   // 获取或创建 App 专属日历（名称："语音日历"）
   async function getOrCreateCalendar(): Promise<string> // 返回 calendarId
   
   // 写入事件到系统日历
   async function createEvent(event: CalendarEvent): Promise<string> // 返回 eventId
   
   // 删除事件
   async function deleteEvent(eventId: string): Promise<void>
   
   // 获取某月事件
   async function getEventsForMonth(year: number, month: number): Promise<CalendarEvent[]>
   ```
2. 实现 `src/services/notification.service.ts`：
   ```typescript
   // 请求通知权限
   async function requestNotificationPermission(): Promise<boolean>
   
   // 为事件设置提醒
   async function scheduleReminder(event: CalendarEvent, eventId: string): Promise<void>
   
   // 取消事件提醒
   async function cancelReminder(eventId: string): Promise<void>
   ```
3. 重构 `EventConfirmCard`（在已有代码基础上修改，不要重写）：
   - 新增 `mode` 状态：`"summary" | "editing"`，默认 `"summary"`
   - summary mode：只读展示事件字段，底部三按钮（取消 / 编辑 / 确认）
   - editing mode：可编辑 TextInput 表单，底部两按钮（返回 / 保存）
   - 点"编辑"：切换到 editing mode
   - 点"返回"或"保存"：将修改后的字段同步回 summary，切换回 summary mode
   - 点"确认"（在 summary mode）：触发写入流程
   - 修复 Q3：取消/确认时先播滑出动画再 unmount（用 isMounted 状态控制）
4. 在 `EventConfirmCard` 点击"确认"后：
   - 调用 `createEvent` 写入系统日历
   - 调用 `scheduleReminder` 设置通知
   - 震动反馈（`expo-haptics`，ImpactFeedbackStyle.Medium）
   - 显示成功状态后关闭卡片
5. 在 Zustand store 中同步保存事件列表（用于 App 内展示）

**阶段四完成标准：**
- [ ] 完整流程：录音 → 文字 → 解析 → 确认 → 手机系统日历能看到事件
- [ ] 到时间有通知弹出（测试时可设置1分钟后提醒）

**⛔ 阶段四检查点：停止，输出以下内容：**
```
=== 阶段四完成报告 ===
1. 核心流程是否全部打通（是/否 + 说明）
2. 系统日历写入截图描述
3. 通知测试结果
4. Zustand store 结构展示
5. 当前最大的体验问题
```

---

### 阶段五：App 内日历视图
**预计时间：36–48h**

**任务清单：**
1. 实现 `app/index.tsx` 主页：
   - 顶部：月份导航（上一月 / 本月 / 下一月）
   - 中部：月历网格（`CalendarGrid.tsx`），有事件的日期显示小点
   - 底部：选中日期的事件列表
   - 右下角悬浮录音按钮（FAB），点击跳转 `/record`
2. 实现 `app/event/[id].tsx` 事件详情页：
   - 显示事件完整信息
   - 编辑按钮（修改标题/时间）
   - 删除按钮（同时删除系统日历和 App 内记录）
3. 事件列表支持左滑删除

**阶段五完成标准：**
- [ ] 月历正常显示，有事件的日期有标记
- [ ] 点击日期显示当天事件
- [ ] 可以删除事件

**⛔ 阶段五检查点：停止，输出以下内容：**
```
=== 阶段五完成报告 ===
1. 日历界面描述（布局/颜色/交互）
2. 事件增删是否与系统日历同步
3. 整体 App 使用流程走通描述
4. 现存 Bug 列表
5. 剩余时间评估与优先级建议
```

---

### 阶段六：切换原生 STT + 高优先级修复
**预计时间：48–56h**

> 原因：Groq 注册在中国大陆受限，改用 Android 原生语音识别（Google ASR），零 API Key 依赖，中文效果同级别。

**步骤一：安装依赖 + Prebuild**
```bash
npm install @react-native-voice/voice
npx expo prebuild --platform android --clean
```
说明：prebuild 会生成 `android/` 目录，项目转为 Bare Workflow。之后不能用 Expo Go，需构建 dev APK 测试。

**步骤二：删除 Groq 相关文件**
- 删除 `src/services/stt.service.ts`（整个 Groq 调用，不再需要）

**步骤三：将 `src/hooks/useRecording.ts` 重写并改名为 `src/hooks/useVoice.ts`**

新 Hook 接口：
```typescript
type VoiceState = 'idle' | 'listening' | 'processing';

type UseVoiceReturn = {
  voiceState: VoiceState;
  partialText: string;    // 实时中间识别结果
  finalText: string | null; // 最终确认文字
  errorMessage: string | null;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  resetVoice: () => void;
};
```

实现要点：
- `Voice.onSpeechStart` → `voiceState = 'listening'`
- `Voice.onSpeechPartialResults` → 更新 `partialText`（实时显示）
- `Voice.onSpeechEnd` → `voiceState = 'processing'`
- `Voice.onSpeechResults` → 设置 `finalText`，`voiceState = 'idle'`
- `Voice.onSpeechError` → 错误码 `'7'`（无语音）静默忽略，其余设 `errorMessage`
- `Voice.start('zh-CN')` 启动，Android 系统自带静音检测，无需手动实现
- `useEffect` 清理时调用 `Voice.destroy()`

**步骤四：更新 `app/record.tsx`**

新状态流程：
```
按录音 → startListening() → 实时显示 partialText
→ 用户停止说话（系统自动检测）→ finalText 出现
→ useEffect 监听 finalText → 调用 parseIntent()
→ 成功 → 弹出 EventConfirmCard
→ 失败 → 显示"未能识别事件，请重新描述"
```

按钮逻辑：
- `voiceState === 'idle'` → 按下调用 `startListening()`
- `voiceState === 'listening'` → 按下调用 `stopListening()`（提前手动停止）
- `voiceState === 'processing'` → 禁用按钮，显示"识别中..."

**步骤五：更新 `src/components/WaveformAnimation.tsx`**

去掉 metering prop，改为接受 `isActive: boolean`。活跃时用 `withRepeat(withTiming(...), -1, true)` 循环脉冲动画，非活跃时静止。

**步骤六：清理 `src/constants/config.ts`**

删除以下常量（Groq / 静音检测相关，均不再需要）：
- `GROQ_TRANSCRIPTION_URL`、`GROQ_WHISPER_MODEL`、`GROQ_TRANSCRIPTION_LANGUAGE`
- `GROQ_API_KEY`（env 读取）
- `SILENCE_THRESHOLD_DB`、`SILENCE_DETECTION_MIN_DURATION_MS`、`SILENCE_DETECTION_WINDOW_MS`、`RECORDING_STATUS_INTERVAL_MS`

保留：`REQUEST_TIMEOUT_MS`、`DEEPSEEK_API_URL`、`DEEPSEEK_MODEL`、`DEEPSEEK_API_KEY`

**步骤七：修复高优先级 Bug**

Q8 — `app/event/[id].tsx`：删除第 154 行 `<DetailRow label="系统 ID" value={event.id} />`

Q9 — `src/components/EventListItem.tsx`：左滑删除触发前加 `Alert.alert` 二次确认，与详情页行为保持一致

**步骤八：更新 `.env.example`**

删除 `EXPO_PUBLIC_GROQ_API_KEY` 行，只保留 `EXPO_PUBLIC_DEEPSEEK_API_KEY`

**步骤九：验证**
```bash
npm run typecheck
```

**阶段六完成标准：**
- [ ] `npm run typecheck` 通过
- [ ] 无任何文件 import 已删除的 `stt.service.ts` 或旧的 `useRecording`
- [ ] `src/hooks/useVoice.ts` 存在并导出 `useVoice`
- [ ] Q8 修复：事件详情不显示系统 ID
- [ ] Q9 修复：左滑删除有确认弹窗
- [ ] `.env.example` 只剩 DeepSeek Key

**⛔ 阶段六检查点：停止，输出以下内容：**
```
=== 阶段六完成报告 ===
1. 删除/新增/修改的文件完整列表
2. useVoice hook 核心逻辑要点
3. record.tsx 新状态流程描述
4. Q8 和 Q9 修复确认
5. typecheck 结果
6. 构建 dev APK 的命令（供用户下一步执行）
```

---

### 阶段七：打包 + 演示准备
**预计时间：60–72h**

**任务清单：**
1. 更新 `app.json`：设置 App 名称、图标、启动屏
2. 配置 EAS Build：
   ```bash
   npm install -g eas-cli
   eas build:configure
   eas build --platform android --profile preview
   ```
3. 生成演示用 APK
4. 写 `README.md`（安装说明、功能截图、使用方式）
5. 录制 30 秒演示视频脚本：
   ```
   00-05s: 展示手机桌面，长按 App 图标
   05-10s: 点击"语音记录"快捷方式，App 打开录音界面
   10-20s: 说"明天下午三点跟客户开会，提前半小时提醒我"
   20-25s: 展示识别结果和确认卡
   25-30s: 确认，打开系统日历展示事件已写入
   ```

**⛔ 阶段七最终报告：**
```
=== 项目最终报告 ===
1. APK 构建结果
2. 各阶段完成度汇总（阶段一 ✅ / 阶段二 ✅ / ...）
3. 未完成功能列表（如有）
4. 代码总行数估计
5. 遇到的最大技术挑战
6. 如果再有24小时会做什么
```

---

## 环境变量模板 (.env.example)

```
EXPO_PUBLIC_DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

---

## 快速参考：关键 API 调用

### 讯飞 SparkChain ASR（XfASR Native Module）
```typescript
import { NativeModules, NativeEventEmitter } from 'react-native';
const { XfASR } = NativeModules;
const emitter = new NativeEventEmitter(XfASR);

// 注册回调
emitter.addListener('onXfASRPartialResult', (e) => {
  // e.text: 本段识别文字（需累积拼接）
});
emitter.addListener('onXfASRFinalResult', (e) => {
  // e.text: 最后一段，status=2 后 SDK 自动停止
});
emitter.addListener('onXfASRError', (e) => {
  // e.code, e.message
});

// 启动（内部：AudioRecord 开始录音 + SparkChain ASR 开始会话）
await XfASR.startListening();

// 手动停止（讯飞 VAD 2 秒静默也会自动停止）
await XfASR.stopListening();
```

SparkChain SDK 核心 Java API（XfASRModule.kt 内部使用）：
```java
SparkChainConfig config = SparkChainConfig.builder()
    .appID("42350800").apiKey("...").apiSecret("...").workDir(filesDir);
SparkChain.getInst().init(context, config);

ASR asr = new ASR();
asr.language("zh_cn"); asr.domain("iat"); asr.accent("mandarin"); asr.vadEos(2000);
asr.registerCallbacks(callbacks);
asr.start("tag");
asr.write(pcmBytes); // 每 40ms 送 1280 字节
asr.stop(false);     // false = 等待最终结果
```

### DeepSeek 意图解析
```typescript
const response = await fetch('https://api.deepseek.com/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
  },
  body: JSON.stringify({
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: transcribedText },
    ],
    temperature: 0.1,
  }),
});
```

---

*本文档由 Claude 生成，供 Codex 执行使用。每阶段必须在检查点停止并输出报告。*
