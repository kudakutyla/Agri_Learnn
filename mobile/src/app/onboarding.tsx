import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button } from '../components/Button';

const slides = [
  {
    eyebrow: 'LEARN',
    title: 'Skills made practical',
    body: 'Build farming knowledge with short lessons, expert-led courses and learning that works in the field.',
    image: 'https://images.unsplash.com/photo-1492496913980-501348b61469?auto=format&fit=crop&w=900&q=85',
  },
  {
    eyebrow: 'ACHIEVE',
    title: 'Show what you know',
    body: 'Complete assessments, earn digital certificates and build a Skills Passport that grows with you.',
    image: 'https://images.unsplash.com/photo-1728137575406-039af3085f37?auto=format&fit=crop&w=900&q=85',
  },
  {
    eyebrow: 'CONNECT',
    title: 'Find your next opportunity',
    body: 'Discover jobs, projects and agricultural businesses looking for people with your skills.',
    image: 'https://images.unsplash.com/photo-1686947078487-a9b8d4857eee?auto=format&fit=crop&w=900&q=85',
  },
];

export default function OnboardingScreen() {
  const [slide, setSlide] = useState(0);
  const current = slides[slide];

  return (
    <View className="flex-1 bg-[#103D2B]">
      <Image source={{ uri: current.image }} className="h-[54%] w-full" resizeMode="cover" />
      <View className="absolute left-[18px] right-[18px] top-[18px] flex-row items-center justify-between">
        <Pressable onPress={() => router.back()} className="h-[42px] w-[42px] items-center justify-center rounded-[14px] border border-white/25 bg-white/15">
          <Text className="text-xl text-white">‹</Text>
        </Pressable>
      </View>
      <View className={`flex-1 rounded-t-[30px] bg-agrilearn-light px-[25px] pb-[34px] pt-[34px] ${slide === 2 ? '-mt-[10px]' : '-mt-[30px]'}`}>
        <Text className="mb-2 text-[10px] font-extrabold tracking-[1.3px] text-agrilearn-green">{current.eyebrow}</Text>
        <Text className="text-[31px] font-extrabold leading-[37px] tracking-[-1px] text-[#103D2B]">{current.title}</Text>
        <Text className="mt-3 min-h-[72px] text-[15px] leading-[24px] text-[#717A74]">{current.body}</Text>
        <View className="my-[27px] flex-row gap-[6px]">
          {slides.map((item, index) => (
            <View key={item.title} className={`h-[7px] rounded-full ${index === slide ? 'w-6 bg-agrilearn-green' : 'w-[7px] bg-[#CBD2CB]'}`} />
          ))}
        </View>
        <Pressable onPress={() => router.push('/register')} className="mb-3 items-center">
          <Text className="font-bold text-agrilearn-green">Skip</Text>
        </Pressable>
        <Button
          label={slide < 2 ? 'Continue' : 'Create my account'}
          onPress={() => slide < 2 ? setSlide(slide + 1) : router.push('/register')}
        />
      </View>
    </View>
  );
}
