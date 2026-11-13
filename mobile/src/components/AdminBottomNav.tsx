import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';

const items = [
  { label: 'Dashboard', icon: '⌂', path: '/admin' as const, enabled: true },
  { label: 'Users', icon: '♙', path: '/admin-users' as const, enabled: true },
  { label: 'Approvals', icon: '✓', path: '/admin-approvals' as const, enabled: true },
  { label: 'Reports', icon: '▥', path: '/admin-reports' as const, enabled: true },
  { label: 'Settings', icon: '⚙', path: '/admin-settings' as const, enabled: true },
];

export function AdminBottomNav({ active }: { active: 'Dashboard' | 'Users' | 'Approvals' | 'Reports' | 'Settings' }) {
  return (
    <View className="h-[66px] flex-row border-t border-[#E0E5DF] bg-white px-1 pb-1 pt-1 dark:border-[#35443A] dark:bg-[#1D2922]">
      {items.map((item) => {
        const selected = item.label === active;
        return (
          <Pressable
            key={item.label}
            accessibilityRole={item.enabled ? 'button' : undefined}
            accessibilityLabel={item.label}
            accessibilityState={{ selected, disabled: !item.enabled }}
            disabled={!item.enabled}
            onPress={() => router.replace(item.path)}
            className="flex-1 items-center justify-center"
          >
            <Text className={`text-[17px] ${selected ? 'text-[#14543E] dark:text-[#8FC6A4]' : 'text-[#89918B] dark:text-[#AAB6AD]'}`}>{item.icon}</Text>
            <Text className={`mt-0.5 text-[8px] ${selected ? 'font-bold text-[#14543E] dark:text-[#8FC6A4]' : 'text-[#89918B] dark:text-[#AAB6AD]'}`}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
