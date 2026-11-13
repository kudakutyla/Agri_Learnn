import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { AdminBottomNav } from '../components/AdminBottomNav';
import { ThemePreferenceControl } from '../components/ThemePreferenceControl';
import { api, type Profile } from '../services/api';
import { deleteStorageItem } from '../services/storage';

type SettingsDialog = {
  title: string;
  message: string;
  confirmLabel?: string;
  action?: 'sign-out';
};

const settingsItems = [
  { icon: '♙', label: 'Personal information', detail: 'Edit your account details' },
  { icon: '♧', label: 'Notification preferences', detail: 'Notification controls are not available yet' },
  { icon: '▣', label: 'Privacy & security', detail: 'Account and sign-in security' },
  { icon: '⚙', label: 'Language · English', detail: 'English is the available language' },
  { icon: '✉', label: 'Help & support', detail: 'Get help with AgriLearn' },
] as const;

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase() || 'AL';
}

export default function AdminSettingsScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const [dialog, setDialog] = useState<SettingsDialog | null>(null);

  useEffect(() => {
    let active = true;
    void api.profile.get()
      .then(({ user }) => {
        if (!active) return;
        if (user.role !== 'admin') {
          router.replace('/dashboard');
          return;
        }
        setProfile(user);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load administrator profile.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  function openSettingsItem(label: string) {
    if (label === 'Personal information') {
      router.push('/profile-edit');
      return;
    }

    const messages: Record<string, string> = {
      'Notification preferences': 'Notification preferences are not configurable yet.',
      'Privacy & security': 'Your administrator access is tied to your account. Change your password from Personal information, and sign out on shared devices.',
      'Language · English': 'English is currently the only available language.',
      'Help & support': 'For help with your administrator account, contact your AgriLearn platform support team.',
    };
    setDialog({ title: label.replace(' · English', ''), message: messages[label] ?? 'This setting is unavailable.' });
  }

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    setError('');
    try {
      await Promise.all([
        deleteStorageItem('agrilearn_token'),
        deleteStorageItem('agrilearn_role'),
        deleteStorageItem('agrilearn_name'),
        deleteStorageItem('agrilearn_user_id'),
      ]);
      setDialog(null);
      router.replace('/');
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : 'Could not sign out. Please try again.');
      setDialog(null);
      setSigningOut(false);
    }
  }

  return (
    <View className="flex-1 bg-[#F7F7F2] dark:bg-[#101814]">
      <ScrollView className="flex-1" contentContainerClassName="px-4 pb-6 pt-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-[22px] font-extrabold text-[#17261E] dark:text-[#F1F4F1]">Settings</Text>
          <View className="h-9 w-9 items-center justify-center rounded-full border border-[#E1E5DF] bg-white dark:border-[#35443A] dark:bg-[#1D2922]">
            <Text className="text-sm text-[#14543E]">⚙</Text>
          </View>
        </View>

        {error ? (
          <View className="mt-4 rounded-xl border border-[#F0D1C8] bg-white p-3 dark:bg-[#1D2922]">
            <Text accessibilityRole="alert" className="text-[10px] leading-4 text-[#9A382C]">{error}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace('/login')}
              className="mt-2 self-start"
            >
              <Text className="text-[9px] font-bold text-[#14543E]">Sign in again</Text>
            </Pressable>
          </View>
        ) : null}

        <View className="items-center pb-5 pt-6">
          <View className="h-[58px] w-[58px] items-center justify-center rounded-2xl bg-[#EAF1E8]">
            <Text className="text-[16px] font-extrabold text-[#14543E]">{profile ? initials(profile.name) : '—'}</Text>
          </View>
          <Text className="mt-2 text-[15px] font-bold text-[#252B27] dark:text-[#F1F4F1]">
            {loading ? 'Loading profile…' : profile?.name ?? 'Profile unavailable'}
          </Text>
          <Text className="mt-1 text-[9px] text-[#858C87] dark:text-[#AAB6AD]">
            {profile ? 'Platform Administrator' : loading ? '' : 'Administrator account'}
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={!profile || loading}
            onPress={() => router.push({ pathname: '/profile-edit', params: { returnTo: 'admin-settings' } })}
            className="mt-3 h-9 flex-row items-center rounded-xl border border-[#E1E5DF] bg-white px-4 dark:border-[#35443A] dark:bg-[#1D2922]"
          >
            <Text className="text-[10px] font-bold text-[#14543E]">Edit profile</Text>
            <Text className="ml-2 text-[10px] text-[#14543E]">✎</Text>
          </Pressable>
        </View>

        <Text className="mb-1.5 mt-1 text-[8px] font-bold uppercase tracking-[1px] text-[#858C87] dark:text-[#AAB6AD]">Account</Text>
        <View className="overflow-hidden rounded-xl border border-[#E5E8E2] bg-white dark:border-[#35443A] dark:bg-[#1D2922]">
          {settingsItems.map((item, index) => (
            <Pressable
              key={item.label}
              accessibilityRole="button"
              accessibilityLabel={`${item.label}. ${item.detail}`}
              onPress={() => item.label === 'Personal information'
                ? router.push({ pathname: '/profile-edit', params: { returnTo: 'admin-settings' } })
                : openSettingsItem(item.label)}
              className={`min-h-[49px] flex-row items-center px-3 ${index > 0 ? 'border-t border-[#EEF0EC] dark:border-[#35443A]' : ''}`}
            >
              <Text className="w-7 text-[13px] text-[#14543E]">{item.icon}</Text>
              <View className="flex-1 py-2">
                <Text className="text-[10px] font-medium text-[#343D37] dark:text-[#E2EAE3]">{item.label}</Text>
                <Text className="mt-0.5 text-[8px] text-[#929992] dark:text-[#AAB6AD]">{item.detail}</Text>
              </View>
              <Text className="ml-2 text-sm text-[#63806D]">›</Text>
            </Pressable>
          ))}
        </View>

        <ThemePreferenceControl />
        <View className="mt-4 rounded-xl border border-[#E1E5DF] bg-white p-3 dark:border-[#35443A] dark:bg-[#1D2922]">
          <Text className="text-[9px] font-bold text-[#34483A] dark:text-[#E2EAE3]">Administrator access</Text>
          <Text className="mt-1 text-[8px] leading-3 text-[#78817B] dark:text-[#AAB6AD]">
            Your role is assigned to your account and cannot be changed from this screen.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={signingOut}
          onPress={() => setDialog({
            title: 'Sign out',
            message: 'Are you sure you want to end your administrator session?',
            confirmLabel: 'Sign out',
            action: 'sign-out',
          })}
          className="mt-4 h-10 items-center justify-center rounded-xl bg-[#FBEFED] dark:bg-[#3B2927]"
        >
          <Text className="text-[11px] font-bold text-[#A34F46]">{signingOut ? 'Signing out…' : 'Sign out'}</Text>
        </Pressable>
      </ScrollView>

      <AdminBottomNav active="Settings" />

      <Modal visible={dialog !== null} transparent animationType="fade" onRequestClose={() => setDialog(null)}>
        <View className="flex-1 items-center justify-center px-6">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss dialog"
            onPress={() => setDialog(null)}
            className="absolute inset-0 bg-black/40"
          />
          {dialog ? (
            <View className="w-full max-w-[360px] rounded-2xl bg-white p-5 dark:bg-[#1D2922]">
              <Text className="text-[16px] font-extrabold text-[#17261E] dark:text-[#F1F4F1]">{dialog.title}</Text>
              <Text className="mt-2 text-[11px] leading-5 text-[#59635C] dark:text-[#B5C0B7]">{dialog.message}</Text>
              <View className="mt-5 flex-row justify-end gap-3">
                {dialog.action === 'sign-out' ? (
                  <Pressable accessibilityRole="button" disabled={signingOut} onPress={() => { void signOut(); }} className="rounded-lg bg-[#A34F46] px-4 py-2.5">
                    <Text className="text-[10px] font-bold text-white">{signingOut ? 'Signing out…' : dialog.confirmLabel}</Text>
                  </Pressable>
                ) : null}
                <Pressable accessibilityRole="button" disabled={signingOut} onPress={() => setDialog(null)} className="rounded-lg bg-[#E8F0E7] px-4 py-2.5">
                  <Text className="text-[10px] font-bold text-[#14543E]">{dialog.action === 'sign-out' ? 'Cancel' : 'Close'}</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}
