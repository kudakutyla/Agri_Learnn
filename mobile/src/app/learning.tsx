import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ImageBackground, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { BottomNav } from '../components/BottomNav';
import { api, type Certificate, type CourseProgressSummary } from '../services/api';
import { getAppLanguage } from '../services/appLanguage';
import { useAppLanguage } from '../services/useAppLanguage';

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
  const { language, languageError } = useAppLanguage();
  const copy = getAppLanguage(language);
  const [selectedTab, setSelectedTab] = useState<LearningTab>('In progress');
  const [learningCourses, setLearningCourses] = useState<CourseProgressSummary[]>([]);
  const [loadingLearning, setLoadingLearning] = useState(true);
  const [learningError, setLearningError] = useState('');
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loadingCertificates, setLoadingCertificates] = useState(true);
  const [certificateError, setCertificateError] = useState('');
  const activeCourses = useMemo(() => {
    const certifiedCourseIds = new Set(
      certificates.map((certificate) => certificate.courseId).filter((courseId): courseId is string => Boolean(courseId)),
    );
    return learningCourses.filter((course) => !certifiedCourseIds.has(course.course.id));
  }, [certificates, learningCourses]);
  const visibleCourses = selectedTab === 'In progress' ? activeCourses : [];
  const averageProgress = activeCourses.length
    ? Math.round(activeCourses.reduce((total, course) => total + course.progressPercent, 0) / activeCourses.length)
    : 0;
  const minutesLearned = activeCourses.reduce(
    (total, course) => total + (course.course.lessons ?? []).reduce(
      (minutes, lesson, index) => minutes + (course.completedLessons.includes(index) ? durationInMinutes(lesson.duration) : 0),
      0,
    ),
    0,
  );
  const hoursLearned = (minutesLearned / 60).toFixed(1).replace(/\.0$/, '');

  useEffect(() => {
    let active = true;
    api.learningProgress()
      .then((result) => {
        if (active) setLearningCourses(result.courses);
      })
      .catch((loadError: unknown) => {
        if (active) setLearningError(loadError instanceof Error ? loadError.message : 'Could not load your course progress.');
      })
      .finally(() => {
        if (active) setLoadingLearning(false);
      });
    return () => { active = false; };
  }, []);

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

  async function retryLoadLearning() {
    setLoadingLearning(true);
    setLearningError('');
    try {
      const result = await api.learningProgress();
      setLearningCourses(result.courses);
    } catch (loadError) {
      setLearningError(loadError instanceof Error ? loadError.message : 'Could not load your course progress.');
    } finally {
      setLoadingLearning(false);
    }
  }

  return (
    <View className="flex-1 bg-[#F7F7F2] dark:bg-[#101814]">
      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-6 pt-5">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-[22px] font-extrabold text-[#17261E] dark:text-[#F1F4F1]">{copy.myLearning}</Text>
            <Text className="mt-0.5 text-[10px] text-[#7B837D] dark:text-[#AAB6AD]">{copy.learningSubtitle}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.opportunities}
            onPress={() => router.push('/opportunities')}
            className="h-10 w-10 items-center justify-center rounded-[14px] border border-[#E0E5DF] bg-white dark:border-[#35443A] dark:bg-[#1D2922]"
          >
            <Text className="text-lg font-bold text-[#14543E] dark:text-[#8FC6A4]">↗</Text>
          </Pressable>
        </View>

        {languageError ? <Text accessibilityRole="alert" className="mt-3 text-[10px] text-[#9A5147]">{languageError}</Text> : null}
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
                  {tab === 'In progress' ? copy.inProgress : tab === 'Completed' ? copy.completed : copy.saved}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {selectedTab === 'In progress' && !loadingLearning && !learningError && (
          <View className="mt-3 flex-row gap-2">
            {[
              { value: String(activeCourses.length), label: copy.activeCourses },
              { value: `${averageProgress}%`, label: copy.averageProgress },
              { value: `${hoursLearned}h`, label: copy.timeLearned },
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
              <Text className="mt-2 text-[10px] text-[#7B837D] dark:text-[#AAB6AD]">{copy.loadingCertificates}</Text>
            </View>
          ) : certificateError ? (
            <View accessibilityRole="alert" className="mt-5 items-center rounded-2xl border border-[#E8D2CD] bg-white px-6 py-8 dark:border-[#35443A] dark:bg-[#1D2922]">
              <Text className="text-sm font-extrabold text-[#9A5147]">{copy.couldNotLoadCompleted}</Text>
              <Text className="mt-1.5 text-center text-[10px] leading-4 text-[#7B837D] dark:text-[#AAB6AD]">{certificateError}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => { void retryLoadCertificates(); }}
                className="mt-4 rounded-lg bg-[#14543E] px-4 py-2.5"
              >
                <Text className="text-[10px] font-bold text-white">{copy.tryAgain}</Text>
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
                      {copy.completed.toUpperCase()}
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
                      <Text className="text-[9px] text-[#858C87] dark:text-[#AAB6AD]">{copy.certificateEarned}</Text>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${copy.viewCertificate}: ${courseTitle}`}
                        onPress={() => router.push('/passport')}
                        className="h-8 flex-row items-center justify-center rounded-lg bg-[#14543E] px-3"
                      >
                        <Text className="text-[10px] font-extrabold text-white">{copy.viewCertificate}</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })
          ) : (
            <View className="mt-5 items-center rounded-2xl border border-[#E5E8E2] bg-white px-6 py-8 dark:border-[#35443A] dark:bg-[#1D2922]">
              <Text className="text-sm font-extrabold text-[#252B27] dark:text-[#F1F4F1]">{copy.noCompletedCourses}</Text>
              <Text className="mt-1.5 text-center text-[10px] leading-4 text-[#7B837D] dark:text-[#AAB6AD]">
                {copy.completedCoursesHint}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.replace('/explore')}
                className="mt-4 rounded-lg bg-[#14543E] px-4 py-2.5"
              >
                <Text className="text-[10px] font-bold text-white">{copy.exploreCourses}</Text>
              </Pressable>
            </View>
          )
        ) : selectedTab === 'In progress' && loadingLearning ? (
          <View className="mt-5 items-center rounded-2xl border border-[#E5E8E2] bg-white px-6 py-8 dark:border-[#35443A] dark:bg-[#1D2922]">
            <ActivityIndicator color="#14543E" />
            <Text className="mt-2 text-[10px] text-[#7B837D] dark:text-[#AAB6AD]">{copy.loadingLearning}</Text>
          </View>
        ) : selectedTab === 'In progress' && learningError ? (
          <View accessibilityRole="alert" className="mt-5 items-center rounded-2xl border border-[#E8D2CD] bg-white px-6 py-8 dark:border-[#35443A] dark:bg-[#1D2922]">
            <Text className="text-sm font-extrabold text-[#9A5147]">{copy.couldNotLoadCourses}</Text>
            <Text className="mt-1.5 text-center text-[10px] leading-4 text-[#7B837D] dark:text-[#AAB6AD]">{learningError}</Text>
            <Pressable accessibilityRole="button" onPress={() => { void retryLoadLearning(); }} className="mt-4 rounded-lg bg-[#14543E] px-4 py-2.5">
              <Text className="text-[10px] font-bold text-white">{copy.tryAgain}</Text>
            </Pressable>
          </View>
        ) : visibleCourses.length > 0 ? (
          visibleCourses.map((summary, index) => {
            const course = summary.course;
            const resumeLesson = course.lessons?.[summary.resumeLessonIndex]?.title ?? '';
            const status = summary.progressPercent === 100
              ? copy.assessmentPending
              : summary.lastLessonIndex !== null || summary.progressPercent > 0
                ? copy.inProgress.toUpperCase()
              : copy.enrolled;

            return (
              <View key={course.id} className="mt-3 overflow-hidden rounded-[16px] border border-[#E5E8E2] bg-white dark:border-[#35443A] dark:bg-[#1D2922]">
                <ImageBackground
                  source={{ uri: course.coverImage || courseImages[index % courseImages.length] }}
                  className="h-[88px] bg-[#DDEBDD]"
                  resizeMode="cover"
                />
                <View className="p-3">
                  <Text className="self-start rounded-md bg-[#EAF1E8] px-1.5 py-1 text-[9px] font-extrabold tracking-wide text-[#477E62]">
                    {status}
                  </Text>
                  <Text numberOfLines={1} className="mt-1.5 text-[14px] font-extrabold text-[#252B27] dark:text-[#F1F4F1]">{course.title}</Text>
                  <Text numberOfLines={1} className="mt-0.5 text-[10px] text-[#858C87] dark:text-[#AAB6AD]">
                    {copy.resume}: {copy.lesson(summary.resumeLessonIndex + 1, course.lessons?.length ?? 0)}{resumeLesson ? ` · ${resumeLesson}` : ''}
                  </Text>
                  {(course.skills?.length ?? 0) > 0 && (
                    <View className="mt-2 flex-row flex-wrap gap-1">
                      {course.skills?.map((skill) => (
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
                    <View className="h-full rounded-full bg-[#14543E]" style={{ width: `${summary.progressPercent}%` }} />
                  </View>
                  <View className="mt-1.5 flex-row items-center justify-between">
                    <Text className="text-[9px] text-[#858C87] dark:text-[#AAB6AD]">
                      {summary.progressPercent === 100 ? copy.lessonsComplete : copy.percentComplete(summary.progressPercent)}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={copy.continueCourse(course.title)}
                      onPress={() => router.push({ pathname: '/course-content', params: { courseId: course.id } })}
                      className="h-7 flex-row items-center justify-center rounded-lg bg-[#14543E] px-3"
                    >
                      <Text className="text-[10px] font-extrabold text-white">{copy.continue}  ▷</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })
        ) : (
          <View className="mt-5 items-center rounded-2xl border border-[#E5E8E2] bg-white px-6 py-8 dark:border-[#35443A] dark:bg-[#1D2922]">
            <Text className="text-sm font-extrabold text-[#252B27] dark:text-[#F1F4F1]">
              {selectedTab === 'Saved' ? copy.noSavedCourses : copy.noCoursesInProgress}
            </Text>
            <Text className="mt-1.5 text-center text-[9px] leading-4 text-[#7B837D] dark:text-[#AAB6AD]">
              {selectedTab === 'Saved'
                ? copy.noSavedCoursesHint
                : copy.coursesStartHint}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace('/explore')}
              className="mt-4 rounded-lg bg-[#14543E] px-4 py-2.5"
            >
              <Text className="text-[9px] font-bold text-white">{copy.exploreCourses}</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
      <BottomNav />
    </View>
  );
}
