import "../global.css";

import { useCallback, useEffect, useState } from "react";
import { Stack, router } from "expo-router";
import * as QuickActions from "expo-quick-actions";
import { useQuickActionCallback } from "expo-quick-actions/hooks";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { PermissionGuardDialog } from "../src/components/PermissionGuardDialog";
import { usePermissionGuard } from "../src/hooks/usePermissionGuard";

const RECORD_QUICK_ACTION: QuickActions.Action = {
  id: "voice-record",
  title: "语音记录",
  subtitle: "说一句话加入日历",
  icon: "compose",
  params: { href: "/record" },
};

function getActionHref(action: QuickActions.Action): string | null {
  const href = action.params?.href;
  return typeof href === "string" ? href : null;
}

async function configureQuickActions(): Promise<void> {
  try {
    const supported = await QuickActions.isSupported();

    if (supported) {
      await QuickActions.setItems([RECORD_QUICK_ACTION]);
    }
  } catch (error) {
    console.warn("Failed to configure quick actions", error);
  }
}

export default function RootLayout(): React.JSX.Element {
  const [permDialogDismissed, setPermDialogDismissed] = useState(false);

  const { missingPermissions, requestPermission, recheckPermissions } =
    usePermissionGuard();

  const handleQuickAction = useCallback((action: QuickActions.Action): void => {
    if (getActionHref(action) === "/record") {
      setTimeout((): void => {
        router.push("/record");
      }, 0);
    }
  }, []);

  useQuickActionCallback(handleQuickAction);

  useEffect((): void => {
    void configureQuickActions();
  }, []);

  // 用户重新打开 App 时（如从设置页返回），若权限已全部补齐则自动关闭弹窗
  useEffect((): void => {
    if (permDialogDismissed && missingPermissions.length === 0) {
      setPermDialogDismissed(false);
    }
  }, [missingPermissions, permDialogDismissed]);

  const showPermDialog =
    missingPermissions.length > 0 && !permDialogDismissed;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#0F0F1A" },
        }}
      />

      {showPermDialog && (
        <PermissionGuardDialog
          missingPermissions={missingPermissions}
          onDismiss={() => setPermDialogDismissed(true)}
          onRequest={async (def) => {
            await requestPermission(def);
          }}
        />
      )}
    </GestureHandlerRootView>
  );
}
