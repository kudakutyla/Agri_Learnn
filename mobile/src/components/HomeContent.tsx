import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View, type ScrollViewInstance } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { api, type Certificate, type CourseProgressSummary, type Profile } from '../services/api';
import { getDashboardLanguage } from '../services/dashboardLanguage';
import { getCertificatePoints, getEarnedSkills } from '../services/passport';
import { setStorageItem } from '../services/storage';
import { BottomNav } from './BottomNav';

const recommendationImages = [
  'https://images.unsplash.com/photo-1529583647475-67602abaa6f2?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1506349103253-e648563ec8b9?auto=format&fit=crop&w=500&q=80',
] as const;
const recommendationStep = 277;
const recommendationCount = recommendationImages.length;

export default function HomeContent() {
  const [name, setName] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState('');
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [learningCourses, setLearningCourses] = useState<CourseProgressSummary[]>([]);
  const [learningLoading, setLearningLoading] = useState(true);
  const [learningError, setLearningError] = useState('');
  const [passportLoading, setPassportLoading] = useState(true);
  const [passportError, setPassportError] = useState('');
  const [themeError, setThemeError] = useState('');
  const [activeRecommendation, setActiveRecommendation] = useState(0);
  const [recommendationViewportWidth, setRecommendationViewportWidth] = useState(0);
  const recommendationsRef = useRef<ScrollViewInstance>(null);
  const { colorScheme, setColorScheme } = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  useFocusEffect(useCallback(() => {
    let active = true;
    api.profile.get()
      .then(({ user }) => {
        if (!active) return;
        setProfile(user);
        setName(user.name);
        setProfileError('');
      })
      .catch((error: unknown) => {
        if (active) setProfileError(error instanceof Error ? error.message : 'Could not load your profile.');
      });
    return () => { active = false; };
  }, []));

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
    api.learningProgress()
      .then((result) => {
        if (active) {
          setLearningCourses(result.courses);
          setLearningError('');
        }
      })
      .catch((error: unknown) => {
        if (active) setLearningError(error instanceof Error ? error.message : 'Could not load your course progress.');
      })
      .finally(() => {
        if (active) setLearningLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const nextIndex = (activeRecommendation + 1) % recommendationCount;
      recommendationsRef.current?.scrollTo({ x: nextIndex * recommendationStep, animated: true });
      setActiveRecommendation(nextIndex);
    }, 5000);
    return () => clearTimeout(timer);
  }, [activeRecommendation]);

  function showRecommendation(index: number) {
    const nextIndex = (index + recommendationCount) % recommendationCount;
    recommendationsRef.current?.scrollTo({ x: nextIndex * recommendationStep, animated: true });
    setActiveRecommendation(nextIndex);
  }

  const earnedSkills = getEarnedSkills(certificates);
  const dashboardLanguage = getDashboardLanguage(profile?.language);
  const recommendationCards = dashboardLanguage.recommendations.map((course, index) => ({
    ...course,
    image: recommendationImages[index],
  }));
  const certificatePoints = getCertificatePoints(certificates);
  const certifiedCourseIds = new Set(
    certificates.map((certificate) => certificate.courseId).filter((courseId): courseId is string => Boolean(courseId)),
  );
  const currentCourse = learningCourses.find((item) => !certifiedCourseIds.has(item.course.id));

  async function retryLoadLearningProgress() {
    setLearningLoading(true);
    setLearningError('');
    try {
      const result = await api.learningProgress();
      setLearningCourses(result.courses);
    } catch (error) {
      setLearningError(error instanceof Error ? error.message : 'Could not load your course progress.');
    } finally {
      setLearningLoading(false);
    }
  }

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
      <View className="bg-[#0B5543] px-5 pb-5 pt-4">
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
        {profileError ? <Text accessibilityRole="alert" className="mt-2 text-[10px] text-white">{profileError}</Text> : null}
        <View className="mt-5 flex-row items-center justify-between">
          <View>
            <Text className="text-[10px] font-bold uppercase tracking-[1px] text-white/70">{dashboardLanguage.goodMorning}</Text>
            <Text className="mt-1 text-xl font-extrabold text-white">{name}</Text>
            <Text className="mt-1 text-xs text-white/70">{dashboardLanguage.learningEncouragement}</Text>
          </View>
          <View className="h-11 w-11 items-center justify-center rounded-full bg-[#F3C64A]">
            <Text className="font-extrabold text-[#5E4A15]">{name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</Text>
          </View>
        </View>
      </View>
      <View className="bg-[#F7F8F4] px-5 pt-5 dark:bg-[#101814]">
        <Text className="text-[10px] font-bold uppercase tracking-[1.2px] text-[#687069]">{dashboardLanguage.continueLearning}</Text>
        <Text className="mt-1 text-lg font-extrabold text-[#252B27] dark:text-[#F1F4F1]">{dashboardLanguage.pickUpWhereLeftOff}</Text>
        {learningLoading ? (
          <View className="mt-4 h-[150px] items-center justify-center rounded-[21px] bg-[#EAF1E8] dark:bg-[#1D2922]">
            <ActivityIndicator color="#14543E" />
            <Text className="mt-2 text-[10px] text-[#687069] dark:text-[#AAB6AD]">{dashboardLanguage.loadingLearning}</Text>
          </View>
        ) : learningError ? (
          <View accessibilityRole="alert" className="mt-4 items-center rounded-[21px] border border-[#E8D2CD] bg-white px-5 py-7 dark:border-[#35443A] dark:bg-[#1D2922]">
            <Text className="text-center text-[11px] font-bold text-[#9A5147]">{learningError}</Text>
            <Pressable accessibilityRole="button" onPress={() => { void retryLoadLearningProgress(); }} className="mt-3 rounded-lg bg-[#14543E] px-4 py-2">
              <Text className="text-[10px] font-bold text-white">{dashboardLanguage.tryAgain}</Text>
            </Pressable>
          </View>
        ) : currentCourse ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={dashboardLanguage.continueCourse(currentCourse.course.title)}
            onPress={() => router.push({ pathname: '/course-content', params: { courseId: currentCourse.course.id } })}
            className="mt-4 h-[205px] overflow-hidden rounded-[21px] bg-[#255B43]"
          >
            {currentCourse.course.coverImage
              ? <Image source={{ uri: currentCourse.course.coverImage }} className="absolute inset-0 h-full w-full" resizeMode="cover" />
              : <View className="absolute inset-0 bg-[#255B43]" />}
            <View className="absolute inset-0 bg-black/30" />
            <View className="flex-1 justify-end p-4">
              <Text className="self-start rounded-full bg-[#F7C84B] px-2 py-1 text-[8px] font-extrabold text-[#55410F]">
                {currentCourse.progressPercent === 100
                  ? dashboardLanguage.assessmentPending
                  : currentCourse.progressPercent > 0
                    ? dashboardLanguage.inProgress
                    : dashboardLanguage.enrolled}
              </Text>
              <Text numberOfLines={2} className="mt-2 text-base font-extrabold text-white">{currentCourse.course.title}</Text>
              <Text numberOfLines={1} className="mt-1 text-[10px] text-white/80">
                {dashboardLanguage.lessonProgress(currentCourse.resumeLessonIndex + 1, currentCourse.course.lessons?.length ?? 0)}
                {currentCourse.course.lessons?.[currentCourse.resumeLessonIndex]?.title
                  ? ` · ${currentCourse.course.lessons[currentCourse.resumeLessonIndex].title}`
                  : ''}
              </Text>
              <View className="mt-3 h-[6px] overflow-hidden rounded-full bg-white/35">
                <View className="h-full rounded-full bg-[#F7C84B]" style={{ width: `${currentCourse.progressPercent}%` }} />
              </View>
              <View className="mt-2 flex-row items-center justify-between">
                <Text className="text-[10px] text-white">
                  {currentCourse.progressPercent === 100
                    ? dashboardLanguage.lessonsCompleteAssessmentPending
                    : dashboardLanguage.percentComplete(currentCourse.progressPercent)}
                </Text>
                <View className="h-8 w-8 items-center justify-center rounded-full bg-[#F7C84B]"><Text className="text-sm text-[#183F31]">▶</Text></View>
              </View>
            </View>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/explore')}
            className="mt-4 items-center rounded-[21px] border border-[#DDE4DC] bg-white px-6 py-8 dark:border-[#35443A] dark:bg-[#1D2922]"
          >
            <Text className="text-sm font-extrabold text-[#252B27] dark:text-[#F1F4F1]">{dashboardLanguage.noModulesInProgress}</Text>
            <Text className="mt-1 text-center text-[10px] text-[#717A74] dark:text-[#AAB6AD]">
              {dashboardLanguage.enrolCourseHint}
            </Text>
            <Text className="mt-3 text-[10px] font-bold text-[#14543E] dark:text-[#8FC6A4]">{dashboardLanguage.exploreCourses}</Text>
          </Pressable>
        )}
        <View className="mt-5 flex-row items-center justify-between">
          <Text className="text-base font-extrabold text-[#252B27] dark:text-[#F1F4F1]">{dashboardLanguage.recommendedForYou}</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push('/explore')}><Text className="text-xs font-bold text-agrilearn-green">{dashboardLanguage.viewAll}</Text></Pressable>
        </View>
        <ScrollView
          ref={recommendationsRef}
          accessibilityLabel={dashboardLanguage.recommendedCoursesHint}
          className="mt-3"
          contentContainerClassName="gap-3 pr-5"
          decelerationRate="fast"
          horizontal
          onLayout={(event) => setRecommendationViewportWidth(event.nativeEvent.layout.width)}
          onMomentumScrollEnd={(event) => {
            const index = Math.round(event.nativeEvent.contentOffset.x / recommendationStep);
            setActiveRecommendation(Math.min(index, recommendationCount - 1));
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
            accessibilityLabel={dashboardLanguage.previousRecommendedCourse}
            onPress={() => showRecommendation(activeRecommendation - 1)}
            className="h-9 w-9 items-center justify-center"
          >
            <Text className="text-lg font-bold text-[#14543E]">‹</Text>
          </Pressable>
          {recommendationCards.map((course, index) => (
            <Pressable
              key={course.title}
              accessibilityRole="button"
              accessibilityLabel={dashboardLanguage.showCourse(course.title)}
              accessibilityState={{ selected: activeRecommendation === index }}
              onPress={() => showRecommendation(index)}
              className="h-9 min-w-9 items-center justify-center px-2"
            >
              <View className={`h-2.5 w-2.5 rounded-full ${activeRecommendation === index ? 'bg-[#14543E]' : 'bg-[#C8D1C9]'}`} />
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={dashboardLanguage.nextRecommendedCourse}
            onPress={() => showRecommendation(activeRecommendation + 1)}
            className="h-9 w-9 items-center justify-center"
          >
            <Text className="text-lg font-bold text-[#14543E]">›</Text>
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={dashboardLanguage.skillsPassport}
          onPress={() => router.push('/passport')}
          className="mt-5 rounded-[20px] bg-[#103D2B] p-5"
        >
          <View className="flex-row justify-between"><Text className="text-xl text-[#C6A15B]">▣</Text><Text className="rounded-md bg-[#F5EAD4] px-2 py-1 text-[8px] font-extrabold text-[#72531D]">{dashboardLanguage.skillsPassport}</Text></View>
          <Text className="mt-4 text-lg font-extrabold text-white">
            {passportLoading
              ? dashboardLanguage.loadingPassport
              : earnedSkills.length
                ? dashboardLanguage.skillsGrowing
                : dashboardLanguage.startBuildingSkills}
          </Text>
          <Text className="mt-1 text-[10px] text-white/65">
            {passportError
              ? dashboardLanguage.passportUnavailable
              : passportLoading
                ? dashboardLanguage.loadingSkills
                : `${dashboardLanguage.skillsCount(earnedSkills.length)} · ${dashboardLanguage.certificatesCount(certificates.length)} · ${dashboardLanguage.learningPointsCount(certificatePoints)}`}
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
          <View className="mt-4 min-h-12 flex-row items-center justify-center rounded-[14px] border border-white/15 bg-white/10"><Text className="font-bold text-white">{dashboardLanguage.viewMyPassport}</Text></View>
        </Pressable>
      </View>
    </ScrollView>
    <BottomNav />
    </View>
  );
}
