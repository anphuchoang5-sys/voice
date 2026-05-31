# CLAUDE.md — VoiceCalendar 开发日志

> 此文件由 Claude 维护，记录项目背景、架构决策、开发日志和已知问题。
> 每次重要变更后更新对应章节。

## Claude 审查风格约定

代码审查时，每个问题必须包含三部分：
- 🔍 **这是什么**：一句话解释这段代码在做什么（面向非技术背景）
- ⚠️ **风险**：不修的后果（报错 / 功能失效 / 安全隐患 / 性能问题）
- 🛠️ **怎么修**：具体改动建议

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

### 为什么阶段六换成 Android 原生 STT（放弃 Groq Whisper）
- Groq 限制中国大陆个人邮箱注册，GitHub OAuth 也被拦截，无法获取 API Key
- Android 原生 SpeechRecognizer（Google ASR）中文准确率与 Whisper 相当
- 零 API Key 依赖，演示不会因服务商问题失败
- 边说话边实时显示识别文字，体验优于"录音→上传→等待"模式
- Android 系统自带静音检测，无需手动实现
- 代价：需要 `npx expo prebuild`，项目转 Bare Workflow，失去 Expo Go 兼容
- 注意：在中国大陆需要 VPN 才能使用 Google ASR；部分国产 ROM 可能使用自家 ASR 引擎

### 为什么阶段八换成讯飞 SparkChain ASR（放弃 Google ASR）
- 实机验证（国行 Redmi）：Google ASR 完全不可用，无 VPN 报错码 11（服务器断开），有 VPN 报错码 12（不支持 zh-CN 语言包）
- 讯飞 SparkChain SDK 是原生 Android AAR 库，内部自动处理 WebSocket + HMAC 鉴权，不需要手写签名
- 使用标准 appID/apiKey/apiSecret 三件套，国内网络直连，无需 VPN
- 流程：AudioRecord 采集 PCM → SparkChain ASR.write() → 回调返回识别文字，与 Google ASR 体验一致
- SDK 文件放在 `android/app/libs/`，随 git 管理，EAS 云构建可以找到
- 代价：需要讯飞开放平台账号和凭证，需写 Kotlin Native Module 桥接层

### 为什么用 DeepSeek（不是 Claude / GPT-4）
- 日历意图解析是简单 NLP 任务，prompt 极短（< 100 token）
- DeepSeek 中文理解能力强，成本约 ¥1/百万 token
- 对于最终用户，不能假设他们会付 Claude 费用
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
框架:     Expo SDK 51 (Bare Workflow，阶段六 prebuild 后) + TypeScript
路由:     expo-router v3
语音识别: XfASR Native Module（Kotlin）→ 讯飞 SparkChain SDK → 讯飞 ASR 云端
录音采集: Android AudioRecord（PCM 16kHz 16bit 单声道）
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

### 必需的 API Keys
| Key | 获取地址 | 免费额度 |
|-----|---------|---------|
| `DEEPSEEK_API_KEY` | https://platform.deepseek.com | 注册送余额 |

> Groq Whisper 已于阶段六放弃，改用 Android 原生 SpeechRecognizer，无需 API Key。

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
  stt.service.ts     ← 唯一与 Groq 通信的地方
  intent.service.ts  ← 唯一与 DeepSeek 通信的地方
  calendar.service.ts← 所有 expo-calendar 操作封装
  notification.service.ts ← 所有通知逻辑

src/constants/
  prompts.ts         ← DeepSeek 系统提示词（集中管理，方便调优）
  config.ts          ← API 端点、模型名、超时等常量
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
| 阶段二：录音 + STT | ⬜ 未开始 | — | — |
| 阶段三：意图解析 | ⬜ 未开始 | — | — |
| 阶段四：日历写入 | ⬜ 未开始 | — | — |
| 阶段五：App 日历视图 | ⬜ 未开始 | — | — |
| 阶段六：完善 | ⬜ 未开始 | — | — |
| 阶段七：打包 | ⬜ 未开始 | — | — |

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
（待填入）
```

### 阶段三报告
```
（待填入）
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
| 2026-05-30 | 阶段六切换到 Android 原生 STT | Groq 在中国大陆无法注册，Google ASR 效果相当且零依赖 |
| 2026-05-30 | 项目转 Bare Workflow（prebuild） | @react-native-voice/voice 需要原生模块，Expo Go 不再适用 |
| 2026-05-31 | 阶段八切换到讯飞 SparkChain ASR | 实机验证 Google ASR 在国行 Redmi 完全不可用（错误码 11/12），讯飞国内直连稳定 |
| 2026-05-31 | SparkChain SDK 放入 android/app/libs/ | EAS 云构建需要能找到 AAR 文件，随 git 管理比项目外更可靠 |
| 2026-05-29 | 选择 DeepSeek 而非 Claude | 成本极低，中文意图解析够用 |
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

*最后更新：2026-05-29 | 维护者：Claude*
