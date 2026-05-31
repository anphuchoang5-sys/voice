# AGENTS.md — VoiceCalendar 开发日志

> 此文件由 Codex 维护，记录项目背景、架构决策、开发日志和已知问题。
> 每次重要变更后更新对应章节。

---

## 项目背景

**比赛**：72小时 Vibe 编程黑客松（题目一：语音版日历工具）  
**开始时间**：2026-05-29  
**核心价值**：说一句话，事件自动进日历——极致便携性  
**目标平台**：Android（优先），Expo Managed Workflow

---

## 关键设计决策

### 为什么选 Expo Managed（不是 bare / 不是原生 Kotlin）
- 开发者背景为纯 Web，Expo Managed 使用 JavaScript，学习成本最低
- Managed workflow 提供所有需要的插件（expo-calendar、expo-notifications、expo-quick-actions）
- Expo Go 可以在手机上秒级预览，不需要 Android Studio 或编译 APK
- 72小时内完成可交付产品的最优路径

### 为什么阶段八切换到讯飞 SparkChain ASR（放弃 Google ASR）
- 实机验证（国行 Redmi）：Google ASR 无 VPN 报错码 11（服务器断开），有 VPN 报错码 12（语言包缺失），两条路都死
- 讯飞 SparkChain SDK 是 Android 原生 .aar 库，内部处理 WebSocket 连接和 HMAC 鉴权
- 国内网络直连，中文普通话识别质量高，无需 VPN
- 凭证三件套：appID / apiKey / apiSecret，与讯飞开放平台账号绑定
- 通过 Kotlin Native Module（XfASRModule）桥接给 JS 层，JS 侧接口与原 useVoice 完全一致

### 为什么用 DeepSeek（不是 Codex / GPT-4）
- 日历意图解析是简单 NLP 任务，prompt 极短（< 100 token）
- DeepSeek 中文理解能力强，成本约 ¥1/百万 token
- 对于最终用户，不能假设他们会付 Codex 费用
- 缺点：需要用户自备 API Key

### 为什么 App Shortcuts（长按图标弹出"语音记录"）
- 用户研究：语音日历的核心价值是"0 打开成本"
- 从桌面到录音界面的步骤：长按 → 点一下 → 开始说（共 2 步）
- expo-quick-actions 支持 Managed workflow，无需 eject

### 为什么双写（系统日历 + App 内日历）
- 用户手机本来有日历 App，不应强迫他们换 App
- 写入系统日历 = 事件跨 App 可见、提醒系统级可靠
- App 内日历 = 查看和管理语音创建的事件，快速访问

---

## 技术栈速查

```
框架:     Expo SDK 51 (Bare Workflow) + TypeScript
路由:     expo-router v3
录音采集: Android AudioRecord（在 XfASRModule.kt 内，PCM 16kHz 16bit 单声道）
STT:      讯飞 SparkChain SDK（android/app/libs/SparkChain.aar + Codec.aar）
STT桥接:  XfASRModule.kt + XfASRPackage.kt（Kotlin Native Module）
意图解析: DeepSeek API (deepseek-chat) — https://platform.deepseek.com
系统日历: expo-calendar
通知提醒: expo-notifications
快捷方式: expo-quick-actions
状态:     Zustand
样式:     NativeWind v4 (Tailwind for RN)
安全存储: expo-secure-store (API Keys)
触感反馈: expo-haptics
```

---

## 环境配置

### 必需的 API Keys / 凭证
| Key | 获取地址 | 说明 |
|-----|---------|------|
| `EXPO_PUBLIC_DEEPSEEK_API_KEY` | https://platform.deepseek.com | 意图解析，注册送余额 |
| 讯飞 appID / apiKey / apiSecret | https://console.xfyun.cn | STT，硬编码在 XfASRModule.kt（hackathon 用） |

### .env 文件位置
```
VoiceCalendar/.env          ← 本地，不提交 git
VoiceCalendar/.env.example  ← 模板，提交 git
```

### 常用命令
```bash
# 启动开发服务器
npx expo start

# 在 Android 设备上运行（需连接设备）
npx expo start --android

# 构建 Android APK（预览版）
eas build --platform android --profile preview

# 安装新依赖（Expo 管理的库用 expo install）
npx expo install <package-name>
npm install <package-name>  # 非 Expo 库
```

---

## 文件结构说明

```
app/
  _layout.tsx        ← 根布局：初始化权限、快捷方式、通知
  index.tsx          ← 主页：月历视图 + 事件列表
  record.tsx         ← 录音页：快捷方式直跳此页
  event/[id].tsx     ← 事件详情/编辑

src/services/
  intent.service.ts  ← 唯一与 DeepSeek 通信的地方
  calendar.service.ts← 所有 expo-calendar 操作封装
  notification.service.ts ← 所有通知逻辑

src/hooks/
  useVoice.ts        ← 语音识别 Hook，基于 XfASR Native Module
  useCalendar.ts     ← 日历操作 Hook

src/constants/
  prompts.ts         ← DeepSeek 系统提示词（集中管理，方便调优）
  config.ts          ← API 端点、模型名、超时等常量

android/app/
  libs/
    SparkChain.aar   ← 讯飞 SparkChain SDK 主库
    Codec.aar        ← 讯飞编解码库
  src/main/java/com/seven/voicecalendar/
    XfASRModule.kt   ← Native Module：录音 + ASR 桥接
    XfASRPackage.kt  ← 注册 XfASRModule 到 React Native
    MainApplication.kt ← 注册 XfASRPackage
```

---

## Prompt 设计（意图解析）

**当前版本：v1**

```
你是一个日历助手，从用户语音文字中提取事件信息。
今天是 {TODAY}（{WEEKDAY}）。

返回 JSON 格式（无法识别则返回 null）：
{
  "title": "事件标题",
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "duration": 60,
  "reminder_min": 15,
  "allDay": false
}

只返回 JSON，不要其他文字。
```

**已知需要处理的中文时间表达：**
- 相对时间：今天/明天/后天/大后天
- 周几：下周一/这周五
- 上午/下午/晚上 + 数字（自动转24h）
- 模糊时间：早上、中午、傍晚（需有默认值）
- 提醒：提前X分钟/小时

**Prompt 修改记录：**
- v1 (2026-05-29)：初始版本

---

## 已知问题 & 解决方案

| 问题 | 状态 | 解决方案 |
|------|------|---------|
| expo-calendar 在 Android 13+ 需要新权限 | 待验证 | 参考 expo-calendar 官方文档 WRITE_CALENDAR |
| NativeWind v4 与 expo-router 可能有样式冲突 | 待验证 | 参考 nativewind.dev/v4/getting-started/expo-router |
| Groq FormData 上传音频格式 | 已知 | 使用 m4a 格式，type 手动设置 audio/m4a |
| App Shortcuts 在 MIUI 上可能需要额外配置 | 待验证 | 小米手机需开启"桌面快捷方式"权限 |

---

## 阶段完成记录

| 阶段 | 状态 | 完成时间 | 主要产出 |
|------|------|---------|---------|
| 阶段一：基础 + UI | ✅ 已完成 | 2026-05-29 | Expo SDK 51 初始化、依赖安装、NativeWind/expo-router/quick actions 配置、录音 UI |
| 阶段二：录音 + STT | ✅ 已完成 | 2026-05-29 | useRecording、Groq STT service（后续废弃）、录音页转写链路 |
| 阶段三：意图解析 | ✅ 已完成 | 2026-05-29 | CalendarEvent、prompt、DeepSeek fetch service、EventConfirmCard；DeepSeek 实测通过 |
| 阶段四：日历写入 | ✅ 已完成 | 2026-05-29 | calendar.service、notification.service、Zustand store、写入系统日历 + 提醒 |
| 阶段五：App 日历视图 | ✅ 已完成 | 2026-05-30 | 月历主页、CalendarGrid、EventListItem、事件详情/编辑页 |
| 阶段六：切换原生 STT | ✅ 已完成 | 2026-05-30 | 删除 Groq STT，接入 @react-native-voice/voice + Google ASR，prebuild 转 Bare Workflow |
| 阶段七：打包 | ✅ 已完成 | 2026-05-30 | EAS Build 配置，APK 构建成功，DeepSeek API Key 写入 EAS 生产环境 |
| 阶段八：切换讯飞 ASR | 🚧 进行中 | 2026-05-31 | 删除 @react-native-voice/voice，接入 SparkChain AAR，写 XfASRModule Native Module |

---

## Codex 阶段报告存档

> 每个阶段 Codex 输出报告后，将内容粘贴到此处

### 阶段一报告
```
=== 阶段一完成报告 ===
1. 已创建的文件列表
- app/_layout.tsx：根布局，配置 Stack、NativeWind 全局样式、quick actions 跳转 /record
- app/index.tsx：日历占位页和进入语音记录入口
- app/record.tsx：阶段一录音 UI，包含 idle/recording/processing 状态
- src/components/RecordButton.tsx：大圆录音按钮组件
- src/components/WaveformAnimation.tsx：录音波形脉冲动画
- src/types/index.ts：RecordingStatus 类型
- babel.config.js、metro.config.js、tailwind.config.js、global.css、nativewind-env.d.ts：NativeWind + Reanimated 配置
- .env.example：Groq / DeepSeek API Key 模板；.env 已创建但不提交

2. 依赖安装结果
- 成功：expo@51.0.39、expo-router@3.5.24、expo-av、expo-calendar、expo-notifications、expo-constants、expo-quick-actions、zustand、nativewind、tailwindcss、react-native-reanimated、deepseek
- 处理过的安装问题：expo-quick-actions 首次安装触发 npm peer 冲突，固定 react-native-screens 等 SDK 51 兼容版本后解决
- 验证：npm run typecheck 通过；npx expo install --check 通过；npx expo export --platform android 通过

3. 当前可运行的功能截图描述
- 首页为深色占位日历页，提供“开始语音记录”入口
- 录音页为全屏深色背景，中间大圆紫色按钮，点击后进入 recording 状态并显示波形动画，再次点击进入 processing 状态并显示转写区域反馈
- 动态 quick action 已配置为“语音记录”，参数 href=/record

4. 遇到的问题和解决方式
- 当前目录非空导致 create-expo-app 拒绝初始化：临时备份项目文档，初始化后恢复
- 沙箱网络限制导致 npx/npm 首次失败：按权限流程联网重试
- npm 误把缓存写到项目根目录的 %USERPROFILE%：显式指定 npm cache 到临时备份目录
- create-expo-app 默认拉取 Expo 56：降级并固定到项目书要求的 Expo SDK 51
- NativeWind 缺少 preset、Metro 不解析 expo-quick-actions exports：补齐 nativewind/preset 并开启 unstable_enablePackageExports

5. 下一阶段预计风险点
- expo-av 录音权限、m4a 格式和 Android 真机音量计量需要实机验证
- Groq Whisper 上传 FormData 的 React Native 文件类型需要仔细处理
- expo-quick-actions 属第三方原生模块，Expo Go 中可能只能降级为 no-op，长按快捷方式最终需要 Android 真机开发构建验证
```

### 阶段二报告
```
=== 阶段二完成报告 ===
1. useRecording hook 最终实现要点
- 使用 expo-av 请求麦克风权限，配置录音 AudioMode，并使用 HIGH_QUALITY m4a 预设录音。
- 返回 isRecording、startRecording、stopRecording、audioUri，并额外提供 durationMillis、metering、permissionStatus、errorMessage。
- 每 200ms 读取 RecordingStatus；录音超过 2 秒后，如果音量持续 1.5 秒低于 -50 dB，则自动 stopRecording。
- 组件卸载时会停止并卸载录音对象，避免录音资源悬挂。

2. STT 服务调用成功的测试文字（至少3条）
- 当前无法完成真实 API 测试：.env 中 EXPO_PUBLIC_GROQ_API_KEY 仍为占位值。
- transcribeAudio 已实现 Groq Whisper 调用：POST https://api.groq.com/openai/v1/audio/transcriptions，model=whisper-large-v3，language=zh。

3. 静音检测是否正常工作
- 代码已实现：durationMillis >= 2000 且 metering <= -50 dB 持续 1500ms 时自动停止。
- 尚未真机验证：当前环境没有 Android 真机/模拟器录音输入。

4. Groq API 响应时间大约多少毫秒
- 未测得：缺少有效 GROQ_API_KEY 和真机录音样本。

5. 遇到的问题和解决方式
- deepseek SDK 无关：已执行 npm uninstall deepseek，后续 DeepSeek API 直接 fetch。
- npm uninstall 需要联网解析 peer dependency：按权限流程重试后成功。
- Android adaptive icon 背景色已改为主紫 #6C3CE1。
- 录音页已接入真实录音和 STT loading/error 状态；真实 API 与静音效果等待 Key 和真机验证。
```

### 阶段三报告
```
=== 阶段三完成报告 ===
1. 5条测试用例各自的解析结果（原文 → JSON）
- "明天下午三点开产品会" → {"title":"产品会","date":"2026-05-30","time":"15:00","duration":60,"reminder_min":15,"allDay":false}
- "后天上午九点半牙医预约，提前一小时提醒我" → {"title":"牙医预约","date":"2026-05-31","time":"09:30","duration":60,"reminder_min":60,"allDay":false}
- "下周一下午两点跟客户视频会议" → {"title":"跟客户视频会议","date":"2026-06-01","time":"14:00","duration":60,"reminder_min":15,"allDay":false}
- "今晚记得买菜" → {"title":"买菜","date":"2026-05-29","time":"20:00","duration":60,"reminder_min":15,"allDay":false}
- "帮我提醒一下" → null

2. DeepSeek API 平均响应时间
- 约 855ms（5 条用例平均值）。测试使用用户临时提供的 Key，未写入 .env 或项目文件。

3. prompt 是否需要调整（说明原因）
- 已微调。首轮实测中，第 5 条 DeepSeek 原始返回了“字段全为 null 的对象”，不是字面量 null。
- 已加强 prompt：信息不足时必须只返回 null，不要返回包含 null 字段的对象；复测后第 5 条返回 raw=null。

4. EventConfirmCard UI 描述
- 底部半透明遮罩 + 深色圆角 Sheet，从底部用 react-native-reanimated 滑入。
- 可编辑标题、日期、时间、提前提醒分钟，并可切换全天。
- 底部提供“✅ 确认”和“❌ 取消”两个按钮；阶段四再接入真正保存日历。

5. 遇到的问题和解决方式
- 阶段三前置修复：REQUEST_TIMEOUT_MS 已从 30_000 改为 15_000。
- 已安装 expo-haptics 和 expo-secure-store，为后续震动反馈和安全存储做准备。
- parseIntent 使用 fetch 调用 DeepSeek，不依赖任何第三方 SDK；异常、Key 缺失、非 JSON、字段不合法都会返回 null。
- DeepSeek 真实测试通过；PowerShell 首轮测试出现中文编码错位，改用显式 UTF-8 管道 + Node fetch 后结果可信。
```

### 阶段四报告
```
（待填入）
```

### 阶段五报告
```
（待填入）
```

### 阶段六报告
```
（待填入）
```

### 阶段七报告
```
（待填入）
```

---

## 开发决策日志

> 记录开发过程中做出的重要选择，方便日后维护

| 日期 | 决策 | 原因 |
|------|------|------|
| 2026-05-29 | 选择 Expo Managed Workflow | 开发者纯 Web 背景，72h 内最高完成率 |
| 2026-05-29 | 选择 Groq Whisper 而非原生 STT | 中文准确率更稳，Managed workflow 兼容 |
| 2026-05-29 | 选择 DeepSeek 而非 Codex | 成本极低，中文意图解析够用 |
| 2026-05-29 | Android 优先，暂不做 iOS | 快捷方式在 iOS 需要 WidgetKit，成本高 |
| 2026-05-29 | 先不做桌面小组件 | App Shortcuts 足够满足便携性需求 |

---

## 维护指南

**如何更新此文件：**
1. 每个阶段完成后，更新"阶段完成记录"表格
2. 将 Codex 报告粘贴到对应区域
3. 遇到新问题记录到"已知问题"表
4. 修改 Prompt 后更新版本号和修改记录

**如何排查 API 问题：**
```bash
# 测试 Groq 连接
curl https://api.groq.com/openai/v1/models \
  -H "Authorization: Bearer $GROQ_API_KEY"

# 测试 DeepSeek 连接  
curl https://api.deepseek.com/chat/completions \
  -H "Authorization: Bearer $DEEPSEEK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"deepseek-chat","messages":[{"role":"user","content":"你好"}]}'
```

---

*最后更新：2026-05-29 | 维护者：Codex*
