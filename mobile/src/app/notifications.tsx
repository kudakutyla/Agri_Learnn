import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';

const notifications = [
  ['New weekly goal', 'Complete one more lesson to maintain your learning streak.', 'Today'],
  ['Course progress saved', 'Your Soil Health Fundamentals progress has been updated.', 'Yesterday'],
  ['Welcome to AgriLearn', 'Explore practical courses and grow your skills.', '3 days ago'],
];

export default function NotificationsScreen() {
  return (
    <View className="flex-1 bg-[#F8F8F3] dark:bg-[#101814]">
      <View className="flex-row items-center gap-3 px-5 pb-4 pt-14">
        <Pressable onPress={() => router.back()} className="h-11 w-11 items-center justify-center rounded-[14px] border border-[#DDE4DC] bg-white dark:border-[#35443A] dark:bg-[#1D2922]">
          <Text className="text-xl text-[#103D2B] dark:text-[#D8E5DB]">‹</Text>
        </Pressable>
        <View>
          <Text className="text-[22px] font-extrabold text-[#103D2B] dark:text-[#F1F4F1]">Notifications</Text>
          <Text className="mt-1 text-xs text-[#717A74] dark:text-[#AAB6AD]">Updates about your learning</Text>
        </View>
      </View>
      <ScrollView className="px-5" contentContainerClassName="gap-3 pb-8">
        {notifications.map(([title, description, time], index) => (
          <View key={title} className="rounded-2xl border border-[#DDE4DC] bg-white p-4 dark:border-[#35443A] dark:bg-[#1D2922]">
            <View className="flex-row items-start gap-3">
              <View className={`mt-1 h-2.5 w-2.5 rounded-full ${index === 0 ? 'bg-[#C6A15B]' : 'bg-[#DDE4DC] dark:bg-[#35443A]'}`} />
              <View className="flex-1">
                <View className="flex-row items-center justify-between">
                  <Text className="font-extrabold text-[#252B27] dark:text-[#F1F4F1]">{title}</Text>
                  <Text className="text-[9px] text-[#717A74] dark:text-[#AAB6AD]">{time}</Text>
                </View>
                <Text className="mt-2 text-xs leading-5 text-[#717A74] dark:text-[#B5C0B7]">{description}</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
