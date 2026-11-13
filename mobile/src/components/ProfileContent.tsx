import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { ComponentType } from 'react';
import { BottomNav } from './BottomNav';
import { ThemePreferenceControl } from './ThemePreferenceControl';
import { getAppLanguage } from '../services/appLanguage';
import { deleteStorageItem, getStorageItem } from '../services/storage';
import { useAppLanguage } from '../services/useAppLanguage';

type ProfileDialog = {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm?: () => void;
};

export default function ProfileContent({ Navigation = BottomNav }: { Navigation?: ComponentType }) {
  const { language, languageError } = useAppLanguage();
  const copy = getAppLanguage(language);
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
          title: copy.couldNotLoadProfile,
          message: error instanceof Error ? error.message : 'Please try again.',
        });
      }
    });
    return () => { active = false; };
  }, [copy.couldNotLoadProfile]);

  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  const roleLabel = role === 'employer'
    ? copy.employerAccount
    : role === 'trainer'
      ? copy.trainerAccount
      : role === 'admin'
        ? copy.adminAccount
        : copy.learnerAccount;
  const accountItems = [
    { id: 'personal', icon: '♙', label: copy.personalInformation, detail: copy.editAccountName },
    { id: 'notifications', icon: '♧', label: copy.notificationPreferences, detail: copy.recentUpdates },
    { id: 'privacy', icon: '▣', label: copy.privacySecurity, detail: copy.securitySettings },
    { id: 'language', icon: '⚙', label: copy.language(language), detail: copy.chooseLanguage },
    { id: 'help', icon: '✉', label: copy.helpSupport, detail: copy.getHelp },
  ] as const;

  function showAccountItem(id: (typeof accountItems)[number]['id']) {
    if (id === 'personal' || id === 'language') {
      router.push('/profile-edit');
      return;
    }

    if (id === 'notifications') {
      router.push('/notifications');
      return;
    }

    if (id === 'help') {
      setDialog({
        title: copy.helpSupport,
        message: copy.contactAdministrator,
      });
      return;
    }

    setDialog({
      title: copy.privacySecurity,
      message: copy.privacyMessage,
    });
  }

  function requestSignOut() {
    setDialog({
      title: copy.signOut,
      message: copy.confirmSignOut,
      confirmLabel: copy.signOut,
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
        deleteStorageItem('agrilearn_language'),
      ]);
      router.replace('/');
    } catch (error) {
      setDialog({
        title: copy.signOut,
        message: error instanceof Error ? error.message : 'Please try again.',
      });
      setSigningOut(false);
    }
  }

  return (
    <View className="flex-1 bg-[#F7F7F2] dark:bg-[#101814]">
      <ScrollView className="flex-1" contentContainerClassName="px-4 pb-6 pt-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-[24px] font-extrabold text-[#17261E] dark:text-[#F1F4F1]">{copy.profile}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.editProfile}
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
          <Text className="mt-2 text-[18px] font-bold text-[#252B27] dark:text-[#F1F4F1]">{name || copy.learnerName}</Text>
          <Text className="mt-1 text-[12px] text-[#858C87] dark:text-[#AAB6AD]">{roleLabel}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.editProfile}
            onPress={() => router.push('/profile-edit')}
            className="mt-3 h-10 flex-row items-center rounded-xl border border-[#E1E5DF] bg-white px-4 dark:border-[#35443A] dark:bg-[#1D2922]"
          >
            <Text className="text-[12px] font-bold text-[#14543E]">{copy.editProfile}</Text>
            <Text className="ml-2 text-[12px] text-[#14543E]">↗</Text>
          </Pressable>
        </View>

        <Text className="mb-1.5 mt-1 text-[12px] font-bold uppercase tracking-[1px] text-[#858C87] dark:text-[#AAB6AD]">{copy.account}</Text>
        <View className="overflow-hidden rounded-xl border border-[#E5E8E2] bg-white dark:border-[#35443A] dark:bg-[#1D2922]">
          {accountItems.map((item, index) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`${item.label}. ${item.detail}`}
              onPress={() => showAccountItem(item.id)}
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

        <ThemePreferenceControl labels={{
          switchToLightMode: copy.switchToLightMode,
          switchToDarkMode: copy.switchToDarkMode,
        }} />
        {languageError ? <Text accessibilityRole="alert" className="mt-3 text-center text-[10px] text-[#9A5147]">{languageError}</Text> : null}
        <Pressable
          accessibilityRole="button"
          disabled={signingOut}
          onPress={requestSignOut}
          className="mt-4 h-11 items-center justify-center rounded-xl bg-[#FBEFED] dark:bg-[#3B2927]"
        >
          <Text className="text-[13px] font-bold text-[#A34F46]">{signingOut ? copy.signingOut : copy.signOut}</Text>
        </Pressable>
      </ScrollView>
      <Navigation />
      <Modal
        visible={dialog !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDialog(null)}
      >
        <View className="flex-1 items-center justify-center px-6">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.dismissDialog}
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
                    <Text className="text-sm font-bold text-white">{signingOut ? copy.signingOut : dialog.confirmLabel}</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setDialog(null)}
                  className="min-h-10 items-center justify-center rounded-xl border border-[#DDE4DC] px-4 dark:border-[#4A5A50]"
                >
                  <Text className="text-sm font-bold text-[#14543E] dark:text-[#B7E2C2]">{dialog.confirmLabel ? copy.cancel : copy.done}</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}
