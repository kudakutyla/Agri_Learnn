import { Pressable, Text, View } from 'react-native';
import { router, usePathname } from 'expo-router';

const items = [
  { icon: '⌂', label: 'Dashboard', path: '/manage-courses' },
  { icon: '▯', label: 'Content', path: '/content' },
  { icon: '＋', label: 'Create', path: '/create-module' },
  { icon: '▤', label: 'Reviews', path: '/content' },
  { icon: '○', label: 'Profile', path: '/manage-courses' },
];

export function CreatorBottomNav() {
  const pathname = usePathname();
  return (
    <View className="h-[76px] flex-row border-t border-[#E1E4DD] bg-white px-1 pb-2 pt-2">
      {items.map((item) => {
        const active = item.label === 'Content'
          ? pathname === '/content'
          : item.label === 'Dashboard' && pathname === '/manage-courses';
        return (
          <Pressable key={item.label} onPress={() => router.push(item.path)} className="flex-1 items-center justify-center gap-1">
            <Text className={`text-xl ${active ? 'text-[#075541]' : 'text-[#818984]'}`}>{item.icon}</Text>
            <Text className={`text-[9px] ${active ? 'font-bold text-[#075541]' : 'text-[#818984]'}`}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
