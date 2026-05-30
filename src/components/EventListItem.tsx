import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, Text, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";

import type { StoredCalendarEvent } from "../stores/calendar.store";

type EventListItemProps = {
  event: StoredCalendarEvent;
  onPress: (event: StoredCalendarEvent) => void;
  onDelete: (event: StoredCalendarEvent) => void;
  disabled?: boolean;
};

export function EventListItem({
  event,
  onPress,
  onDelete,
  disabled = false,
}: EventListItemProps): React.JSX.Element {
  return (
    <Swipeable
      enabled={!disabled}
      overshootRight={false}
      renderRightActions={(): React.JSX.Element => (
        <Pressable
          className="ml-3 h-full w-20 items-center justify-center rounded-2xl bg-red-500 active:opacity-80"
          onPress={(): void => onDelete(event)}
        >
          <Ionicons color="#FFFFFF" name="trash-outline" size={22} />
          <Text className="mt-1 text-xs font-semibold text-white">删除</Text>
        </Pressable>
      )}
    >
      <Pressable
        className="rounded-2xl border border-white/10 bg-white/5 p-4 active:bg-white/10"
        disabled={disabled}
        onPress={(): void => onPress(event)}
      >
        <View className="flex-row items-start justify-between gap-4">
          <View className="flex-1">
            <Text className="text-base font-semibold text-white">{event.title}</Text>
            <Text className="mt-1 text-sm text-slate-400">
              {getEventTimeLabel(event)}
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-xs font-semibold text-violetSoft">
              提前 {event.reminder_min} 分钟
            </Text>
            <Ionicons
              color="#94A3B8"
              name="chevron-forward"
              size={18}
              style={{ marginTop: 8 }}
            />
          </View>
        </View>
      </Pressable>
    </Swipeable>
  );
}

function getEventTimeLabel(event: StoredCalendarEvent): string {
  if (event.allDay || event.time === null) {
    return "全天";
  }

  return `${event.time} · ${event.duration} 分钟`;
}
