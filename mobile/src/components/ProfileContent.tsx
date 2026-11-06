import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { BottomNav } from './BottomNav';
import { deleteStorageItem, getStorageItem } from '../services/storage';

const roles = [
  { value: 'learner', label: 'Learner' },
  { value: 'employer', label: 'SME + Employer' },
  { value: 'trainer', label: 'Trainer' },
  { value: 'admin', label: 'Admin' },
] as const;

const accountItems = [
  { icon: '♙', label: 'Personal information', detail: 'Edit your account name' },
  { icon: '♧', label: 'Notification preferences', detail: 'View your recent updates' },
  { icon: '▣', label: 'Privacy & security', detail: 'Account security settings' },
  { icon: '⚙', label: 'Language · English', detail: 'Choose your app language' },
  { icon: '✉', label: 'Help & support', detail: 'Get help with AgriLearn' },
] as const;

type ProfileDialog = {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm?: () => void;
};

function roleLabel(role: string) {
  return roles.find((item) => item.value === role)?.label ?? 'Learner';
}

export default function ProfileContent() {
  const [name, setName] = useState('');
  const [role, setRole] = useState('learner');
  const [signingOut, setSigningOut] = useState(false);
  const [dialog, setDialog] = useState<ProfileDialog | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      getStorageItem('agrilearn_name'),
      getStorageItem('agrilearn_role'),
    ]).then(([savedName, savedRole]) => {
      if (!active) return;
      setName(savedName ?? '');
      setRole(savedRole ?? 'learner');
    }).catch((error: unknown) => {
      if (active) {
        setDialog({
          title: 'Could not load profile',
          message: error instanceof Error ? error.message : 'Please try again.',
        });
      }
    });
    return () => { active = false; };
  }, []);

  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

  function showAccountItem(label: string) {
    if (label === 'Personal information') {
      router.push('/profile-edit');
      return;
    }

    if (label === 'Notification preferences') {
      router.push('/notifications');
      return;
    }

    if (label === 'Help & support') {
      setDialog({
        title: 'Help & support',
        message: 'For help with your account, contact your AgriLearn administrator.',
      });
      return;
    }

    const messages: Record<string, string> = {
      'Privacy & security': 'Your account is protected by your sign-in session. Sign out on shared devices to end your session.',
      'Language · English': 'English is the only language currently available.',
    };
    setDialog({
      title: label.replace(' · English', ''),
      message: messages[label] ?? 'This setting is not available yet.',
    });
  }

  function requestSignOut() {
    setDialog({
      title: 'Sign out',
      message: 'Are you sure you want to sign out?',
      confirmLabel: 'Sign out',
      onConfirm: () => {
        setDialog(null);
        void signOut();
      },
    });
  }

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await Promise.all([
        deleteStorageItem('agrilearn_token'),
        deleteStorageItem('agrilearn_role'),
        deleteStorageItem('agrilearn_name'),
        deleteStorageItem('agrilearn_user_id'),
      ]);
      router.replace('/login');
    } catch (error) {
      setDialog({
        title: 'Could not sign out',
        message: error instanceof Error ? error.message : 'Please try again.',
      });
      setSigningOut(false);
    }
  }

  return (
    <View className="flex-1 bg-[#F7F7F2] dark:bg-[#101814]">
      <ScrollView className="flex-1" contentContainerClassName="px-4 pb-6 pt-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-[24px] font-extrabold text-[#17261E] dark:text-[#F1F4F1]">Profile</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit profile settings"
            onPress={() => router.push('/profile-edit')}
            className="h-9 w-9 items-center justify-center rounded-full border border-[#E1E5DF] bg-white dark:border-[#35443A] dark:bg-[#1D2922]"
          >
            <Text className="text-base text-[#14543E]">⚙</Text>
          </Pressable>
        </View>

        <View className="items-center pb-5 pt-6">
          <View className="h-[64px] w-[64px] items-center justify-center rounded-2xl bg-[#EAF1E8]">
            <Text className="text-[18px] font-extrabold text-[#14543E]">{initials || 'AL'}</Text>
          </View>
          <Text className="mt-2 text-[18px] font-bold text-[#252B27] dark:text-[#F1F4F1]">{name || 'AgriLearn learner'}</Text>
          <Text className="mt-1 text-[12px] text-[#858C87] dark:text-[#AAB6AD]">{roleLabel(role)} account</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
            onPress={() => router.push('/profile-edit')}
            className="mt-3 h-10 flex-row items-center rounded-xl border border-[#E1E5DF] bg-white px-4 dark:border-[#35443A] dark:bg-[#1D2922]"
          >
            <Text className="text-[12px] font-bold text-[#14543E]">Edit profile</Text>
            <Text className="ml-2 text-[12px] text-[#14543E]">↗</Text>
          </Pressable>
        </View>

        <Text className="mb-1.5 mt-1 text-[12px] font-bold uppercase tracking-[1px] text-[#858C87] dark:text-[#AAB6AD]">Account</Text>
        <View className="overflow-hidden rounded-xl border border-[#E5E8E2] bg-white dark:border-[#35443A] dark:bg-[#1D2922]">
          {accountItems.map((item, index) => (
            <Pressable
              key={item.label}
              accessibilityRole="button"
              accessibilityLabel={`${item.label}. ${item.detail}`}
              onPress={() => showAccountItem(item.label)}
              className={`min-h-[52px] flex-row items-center px-3 ${index > 0 ? 'border-t border-[#EEF0EC] dark:border-[#35443A]' : ''}`}
            >
              <Text className="w-7 text-[15px] text-[#14543E]">{item.icon}</Text>
              <View className="flex-1 py-2">
                <Text className="text-[13px] font-medium text-[#343D37] dark:text-[#E2EAE3]">{item.label}</Text>
                <Text className="mt-0.5 text-[11px] text-[#929992] dark:text-[#AAB6AD]">{item.detail}</Text>
              </View>
              <Text className="ml-2 text-base text-[#63806D]">›</Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={signingOut}
          onPress={requestSignOut}
          className="mt-4 h-11 items-center justify-center rounded-xl bg-[#FBEFED] dark:bg-[#3B2927]"
        >
          <Text className="text-[13px] font-bold text-[#A34F46]">{signingOut ? 'Signing out…' : 'Sign out'}</Text>
        </Pressable>
      </ScrollView>
      <BottomNav />
      <Modal
        visible={dialog !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDialog(null)}
      >
        <View className="flex-1 items-center justify-center px-6">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss dialog"
            onPress={() => setDialog(null)}
            className="absolute inset-0 bg-black/40"
          />
          {dialog ? (
            <View className="w-full max-w-[360px] rounded-2xl bg-white p-5 dark:bg-[#1D2922]">
              <Text className="text-lg font-extrabold text-[#17261E] dark:text-[#F1F4F1]">{dialog.title}</Text>
              <Text className="mt-2 text-sm leading-5 text-[#59635C] dark:text-[#B5C0B7]">{dialog.message}</Text>
              <View className="mt-5 flex-row justify-end gap-3">
                {dialog.confirmLabel ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={signingOut}
                    onPress={() => dialog.onConfirm?.()}
                    className={`min-h-10 items-center justify-center rounded-xl bg-[#A34F46] px-4 ${signingOut ? 'opacity-50' : ''}`}
                  >
                    <Text className="text-sm font-bold text-white">{signingOut ? 'Signing out…' : dialog.confirmLabel}</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setDialog(null)}
                  className="min-h-10 items-center justify-center rounded-xl border border-[#DDE4DC] px-4 dark:border-[#4A5A50]"
                >
                  <Text className="text-sm font-bold text-[#14543E] dark:text-[#B7E2C2]">{dialog.confirmLabel ? 'Cancel' : 'Done'}</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}
