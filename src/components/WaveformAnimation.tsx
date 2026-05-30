import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

type WaveformAnimationProps = {
  isActive: boolean;
};

type WaveBarProps = {
  active: boolean;
  index: number;
};

const BAR_INDEXES = [0, 1, 2, 3, 4] as const;

function WaveBar({ active, index }: WaveBarProps): React.JSX.Element {
  const progress = useSharedValue<number>(0);

  useEffect((): void => {
    progress.value = active
      ? withRepeat(
          withTiming(1, {
            duration: 520 + index * 80,
            easing: Easing.inOut(Easing.quad),
          }),
          -1,
          true,
        )
      : withTiming(0, { duration: 180 });
  }, [active, index, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: 16 + progress.value * (24 + index * 3),
    opacity: active ? 0.72 + progress.value * 0.28 : 0.22,
  }));

  return (
    <Animated.View
      style={[
        styles.bar,
        index === 2 ? styles.centerBar : null,
        animatedStyle,
      ]}
    />
  );
}

export function WaveformAnimation({
  isActive,
}: WaveformAnimationProps): React.JSX.Element {
  return (
    <View
      className="absolute h-56 w-56 items-center justify-center rounded-full border border-violetSoft/10"
      pointerEvents="none"
    >
      <View className="flex-row items-center gap-2">
        {BAR_INDEXES.map((index) => (
          <WaveBar active={isActive} index={index} key={index} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: "#A78BFA",
    borderRadius: 999,
    width: 8,
  },
  centerBar: {
    backgroundColor: "#FFFFFF",
  },
});
