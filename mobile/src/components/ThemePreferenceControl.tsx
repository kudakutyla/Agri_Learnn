import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useColorScheme } from 'nativewind';
import { setStorageItem } from '../services/storage';

type ThemePreferenceLabels = {
  switchToLightMode: string;
  switchToDarkMode: string;
};

const englishLabels: ThemePreferenceLabels = {
  switchToLightMode: 'Switch to light mode',
  switchToDarkMode: 'Switch to dark mode',
};

export function ThemePreferenceControl({
  labels = englishLabels,
  compact = false,
}: {
  labels?: ThemePreferenceLabels;
  compact?: boolean;
}) {
  const { colorScheme, setColorScheme } = useColorScheme();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isDarkMode = colorScheme === 'dark';

  async function toggleTheme() {
    if (saving) return;
    const previousTheme = isDarkMode ? 'dark' : 'light';
    const nextTheme = isDarkMode ? 'light' : 'dark';
    setSaving(true);
    setError('');
    setColorScheme(nextTheme);
    try {
      await setStorageItem('agrilearn_theme', nextTheme);
    } catch (saveError) {
      setColorScheme(previousTheme);
      setError(saveError instanceof Error ? saveError.message : 'Could not save your display preference.');
    } finally {
      setSaving(false);
    }
  }

  if (compact) {
    return (
      <View className="relative">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isDarkMode ? labels.switchToLightMode : labels.switchToDarkMode}
          accessibilityState={{ selected: isDarkMode, disabled: saving }}
          disabled={saving}
          onPress={() => { void toggleTheme(); }}
          className="h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10"
        >
          <Text className="text-lg text-white">{isDarkMode ? '☀' : '☾'}</Text>
        </Pressable>
        {error ? (
          <Text
            accessibilityRole="alert"
            className="absolute right-0 top-10 z-50 w-48 rounded-lg bg-[#3B2927] p-2 text-[9px] leading-4 text-white"
          >
            {error}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View className="mt-4 rounded-xl border border-[#E1E5DF] bg-white p-3 dark:border-[#35443A] dark:bg-[#1D2922]">
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1">
          <Text className="text-[11px] font-bold text-[#34483A] dark:text-[#E2EAE3]">Appearance</Text>
          <Text className="mt-1 text-[9px] text-[#78817B] dark:text-[#AAB6AD]">
            {isDarkMode ? 'Dark mode is on' : 'Light mode is on'}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isDarkMode ? labels.switchToLightMode : labels.switchToDarkMode}
          accessibilityState={{ selected: isDarkMode, disabled: saving }}
          disabled={saving}
          onPress={() => { void toggleTheme(); }}
          className="min-h-9 items-center justify-center rounded-lg bg-[#EAF1E8] px-3 dark:bg-[#2B4033]"
        >
          <Text className="text-[9px] font-bold text-[#14543E] dark:text-[#B7E2C2]">
            {isDarkMode ? labels.switchToLightMode : labels.switchToDarkMode}
          </Text>
        </Pressable>
      </View>
      {error ? <Text accessibilityRole="alert" className="mt-2 text-[9px] text-[#9A382C] dark:text-[#F0A69B]">{error}</Text> : null}
    </View>
  );
}
