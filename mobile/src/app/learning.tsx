import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ImageBackground, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { BottomNav } from '../components/BottomNav';
import { courses } from '../data';
import { api, type Certificate } from '../services/api';

const courseImages = [
  'https://images.unsplash.com/photo-1492496913980-501348b61469?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1529583647475-67602abaa6f2?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1506349103253-e648563ec8b9?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1492496913980-501348b61469?auto=format&fit=crop&w=900&q=85',
];

const tabs = ['In progress', 'Completed', 'Saved'] as const;
type LearningTab = (typeof tabs)[number];

function durationInMinutes(duration: string) {
  const hours = duration.match(/(\d+)\s*h/i);
  const minutes = duration.match(/(\d+)\s*m/i);
  return Number(hours?.[1] ?? 0) * 60 + Number(minutes?.[1] ?? 0);
}

export default function LearningScreen() {
  const [selectedTab, setSelectedTab] = useState<LearningTab>('In progress');
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loadingCertificates, setLoadingCertificates] = useState(true);
  const [certificateError, setCertificateError] = useState('');
  const activeCourses = useMemo(() => courses.filter((course) => course.progress > 0 && course.progress < 100), []);
  const visibleCourses = selectedTab === 'In progress' ? activeCourses : [];
  const averageProgress = activeCourses.length
    ? Math.round(activeCourses.reduce((total, course) => total + course.progress, 0) / activeCourses.length)
    : 0;
  const minutesLearned = activeCourses.reduce(
    (total, course) => total + durationInMinutes(course.duration) * course.progress / 100,
    0,
  );
  const hoursLearned = (minutesLearned / 60).toFixed(1).replace(/\.0$/, '');

  useEffect(() => {
    let active = true;
    api.certificates.list()
      .then((result) => {
        if (active) setCertificates(result.certificates);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setCertificateError(loadError instanceof Error ? loadError.message : 'Could not load completed courses.');
        }
      })
      .finally(() => {
        if (active) setLoadingCertificates(false);
      });
    return () => { active = false; };
  }, []);

  async function retryLoadCertificates() {
    setLoadingCertificates(true);
    setCertificateError('');
    try {
      const result = await api.certificates.list();
      setCertificates(result.certificates);
    } catch (loadError) {
      setCertificateError(loadError instanceof Error ? loadError.message : 'Could not load completed courses.');
    } finally {
      setLoadingCertificates(false);
    }
  }

  return (
    <View className="flex-1 bg-[#F7F7F2] dark:bg-[#101814]">
      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-6 pt-5">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-[22px] font-extrabold text-[#17261E] dark:text-[#F1F4F1]">My learning</Text>
            <Text className="mt-0.5 text-[10px] text-[#7B837D] dark:text-[#AAB6AD]">Your courses and saved lessons</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open agricultural opportunities"
            onPress={() => router.push('/opportunities')}
            className="h-10 w-10 items-center justify-center rounded-[14px] border border-[#E0E5DF] bg-white dark:border-[#35443A] dark:bg-[#1D2922]"
          >
            <Text className="text-lg font-bold text-[#14543E] dark:text-[#8FC6A4]">↗</Text>
          </Pressable>
        </View>

        <View className="mt-5 flex-row rounded-xl bg-[#E8EBE6] p-1 dark:bg-[#25342B]">
          {tabs.map((tab) => {
            const selected = selectedTab === tab;
            return (
              <Pressable
                key={tab}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => {
                  setSelectedTab(tab);
                  if (tab === 'Completed') void retryLoadCertificates();
                }}
                className={`h-8 flex-1 items-center justify-center rounded-lg ${selected ? 'bg-white dark:bg-[#34483A]' : ''}`}
              >
                <Text className={`text-[9px] ${selected ? 'font-extrabold text-[#14543E] dark:text-[#B7E2C2]' : 'font-medium text-[#687069] dark:text-[#AAB6AD]'}`}>
                  {tab}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {selectedTab === 'In progress' && (
          <View className="mt-3 flex-row gap-2">
            {[
              { value: String(activeCourses.length), label: 'Active courses' },
              { value: `${averageProgress}%`, label: 'Average progress' },
              { value: `${hoursLearned}h`, label: 'Time learned' },
            ].map((stat) => (
              <View key={stat.label} className="h-[54px] flex-1 items-center justify-center rounded-xl bg-[#EAF1E8]">
                <Text className="text-[15px] font-extrabold text-[#14543E]">{stat.value}</Text>
                <Text className="mt-0.5 text-[7px] text-[#7B837D]">{stat.label}</Text>
              </View>
            ))}
          </View>
        )}

        {selectedTab === 'Completed' ? (
          loadingCertificates ? (
            <View className="mt-5 items-center rounded-2xl border border-[#E5E8E2] bg-white px-6 py-8 dark:border-[#35443A] dark:bg-[#1D2922]">
              <ActivityIndicator color="#14543E" />
              <Text className="mt-2 text-[10px] text-[#7B837D] dark:text-[#AAB6AD]">Loading your certificates…</Text>
            </View>
          ) : certificateError ? (
            <View accessibilityRole="alert" className="mt-5 items-center rounded-2xl border border-[#E8D2CD] bg-white px-6 py-8 dark:border-[#35443A] dark:bg-[#1D2922]">
              <Text className="text-sm font-extrabold text-[#9A5147]">Could not load completed courses</Text>
              <Text className="mt-1.5 text-center text-[10px] leading-4 text-[#7B837D] dark:text-[#AAB6AD]">{certificateError}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => { void retryLoadCertificates(); }}
                className="mt-4 rounded-lg bg-[#14543E] px-4 py-2.5"
              >
                <Text className="text-[10px] font-bold text-white">Try again</Text>
              </Pressable>
            </View>
          ) : certificates.length > 0 ? (
            certificates.map((certificate) => {
              const courseTitle = certificate.courseTitle
                ?? certificate.title?.replace(/\s+Certificate$/i, '')
                ?? 'Completed course';
              return (
                <View key={certificate.id} className="mt-3 overflow-hidden rounded-[16px] border border-[#E5E8E2] bg-white dark:border-[#35443A] dark:bg-[#1D2922]">
                  <View className="h-[72px] items-center justify-center bg-[#EAF1E8] dark:bg-[#25342B]">
                    <Text className="text-2xl text-[#14543E] dark:text-[#8FC6A4]">✓</Text>
                  </View>
                  <View className="p-3">
                    <Text className="self-start rounded-md bg-[#EAF1E8] px-1.5 py-1 text-[9px] font-extrabold tracking-wide text-[#477E62] dark:bg-[#25342B] dark:text-[#B7E2C2]">
                      COMPLETED
                    </Text>
                    <Text className="mt-1.5 text-[14px] font-extrabold text-[#252B27] dark:text-[#F1F4F1]">{courseTitle}</Text>
                    {certificate.skills && certificate.skills.length > 0 && (
                      <View className="mt-2 flex-row flex-wrap gap-1">
                        {certificate.skills.map((skill) => (
                          <Text
                            key={skill}
                            className="rounded-full bg-[#EAF1E8] px-2 py-1 text-[9px] font-semibold text-[#477E62] dark:bg-[#25342B] dark:text-[#B7E2C2]"
                          >
                            {skill}
                          </Text>
                        ))}
                      </View>
                    )}
                    <View className="mt-3 flex-row items-center justify-between">
                      <Text className="text-[9px] text-[#858C87] dark:text-[#AAB6AD]">Certificate earned</Text>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`View ${courseTitle} certificate`}
                        onPress={() => router.push('/passport')}
                        className="h-8 flex-row items-center justify-center rounded-lg bg-[#14543E] px-3"
                      >
                        <Text className="text-[10px] font-extrabold text-white">View certificate</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })
          ) : (
            <View className="mt-5 items-center rounded-2xl border border-[#E5E8E2] bg-white px-6 py-8 dark:border-[#35443A] dark:bg-[#1D2922]">
              <Text className="text-sm font-extrabold text-[#252B27] dark:text-[#F1F4F1]">No completed courses yet</Text>
              <Text className="mt-1.5 text-center text-[10px] leading-4 text-[#7B837D] dark:text-[#AAB6AD]">
                Courses you pass will appear here with their certificates.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.replace('/explore')}
                className="mt-4 rounded-lg bg-[#14543E] px-4 py-2.5"
              >
                <Text className="text-[10px] font-bold text-white">Explore courses</Text>
              </Pressable>
            </View>
          )
        ) : visibleCourses.length > 0 ? (
          visibleCourses.map((course) => {
            const originalIndex = courses.findIndex((item) => item.id === course.id);
            const nextLessonIndex = Math.min(
              Math.floor((course.progress / 100) * course.lessonTitles.length),
              course.lessonTitles.length - 1,
            );
            const nextLesson = course.lessonTitles[nextLessonIndex];
            const status = course.progress >= 50 ? 'IN PROGRESS' : 'JUST STARTED';

            return (
              <View key={course.id} className="mt-3 overflow-hidden rounded-[16px] border border-[#E5E8E2] bg-white dark:border-[#35443A] dark:bg-[#1D2922]">
                <ImageBackground
                  source={{ uri: courseImages[originalIndex] }}
                  className="h-[88px] bg-[#DDEBDD]"
                  resizeMode="cover"
                />
                <View className="p-3">
                  <Text className="self-start rounded-md bg-[#EAF1E8] px-1.5 py-1 text-[9px] font-extrabold tracking-wide text-[#477E62]">
                    {status}
                  </Text>
                  <Text numberOfLines={1} className="mt-1.5 text-[14px] font-extrabold text-[#252B27] dark:text-[#F1F4F1]">{course.title}</Text>
                  <Text numberOfLines={1} className="mt-0.5 text-[10px] text-[#858C87] dark:text-[#AAB6AD]">
                    Next: {nextLesson}
                  </Text>
                  {course.skills.length > 0 && (
                    <View className="mt-2 flex-row flex-wrap gap-1">
                      {course.skills.map((skill) => (
                        <Text
                          key={skill}
                          className="rounded-full bg-[#EAF1E8] px-2 py-1 text-[9px] font-semibold text-[#477E62] dark:bg-[#25342B] dark:text-[#B7E2C2]"
                        >
                          {skill}
                        </Text>
                      ))}
                    </View>
                  )}
                  <View className="mt-2 h-1 overflow-hidden rounded-full bg-[#DDE5DE]">
                    <View className="h-full rounded-full bg-[#14543E]" style={{ width: `${course.progress}%` }} />
                  </View>
                  <View className="mt-1.5 flex-row items-center justify-between">
                    <Text className="text-[9px] text-[#858C87] dark:text-[#AAB6AD]">{course.progress}% complete</Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Continue ${course.title}`}
                      onPress={() => router.push({ pathname: '/course-content', params: { courseId: course.id } })}
                      className="h-7 flex-row items-center justify-center rounded-lg bg-[#14543E] px-3"
                    >
                      <Text className="text-[10px] font-extrabold text-white">Continue  ▷</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })
        ) : (
          <View className="mt-5 items-center rounded-2xl border border-[#E5E8E2] bg-white px-6 py-8 dark:border-[#35443A] dark:bg-[#1D2922]">
            <Text className="text-sm font-extrabold text-[#252B27] dark:text-[#F1F4F1]">
              {selectedTab === 'Saved' ? 'No saved courses yet' : 'No courses in progress'}
            </Text>
            <Text className="mt-1.5 text-center text-[9px] leading-4 text-[#7B837D] dark:text-[#AAB6AD]">
              {selectedTab === 'Saved'
                ? 'Save courses you want to return to and they’ll appear here.'
                : 'Courses you start will appear here.'}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace('/explore')}
              className="mt-4 rounded-lg bg-[#14543E] px-4 py-2.5"
            >
              <Text className="text-[9px] font-bold text-white">Explore courses</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
      <BottomNav />
    </View>
  );
}
