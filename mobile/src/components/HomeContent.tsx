import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View, type ScrollViewInstance } from 'react-native';
import { router } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { api, type Certificate } from '../services/api';
import { getCertificatePoints, getEarnedSkills } from '../services/passport';
import { getStorageItem, setStorageItem } from '../services/storage';
import { BottomNav } from './BottomNav';

const recommendationCards = [
  { title: 'Smart Irrigation Basics', category: 'Crop production', image: 'https://images.unsplash.com/photo-1529583647475-67602abaa6f2?auto=format&fit=crop&w=500&q=80', details: '45 min · Beginner' },
  { title: 'Healthy Herd Essentials', category: 'Livestock', image: 'https://images.unsplash.com/photo-1506349103253-e648563ec8b9?auto=format&fit=crop&w=500&q=80', details: '1.5 hrs · Beginner' },
] as const;
const recommendationStep = 277;

export default function HomeContent() {
  const [name, setName] = useState('Thabo Mokoena');
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [passportLoading, setPassportLoading] = useState(true);
  const [passportError, setPassportError] = useState('');
  const [themeError, setThemeError] = useState('');
  const [activeRecommendation, setActiveRecommendation] = useState(0);
  const [recommendationViewportWidth, setRecommendationViewportWidth] = useState(0);
  const recommendationsRef = useRef<ScrollViewInstance>(null);
  const { colorScheme, setColorScheme } = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  useEffect(() => {
    getStorageItem('agrilearn_name').then((saved) => {
      if (saved) setName(saved);
    });
  }, []);

  useEffect(() => {
    let active = true;
    async function loadPassportSummary() {
      try {
        const result = await api.certificates.list();
        if (active) {
          setCertificates(result.certificates);
          setPassportError('');
        }
      } catch (error) {
        if (active) setPassportError(error instanceof Error ? error.message : 'Could not load passport credentials.');
      } finally {
        if (active) setPassportLoading(false);
      }
    }
    void loadPassportSummary();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    getStorageItem('agrilearn_theme').then((savedTheme) => {
      if (!active) return;
      if (savedTheme === 'light' || savedTheme === 'dark') setColorScheme(savedTheme);
    }).catch((error: unknown) => {
      if (active) setThemeError(error instanceof Error ? error.message : 'Could not load your display preference.');
    });
    return () => { active = false; };
  }, [setColorScheme]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const nextIndex = (activeRecommendation + 1) % recommendationCards.length;
      recommendationsRef.current?.scrollTo({ x: nextIndex * recommendationStep, animated: true });
      setActiveRecommendation(nextIndex);
    }, 5000);
    return () => clearTimeout(timer);
  }, [activeRecommendation]);

  function showRecommendation(index: number) {
    const nextIndex = (index + recommendationCards.length) % recommendationCards.length;
    recommendationsRef.current?.scrollTo({ x: nextIndex * recommendationStep, animated: true });
    setActiveRecommendation(nextIndex);
  }

  const earnedSkills = getEarnedSkills(certificates);
  const certificatePoints = getCertificatePoints(certificates);

  async function toggleTheme() {
    const nextTheme = isDarkMode ? 'light' : 'dark';
    setThemeError('');
    setColorScheme(nextTheme);
    try {
      await setStorageItem('agrilearn_theme', nextTheme);
    } catch (error) {
      setColorScheme(isDarkMode ? 'dark' : 'light');
      setThemeError(error instanceof Error ? error.message : 'Could not save your display preference.');
    }
  }

  return (
    <View className="flex-1 bg-[#F7F8F4] dark:bg-[#101814]">
    <ScrollView className="flex-1" contentContainerClassName="pb-24">
      <View className="bg-[#0B5543] px-5 pb-7 pt-5">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Text className="text-xl text-white">♧</Text>
            <Text className="text-lg font-extrabold text-white">AgriLearn</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open notifications"
              onPress={() => router.push('/notifications')}
              className="relative h-10 w-10 items-center justify-center rounded-[14px] border border-white/20 bg-white/10"
            >
              <Text className="text-lg text-white">🔔</Text>
              <View className="absolute -right-1 -top-1 h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-[#103D2B] bg-[#C6A15B]">
                <Text className="text-[9px] font-extrabold text-[#103D2B]">3</Text>
              </View>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              accessibilityState={{ selected: isDarkMode }}
              onPress={() => { void toggleTheme(); }}
              className="h-10 w-10 items-center justify-center rounded-[14px] border border-white/20 bg-white/10"
            >
              <Text className="text-lg text-white">{isDarkMode ? '☀' : '☾'}</Text>
            </Pressable>
          </View>
        </View>
        {themeError ? <Text accessibilityRole="alert" className="mt-2 text-[10px] text-white">{themeError}</Text> : null}
        <View className="mt-8 flex-row items-center justify-between">
          <View>
            <Text className="text-[10px] font-bold uppercase tracking-[1px] text-white/70">Good morning</Text>
            <Text className="mt-1 text-[22px] font-extrabold text-white">{name}</Text>
            <Text className="mt-1 text-xs text-white/70">Keep growing your agricultural knowledge.</Text>
          </View>
          <View className="h-11 w-11 items-center justify-center rounded-full bg-[#F3C64A]">
            <Text className="font-extrabold text-[#5E4A15]">{name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</Text>
          </View>
        </View>
      </View>
      <View className="bg-[#F7F8F4] px-5 pt-7 dark:bg-[#101814]">
        <Text className="text-[10px] font-bold uppercase tracking-[1.2px] text-[#687069]">Continue learning</Text>
        <Text className="mt-1 text-lg font-extrabold text-[#252B27] dark:text-[#F1F4F1]">Pick up where you left off</Text>
        <Pressable onPress={() => router.push('/learning')} className="mt-4 h-[235px] overflow-hidden rounded-[21px] bg-[#255B43]">
          <Image source={{ uri: 'https://images.unsplash.com/photo-1492496913980-501348b61469?auto=format&fit=crop&w=900&q=85' }} className="absolute inset-0 h-full w-full" resizeMode="cover" />
          <View className="absolute inset-0 bg-black/30" />
          <View className="flex-1 justify-end p-4">
            <Text className="self-start rounded-full bg-[#F7C84B] px-2 py-1 text-[8px] font-extrabold text-[#55410F]">IN PROGRESS</Text>
            <Text className="mt-2 text-base font-extrabold text-white">Soil Health Fundamentals</Text>
            <Text className="mt-1 text-[10px] text-white/80">Lesson 4 of 6 · Understanding soil pH</Text>
            <View className="mt-3 h-[6px] overflow-hidden rounded-full bg-white/35"><View className="h-full w-[62%] rounded-full bg-[#F7C84B]" /></View>
            <View className="mt-2 flex-row items-center justify-between">
              <Text className="text-[10px] text-white">62% complete</Text>
              <View className="h-8 w-8 items-center justify-center rounded-full bg-[#F7C84B]"><Text className="text-sm text-[#183F31]">▶</Text></View>
            </View>
          </View>
        </Pressable>
        <View className="mt-7 flex-row items-center justify-between">
          <Text className="text-base font-extrabold text-[#252B27] dark:text-[#F1F4F1]">Recommended for you</Text>
          <Pressable onPress={() => router.push('/explore')}><Text className="text-xs font-bold text-agrilearn-green">View all</Text></Pressable>
        </View>
        <ScrollView
          ref={recommendationsRef}
          accessibilityLabel="Recommended courses. Swipe horizontally to browse."
          className="mt-3"
          contentContainerClassName="gap-3 pr-5"
          decelerationRate="fast"
          horizontal
          onLayout={(event) => setRecommendationViewportWidth(event.nativeEvent.layout.width)}
          onMomentumScrollEnd={(event) => {
            const index = Math.round(event.nativeEvent.contentOffset.x / recommendationStep);
            setActiveRecommendation(Math.min(index, recommendationCards.length - 1));
          }}
          scrollEventThrottle={16}
          snapToAlignment="start"
          snapToInterval={recommendationStep}
          showsHorizontalScrollIndicator={false}
        >
          {recommendationCards.map((course) => (
            <Pressable key={course.title} onPress={() => router.push('/explore')} className="w-[265px] shrink-0 flex-row overflow-hidden rounded-2xl border border-[#E1E5DF] bg-white dark:border-[#35443A] dark:bg-[#1D2922]">
              <Image source={{ uri: course.image }} className="h-[104px] w-[94px]" resizeMode="cover" />
              <View className="p-3">
                <Text className="text-[8px] font-bold uppercase text-[#687069] dark:text-[#AAB6AD]">{course.category}</Text>
                <Text className="mt-1 text-xs font-extrabold text-[#252B27] dark:text-[#F1F4F1]">{course.title}</Text>
                <Text className="mt-1 text-[9px] text-[#717A74] dark:text-[#B5C0B7]">{course.details}</Text>
              </View>
            </Pressable>
          ))}
          <View style={{ width: Math.max(0, recommendationViewportWidth - 265) }} />
        </ScrollView>
        <View className="mt-1 flex-row items-center justify-center">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous recommended course"
            onPress={() => showRecommendation(activeRecommendation - 1)}
            className="h-9 w-9 items-center justify-center"
          >
            <Text className="text-lg font-bold text-[#14543E]">‹</Text>
          </Pressable>
          {recommendationCards.map((course, index) => (
            <Pressable
              key={course.title}
              accessibilityRole="button"
              accessibilityLabel={`Show ${course.title}`}
              accessibilityState={{ selected: activeRecommendation === index }}
              onPress={() => showRecommendation(index)}
              className="h-9 min-w-9 items-center justify-center px-2"
            >
              <View className={`h-2.5 w-2.5 rounded-full ${activeRecommendation === index ? 'bg-[#14543E]' : 'bg-[#C8D1C9]'}`} />
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next recommended course"
            onPress={() => showRecommendation(activeRecommendation + 1)}
            className="h-9 w-9 items-center justify-center"
          >
            <Text className="text-lg font-bold text-[#14543E]">›</Text>
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Skills Passport"
          onPress={() => router.push('/passport')}
          className="mt-6 rounded-[20px] bg-[#103D2B] p-5"
        >
          <View className="flex-row justify-between"><Text className="text-xl text-[#C6A15B]">▣</Text><Text className="rounded-md bg-[#F5EAD4] px-2 py-1 text-[8px] font-extrabold text-[#72531D]">SKILLS PASSPORT</Text></View>
          <Text className="mt-4 text-lg font-extrabold text-white">
            {passportLoading ? 'Loading your passport' : earnedSkills.length ? 'Your skills are growing' : 'Start building your skills'}
          </Text>
          <Text className="mt-1 text-[10px] text-white/65">
            {passportError
              ? 'Passport details unavailable'
              : passportLoading
                ? 'Loading earned skills and credentials…'
                : `${earnedSkills.length} ${earnedSkills.length === 1 ? 'skill' : 'skills'} · ${certificates.length} ${certificates.length === 1 ? 'certificate' : 'certificates'} · ${certificatePoints} learning points`}
          </Text>
          <View className="mt-4 flex-row">
            {earnedSkills.slice(0, 4).map((skill) => {
              const initials = skill.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
              return (
                <View key={skill.name} className="-mr-1 h-8 w-8 items-center justify-center rounded-full border-2 border-[#103D2B] bg-[#8FAF91]"><Text className="text-[9px] font-extrabold text-[#103D2B]">{initials}</Text></View>
              );
            })}
            {earnedSkills.length > 4 ? (
              <View className="-mr-1 h-8 w-8 items-center justify-center rounded-full border-2 border-[#103D2B] bg-[#8FAF91]">
                <Text className="text-[9px] font-extrabold text-[#103D2B]">+{earnedSkills.length - 4}</Text>
              </View>
            ) : null}
          </View>
          <View className="mt-4 min-h-12 flex-row items-center justify-center rounded-[14px] border border-white/15 bg-white/10"><Text className="font-bold text-white">View my passport →</Text></View>
        </Pressable>
        <View className="mt-[18px] flex-row items-center rounded-2xl border border-[#DDE4DC] bg-white p-3 dark:border-[#35443A] dark:bg-[#1D2922]">
          <View className="h-[42px] w-[42px] items-center justify-center rounded-[13px] bg-[#F5EAD4]"><Text className="text-xl text-[#806022]">♕</Text></View>
          <View className="ml-3 flex-1"><Text className="text-[8px] font-extrabold tracking-[0.7px] text-[#806022]">NEW ACHIEVEMENT</Text><Text className="mt-1 text-xs font-extrabold text-[#252B27] dark:text-[#F1F4F1]">Consistent Grower</Text><Text className="mt-1 text-[9px] text-[#717A74] dark:text-[#B5C0B7]">Completed lessons 3 weeks in a row</Text></View>
        </View>
      </View>
    </ScrollView>
    <BottomNav />
    </View>
  );
}
