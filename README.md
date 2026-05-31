# VoiceCalendar

说一句话，事件自动进日历。

> 72小时 Vibe 编程黑客松参赛作品 · 题目一：语音版日历工具

---

## 功能演示

| 操作 | 示例语音 |
|------|---------|
| 添加单个事件 | "明天下午三点开会" |
| 添加多个事件 | "明天上午9点上课，下午2点出去玩" |
| 相对时间 | "半小时后出门" / "一小时后开会" |
| 删除事件 | "删掉明天下午的会议" |
| 查询日程 | "后天有什么安排" |
| 手动添加 | 点击主页右上角 + 按钮 |

---

## 核心特性

- **语音转日历**：说一句话，自动识别时间、标题、时长，写入系统日历
- **讯飞 ASR**：国内直连语音识别，无需 VPN，支持普通话
- **DeepSeek 意图解析**：理解自然语言中的时间表达（今天/明天/下周五/半小时后）
- **系统日历双写**：事件同步到手机系统日历，跨 App 可见
- **提醒通知**：精准闹钟提醒，支持自定义提前时间
- **桌面快捷方式**：长按 App 图标直接进入录音界面（2步到位）
- **月历视图**：查看、编辑、删除所有语音创建的事件

---

## 技术栈

| 层 | 技术 |
|----|------|
| 框架 | Expo SDK 51 (Bare Workflow) + TypeScript |
| 路由 | expo-router v3 |
| 语音识别 | 讯飞 SparkChain ASR SDK (Android AAR) + Kotlin Native Module |
| 录音采集 | Android AudioRecord (PCM 16kHz 16bit 单声道) |
| 意图解析 | DeepSeek API (deepseek-chat) |
| 系统日历 | expo-calendar |
| 通知提醒 | expo-notifications (精准闹钟) |
| 快捷方式 | expo-quick-actions |
| 状态管理 | Zustand |
| 样式 | NativeWind v4 (Tailwind for React Native) |

---

## 快速开始

### 前置要求

- Node.js 18+
- Android Studio + Android SDK
- 讯飞开放平台账号（[申请地址](https://www.xfyun.cn/)）
- DeepSeek API Key（[申请地址](https://platform.deepseek.com)）

### 安装

```bash
git clone https://github.com/anphuchoang5-sys/voice.git
cd voice
npm install
```

### 配置 API Keys

**1. 创建 `.env` 文件（DeepSeek）：**

```bash
cp .env.example .env
```

编辑 `.env`，填入 DeepSeek API Key：

```
EXPO_PUBLIC_DEEPSEEK_API_KEY=sk-your_key_here
```

**2. 创建 `android/local.properties`（讯飞 ASR）：**

```properties
sdk.dir=C:/Users/你的用户名/AppData/Local/Android/Sdk
xf.appId=你的AppID
xf.apiKey=你的ApiKey
xf.apiSecret=你的ApiSecret
```

> `local.properties` 已在 `.gitignore` 中，不会提交到 git。

### 构建并运行

```bash
# 连接 Android 设备后
npx expo run:android

# 或构建 APK
cd android && ./gradlew assembleRelease
```

---

## 项目结构

```
app/
  _layout.tsx        # 根布局：权限检测、快捷方式初始化
  index.tsx          # 主页：月历视图 + 事件列表
  record.tsx         # 录音页：语音输入 + 意图处理
  event/[id].tsx     # 事件详情/编辑页

src/
  components/
    EventConfirmCard.tsx      # 事件确认弹窗（创建/编辑）
    EventListItem.tsx         # 事件列表项（左滑删除）
    CalendarGrid.tsx          # 月历格子组件
    PermissionGuardDialog.tsx # 权限引导弹窗
    RecordButton.tsx          # 录音按钮
    WaveformAnimation.tsx     # 录音波形动画

  services/
    calendar.service.ts       # expo-calendar 封装
    intent.service.ts         # DeepSeek 意图解析
    notification.service.ts   # 通知/提醒服务

  hooks/
    useVoice.ts               # 讯飞 ASR 状态管理
    usePermissionGuard.ts     # 权限检测

  stores/
    calendar.store.ts         # Zustand 事件状态

  constants/
    prompts.ts                # DeepSeek 系统提示词
    config.ts                 # API 配置常量

  utils/
    date.ts                   # 日期格式化工具

android/
  app/src/main/java/com/seven/voicecalendar/
    XfASRModule.kt            # 讯飞 ASR Kotlin Native Module
    XfASRPackage.kt
```

---

## 权限说明

App 启动时会检测以下权限，缺少时弹窗引导授权：

| 权限 | 用途 |
|------|------|
| `RECORD_AUDIO` | 麦克风录音 |
| `READ_CALENDAR` / `WRITE_CALENDAR` | 读写系统日历 |
| `POST_NOTIFICATIONS` | 发送提醒通知（Android 13+）|
| `SCHEDULE_EXACT_ALARM` | 精准时间提醒（Android 12）|

---

## 注意事项

- **仅支持 Android**，暂不支持 iOS
- 语音识别需要网络连接（讯飞云端 ASR）
- DeepSeek 意图解析需要网络连接
- 建议在安静环境下使用，识别准确率更高
- 构建 APK 前请确保 `android/local.properties` 已正确配置讯飞凭证

---

## License

MIT
