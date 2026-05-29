import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import type { RecordingStatus } from "../types";

type RecordButtonProps = {
  status: RecordingStatus;
  onPress: () => void;
};

type RecordButtonCopy = {
  label: string;
  caption: string;
  backgroundColor: string;
  borderColor: string;
};

const BUTTON_COPY: Record<RecordingStatus, RecordButtonCopy> = {
  idle: {
    label: "录音",
    caption: "点击开始",
    backgroundColor: "#6C3CE1",
    borderColor: "rgba(167, 139, 250, 0.55)",
  },
  recording: {
    label: "停止",
    caption: "正在录音",
    backgroundColor: "#A78BFA",
    borderColor: "rgba(255, 255, 255, 0.72)",
  },
  processing: {
    label: "处理中",
    caption: "请稍候",
    backgroundColor: "#3B2D71",
    borderColor: "rgba(167, 139, 250, 0.35)",
  },
};

export function RecordButton({
  status,
  onPress,
}: RecordButtonProps): React.JSX.Element {
  const scale = useSharedValue<number>(1);
  const copy = BUTTON_COPY[status];
  const disabled = status === "processing";

  useEffect((): void => {
    scale.value = withTiming(status === "recording" ? 1.06 : 1, {
      duration: 220,
    });
  }, [scale, status]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      accessibilityLabel={copy.label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
    >
      {({ pressed }): React.JSX.Element => (
        <Animated.View
          className="items-center justify-center rounded-full border"
          style={[
            styles.button,
            {
              backgroundColor: copy.backgroundColor,
              borderColor: copy.borderColor,
              opacity: pressed && !disabled ? 0.86 : 1,
            },
            animatedStyle,
          ]}
        >
          <View className="h-7 w-7 rounded-full bg-white/90" />
          <Text className="mt-4 text-xl font-semibold text-white">{copy.label}</Text>
          <Text className="mt-1 text-xs font-medium text-white/75">{copy.caption}</Text>
        </Animated.View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 148,
    shadowColor: "#A78BFA",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.36,
    shadowRadius: 28,
    width: 148,
  },
});
