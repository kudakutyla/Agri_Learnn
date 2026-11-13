import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { getStorageItem } from '../services/storage';
import '../global.css';

export default function RootLayout() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const [themeLoadError, setThemeLoadError] = useState('');
  const isDarkMode = colorScheme === 'dark';

  useEffect(() => {
    let active = true;
    getStorageItem('agrilearn_theme').then((savedTheme) => {
      if (active && (savedTheme === 'light' || savedTheme === 'dark')) setColorScheme(savedTheme);
    }).catch((error: unknown) => {
      if (active) setThemeLoadError(
        error instanceof Error ? error.message : 'Could not load your display preference.',
      );
    });
    return () => { active = false; };
  }, [setColorScheme]);

  return (
    <SafeAreaProvider>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <SafeAreaView
        edges={['top', 'bottom']}
        style={{ flex: 1, backgroundColor: isDarkMode ? '#101814' : '#F8F8F3' }}
      >
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: {
              width: '100%',
              maxWidth: 430,
              alignSelf: 'center',
              backgroundColor: isDarkMode ? '#101814' : '#F8F8F3',
            },
          }}
        />
        {themeLoadError ? (
          <View pointerEvents="box-none" className="absolute left-3 right-3 top-2 z-50">
            <View className="flex-row items-start rounded-xl bg-[#3B2927] px-3 py-2">
              <Text accessibilityRole="alert" className="flex-1 text-[10px] leading-4 text-white">
                {themeLoadError}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Dismiss display preference error"
                onPress={() => setThemeLoadError('')}
                className="ml-2 px-1"
              >
                <Text className="text-sm font-bold text-white">×</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
