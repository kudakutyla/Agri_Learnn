import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { api, Notification } from '../services/api';

function formatTime(createdAt: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString();
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;
    async function loadNotifications() {
      try {
        const result = await api.notifications.list();
        if (active) setNotifications(result.notifications);
      } catch (error) {
        if (active) setErrorMessage(error instanceof Error ? error.message : 'Could not load notifications.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadNotifications();
    return () => { active = false; };
  }, []);

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
        {loading ? (
          <Text className="py-8 text-center text-xs text-[#717A74] dark:text-[#AAB6AD]">Loading your notifications…</Text>
        ) : errorMessage ? (
          <Text accessibilityRole="alert" className="rounded-xl bg-[#FBE9E7] p-4 text-xs leading-5 text-[#9A382C]">{errorMessage}</Text>
        ) : notifications.length === 0 ? (
          <Text className="py-8 text-center text-xs text-[#717A74] dark:text-[#AAB6AD]">You don’t have any notifications yet.</Text>
        ) : notifications.map((notification) => (
          <View key={notification.id} className="rounded-2xl border border-[#DDE4DC] bg-white p-4 dark:border-[#35443A] dark:bg-[#1D2922]">
            <View className="flex-row items-start gap-3">
              <View className="mt-1 h-2.5 w-2.5 rounded-full bg-[#C6A15B]" />
              <View className="flex-1">
                <View className="flex-row items-center justify-between">
                  <Text className="flex-1 font-extrabold text-[#252B27] dark:text-[#F1F4F1]">{notification.title}</Text>
                  <Text className="ml-2 text-[9px] text-[#717A74] dark:text-[#AAB6AD]">{formatTime(notification.createdAt)}</Text>
                </View>
                <Text className="mt-2 text-xs leading-5 text-[#717A74] dark:text-[#B5C0B7]">{notification.message}</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
