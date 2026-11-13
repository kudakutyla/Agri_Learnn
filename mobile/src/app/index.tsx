import { ImageBackground, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Button } from '../components/Button';

export default function WelcomeScreen() {
  const { width } = useWindowDimensions();
  const headingSize = Math.min(38, Math.max(30, width * 0.095));

  return (
    <View className="flex-1 bg-[#103D2B]">
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1552645388-31461619e5e3?auto=format&fit=crop&w=900&q=85' }}
        className="flex-1"
        resizeMode="cover"
      >
        <View className="absolute inset-0 bg-[#082619]/10" />
        <View className="absolute inset-x-0 bottom-0 top-[35%] bg-[#082619]/80" />
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 px-6 pb-6 pt-4">
            <View className="flex-row items-center gap-2">
              <View className="h-5 w-5 rotate-45 rounded-[5px] border border-white/70" />
              <Text className="text-sm font-bold text-white">AgriLearn</Text>
            </View>
            <View className="mt-auto pt-8">
              <View className="mb-4 self-start rounded-md bg-[#C6A15B] px-2 py-[6px]">
                <Text className="text-[9px] font-extrabold uppercase text-[#103D2B]">AgriSETA Digital 2030 initiative</Text>
              </View>
              <Text
                className="font-extrabold tracking-[-1.7px] text-white"
                style={{ fontSize: headingSize, lineHeight: headingSize * 1.08 }}
              >
                Grow your skills.{'\n'}Grow your future.
              </Text>
              <Text className="mb-6 mt-4 max-w-[330px] text-[15px] leading-[23px] text-white/80">
                Practical agricultural learning, trusted credentials and real opportunities — all in one place.
              </Text>
            </View>
            <View className="gap-3">
              <Button label="Get started" onPress={() => router.push('/login')} gold />
            </View>
          </View>
        </ScrollView>
      </ImageBackground>
    </View>
  );
}
