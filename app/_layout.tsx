import "../global.css";

import { useCallback, useEffect } from "react";
import { Stack, router } from "expo-router";
import * as QuickActions from "expo-quick-actions";
import { useQuickActionCallback } from "expo-quick-actions/hooks";
import { GestureHandlerRootView } from "react-native-gesture-handler";

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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#0F0F1A" },
        }}
      />
    </GestureHandlerRootView>
  );
}
