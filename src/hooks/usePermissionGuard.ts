import { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  type AppStateStatus,
  Linking,
  PermissionsAndroid,
  Platform,
} from "react-native";

// ─── 权限定义 ────────────────────────────────────────────────────────────────

export type PermissionDef = {
  key: string;
  label: string;
  icon: string;
  description: string;
  /** true = 无法弹系统对话框，需要跳到系统设置 */
  isSpecial: boolean;
  check: () => Promise<boolean>;
  request: () => Promise<void>;
};

async function checkAndroid(permission: string): Promise<boolean> {
  if (Platform.OS !== "android") return true;
  return PermissionsAndroid.check(permission as never);
}

async function requestAndroid(permission: string): Promise<void> {
  if (Platform.OS !== "android") return;
  await PermissionsAndroid.request(permission as never);
}

const PERMISSION_DEFS: PermissionDef[] = [
  {
    key: "microphone",
    label: "麦克风",
    icon: "🎤",
    description: "语音识别录音，不开启无法使用主功能",
    isSpecial: false,
    check: () => checkAndroid(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO),
    request: () => requestAndroid(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO),
  },
  {
    key: "calendar",
    label: "日历",
    icon: "📅",
    description: "读写系统日历，不开启无法保存事件",
    isSpecial: false,
    check: () =>
      checkAndroid(PermissionsAndroid.PERMISSIONS.WRITE_CALENDAR),
    request: () =>
      requestAndroid(PermissionsAndroid.PERMISSIONS.WRITE_CALENDAR),
  },
  {
    key: "notifications",
    label: "通知",
    icon: "🔔",
    description: "显示事件提醒横幅和铃声",
    isSpecial: false,
    check: async () => {
      if (Platform.OS !== "android") return true;
      // Android 12 及以下通知权限自动授予
      if ((Platform.Version as number) < 33) return true;
      return checkAndroid("android.permission.POST_NOTIFICATIONS");
    },
    request: async () => {
      if (Platform.OS !== "android") return;
      if ((Platform.Version as number) < 33) return;
      await requestAndroid("android.permission.POST_NOTIFICATIONS");
    },
  },
  {
    key: "exact_alarm",
    label: "精确闹钟",
    icon: "⏰",
    description:
      "在准确时间触发提醒（Android 13+ 自动获得；Android 12 需手动开启）",
    // SCHEDULE_EXACT_ALARM 是特殊权限，只能跳设置页，不能弹对话框
    isSpecial: true,
    check: async () => {
      if (Platform.OS !== "android") return true;
      // Android 13+ 自动授予 USE_EXACT_ALARM
      if ((Platform.Version as number) >= 33) return true;
      return checkAndroid("android.permission.SCHEDULE_EXACT_ALARM");
    },
    request: async () => {
      // 跳到系统"特殊应用权限"页面，用户手动开启
      await Linking.openSettings();
    },
  },
];

// ─── Hook ────────────────────────────────────────────────────────────────────

type UsePermissionGuardResult = {
  missingPermissions: PermissionDef[];
  requestPermission: (def: PermissionDef) => Promise<void>;
  recheckPermissions: () => Promise<void>;
};

export function usePermissionGuard(): UsePermissionGuardResult {
  const [missingPermissions, setMissingPermissions] = useState<PermissionDef[]>(
    [],
  );
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const recheckPermissions = useCallback(async (): Promise<void> => {
    const missing: PermissionDef[] = [];
    for (const def of PERMISSION_DEFS) {
      const granted = await def.check();
      if (!granted) {
        missing.push(def);
      }
    }
    setMissingPermissions(missing);
  }, []);

  // 首次挂载时检查
  useEffect((): void => {
    void recheckPermissions();
  }, [recheckPermissions]);

  // App 从后台回到前台时重新检查（用户从系统设置页返回后）
  useEffect((): (() => void) => {
    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus): void => {
        const wasBackground = appStateRef.current.match(/inactive|background/);
        if (wasBackground && nextState === "active") {
          void recheckPermissions();
        }
        appStateRef.current = nextState;
      },
    );
    return (): void => subscription.remove();
  }, [recheckPermissions]);

  const requestPermission = useCallback(
    async (def: PermissionDef): Promise<void> => {
      await def.request();
      // 普通权限：请求完立即重新检查；特殊权限：用户去设置页，AppState 监听会重检
      if (!def.isSpecial) {
        await recheckPermissions();
      }
    },
    [recheckPermissions],
  );

  return { missingPermissions, requestPermission, recheckPermissions };
}
