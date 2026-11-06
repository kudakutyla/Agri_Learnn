import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import '../global.css';

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  return (
    <>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
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
    </>
  );
}
