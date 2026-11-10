import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import '../global.css';

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

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
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
