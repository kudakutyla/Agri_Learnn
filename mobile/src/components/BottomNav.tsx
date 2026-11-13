import { Pressable, Text, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { getAppLanguage } from '../services/appLanguage';
import { useAppLanguage } from '../services/useAppLanguage';

export function BottomNav() {
  const pathname = usePathname();
  const { colorScheme } = useColorScheme();
  const { language } = useAppLanguage();
  const copy = getAppLanguage(language);
  const items = [
    { label: copy.home, icon: '⌂', path: '/home' },
    { label: copy.explore, icon: '⌕', path: '/explore' },
    { label: copy.learning, icon: '📖', path: '/learning' },
    { label: copy.passport, icon: '▣', path: '/passport' },
    { label: copy.profile, icon: '○', path: '/dashboard' },
  ];
  const activePathname = pathname === '/opportunities' ? '/learning' : pathname;
  return (
    <View className="h-[76px] flex-row border-t border-[#DDE4DC] bg-white px-1 pb-2 pt-2 dark:border-[#35443A] dark:bg-[#1D2922]">
      {items.map((item) => {
        const active = activePathname === item.path;
        return (
          <Pressable
            key={item.path}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: active }}
            onPress={() => router.replace(item.path)}
            className="flex-1 items-center justify-center gap-1"
          >
            <Text className={`text-xl ${active ? colorScheme === 'dark' ? 'text-[#8FC6A4]' : 'text-agrilearn-green' : 'text-[#818984] dark:text-[#AAB6AD]'}`}>{item.icon}</Text>
            <Text className={`text-[9px] font-semibold ${active ? colorScheme === 'dark' ? 'text-[#8FC6A4]' : 'text-agrilearn-green' : 'text-[#818984] dark:text-[#AAB6AD]'}`}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
