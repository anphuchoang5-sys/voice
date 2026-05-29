import { Link } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen(): React.JSX.Element {
  return (
    <SafeAreaView className="flex-1 bg-night px-6">
      <StatusBar style="light" />
      <View className="flex-1 justify-between py-8">
        <View>
          <Text className="text-sm font-medium uppercase tracking-[2px] text-violetSoft">
            VoiceCalendar
          </Text>
          <Text className="mt-4 text-3xl font-semibold text-white">
            日历视图，即将实现
          </Text>
          <Text className="mt-3 text-base leading-7 text-slate-300">
            阶段五会在这里呈现月历、事件列表和系统日历同步状态。
          </Text>
        </View>

        <View className="rounded-[28px] border border-white/10 bg-white/5 p-5">
          <Text className="text-lg font-semibold text-white">快速入口</Text>
          <Text className="mt-2 text-sm leading-6 text-slate-300">
            当前阶段先完成录音界面和桌面快捷方式。点击下方按钮进入语音记录页。
          </Text>

          <Link href="/record" asChild>
            <Pressable className="mt-5 h-14 items-center justify-center rounded-full bg-violetDeep active:opacity-80">
              <Text className="text-base font-semibold text-white">开始语音记录</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
}
