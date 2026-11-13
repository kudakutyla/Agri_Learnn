import { Pressable, Text, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useUiText } from '../services/useUiText';

const items = [
  { icon: '⌂', label: 'Dashboard', path: '/manage-courses' },
  { icon: '▯', label: 'Content', path: '/content' },
  { icon: '＋', label: 'Create', path: '/create-module' },
  { icon: '▤', label: 'Analysis', path: '/trainer-analytics' },
  { icon: '○', label: 'Profile', path: '/trainer-profile' },
];

export function CreatorBottomNav() {
  const pathname = usePathname();
  const { t } = useUiText();
  return (
    <View className="h-[76px] flex-row border-t border-[#E1E4DD] bg-white px-1 pb-2 pt-2 dark:border-[#35443A] dark:bg-[#1D2922]">
      {items.map((item) => {
        const active = pathname === item.path;
        const iconColor = active ? 'bg-[#075541] dark:bg-[#8FC6A4]' : 'bg-[#818984] dark:bg-[#AAB6AD]';
        return (
          <Pressable key={item.label} onPress={() => router.push(item.path)} className="flex-1 items-center justify-center gap-1">
            {item.label === 'Profile' ? (
              <View accessibilityLabel="Person" className="h-5 w-5 items-center justify-center">
                <View className={`h-[7px] w-[7px] rounded-full ${iconColor}`} />
                <View className={`mt-[2px] h-[8px] w-[13px] rounded-t-full ${iconColor}`} />
              </View>
            ) : (
              <Text className={`text-xl ${active ? 'text-[#075541] dark:text-[#8FC6A4]' : 'text-[#818984] dark:text-[#AAB6AD]'}`}>{item.icon}</Text>
            )}
            <Text className={`text-[9px] ${active ? 'font-bold text-[#075541] dark:text-[#8FC6A4]' : 'text-[#818984] dark:text-[#AAB6AD]'}`}>{t(item.label)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
