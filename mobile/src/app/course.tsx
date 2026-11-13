import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ImageBackground, Pressable, ScrollView, Text, View } from 'react-native';
import { api, type Course } from '../services/api';
import { getStorageItem } from '../services/storage';
import { getAppLanguage } from '../services/appLanguage';
import { useUiText } from '../services/useUiText';

type CourseDetails = {
  id: string;
  title: string;
  category: string;
  language: string;
  description: string;
  coverImage?: string;
  duration: string;
  lessonCount: number;
  level: string;
  objectives: string[];
  skills: string[];
  lessons: { title: string; type: string; duration: string }[];
  instructor?: string;
  instructorRole?: string;
  published: boolean;
};

function goBackToExplore() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/explore');
  }
}

function durationInMinutes(duration: string) {
  const hours = duration.match(/(\d+)\s*h/i);
  const minutes = duration.match(/(\d+)\s*m(?:in)?/i);
  return Number(hours?.[1] ?? 0) * 60 + Number(minutes?.[1] ?? 0);
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return [hours > 0 ? `${hours}h` : '', remainingMinutes > 0 ? `${remainingMinutes}m` : '']
    .filter(Boolean)
    .join(' ') || '0m';
}

function publishedCourseDetails(course: Course): CourseDetails {
  const lessons = course.lessons ?? [];
  return {
    id: course.id,
    title: course.title,
    category: course.category,
    language: course.language || 'English',
    description: course.description,
    coverImage: course.coverImage,
    duration: formatDuration(lessons.reduce((total, lesson) => total + durationInMinutes(lesson.duration), 0)),
    lessonCount: lessons.length,
    level: course.level,
    objectives: (course.objectives ?? '').split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
    skills: course.skills ?? [],
    lessons: lessons.map((lesson) => ({ title: lesson.title, type: lesson.type, duration: lesson.duration })),
    published: true,
  };
}

export default function CourseDetailsScreen() {
  const { language, t } = useUiText();
  const copy = getAppLanguage(language);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [course, setCourse] = useState<CourseDetails | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    let active = true;
    api.courses.listPublished()
      .then(({ courses }) => {
        const publishedCourse = courses.find((item) => item.id === id);
        if (active) {
          setCourse(publishedCourse ? publishedCourseDetails(publishedCourse) : undefined);
          if (!publishedCourse) setError('This course may no longer be available.');
        }
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load this course.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [id]);

  async function enrolInCourse() {
    if (!course) return;
    try {
      setEnrolling(true);
      setError('');
      const token = await getStorageItem('agrilearn_token');
      if (!token) {
        router.push('/login');
        return;
      }
      await api.courses.lessons.enrol(course.id);
      router.push({ pathname: '/course-content', params: { courseId: course.id } });
    } catch (enrolError) {
      setError(enrolError instanceof Error ? enrolError.message : 'Could not enrol in this course.');
    } finally {
      setEnrolling(false);
    }
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F7F7F2] dark:bg-[#101814]">
        <ActivityIndicator color="#14543E" />
        <Text className="mt-2 text-sm text-[#717A74]">{t('Loading course…')}</Text>
      </View>
    );
  }

  if (!course) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F7F7F2] px-6 dark:bg-[#101814]">
        <Text className="text-lg font-extrabold text-[#252B27] dark:text-[#F1F4F1]">{t('Course not found')}</Text>
        <Text className="mt-2 text-center text-sm text-[#717A74] dark:text-[#AAB6AD]">{error || t('This course may no longer be available.')}</Text>
        <Pressable accessibilityRole="button" onPress={goBackToExplore} className="mt-5 rounded-xl bg-[#14543E] px-5 py-3">
          <Text className="text-sm font-bold text-white">{t('Go back')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F7F7F2] dark:bg-[#101814]">
      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-6 pt-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Go back to Explore')}
          onPress={goBackToExplore}
          className="mb-4 h-10 w-10 items-center justify-center rounded-full border border-[#E1E5DF] bg-white dark:border-[#35443A] dark:bg-[#1D2922]"
        >
          <Text className="text-2xl leading-7 text-[#14543E]">‹</Text>
        </Pressable>

        {course.coverImage ? (
          <ImageBackground
            accessibilityLabel={t('Course cover image')}
            source={{ uri: course.coverImage }}
            className="mb-4 h-[190px] overflow-hidden rounded-2xl bg-[#DDE8DE]"
            imageStyle={{ borderRadius: 16 }}
            resizeMode="cover"
          />
        ) : null}

        <Text className="text-[9px] font-extrabold uppercase tracking-[1px] text-[#477E62]">{copy.category(course.category)}</Text>
        <Text className="mt-1 text-[25px] font-extrabold leading-[30px] text-[#252B27] dark:text-[#F1F4F1]">{course.title}</Text>
        <Text className="mt-2 text-[12px] leading-[18px] text-[#7B837D] dark:text-[#AAB6AD]">{course.description}</Text>
        <Text className="mt-2 text-[9px] font-semibold text-[#477E62]">{t('Main content language')}: {course.language}</Text>

        <View className="mt-4 flex-row rounded-2xl border border-[#E5E8E2] bg-white px-2 py-4 dark:border-[#35443A] dark:bg-[#1D2922]">
          {[
            { icon: '◷', value: copy.duration(course.duration), label: t('Duration') },
            { icon: '▤', value: copy.lessonCount(course.lessonCount), label: t('Self-paced') },
            { icon: '♙', value: copy.level(course.level), label: t('Level') },
          ].map((item, index) => (
            <View key={item.label} className={`flex-1 items-center ${index > 0 ? 'border-l border-[#E8EBE6] dark:border-[#35443A]' : ''}`}>
              <Text className="text-[15px] text-[#14543E]">{item.icon}</Text>
              <Text className="mt-1 text-[10px] font-bold text-[#252B27] dark:text-[#F1F4F1]">{item.value}</Text>
              <Text className="mt-0.5 text-[8px] text-[#858C87] dark:text-[#AAB6AD]">{item.label}</Text>
            </View>
          ))}
        </View>

        {course.instructor && (
          <View className="mt-3 flex-row items-center rounded-2xl bg-[#EAF1E8] p-3">
            <View className="h-9 w-9 items-center justify-center rounded-full bg-white dark:bg-[#1D2922]">
              <Text className="text-[10px] font-extrabold text-[#14543E]">
                {course.instructor.split(' ').map((part) => part[0]).join('')}
              </Text>
            </View>
            <View className="ml-3">
              <Text className="text-[7px] font-bold uppercase tracking-[0.7px] text-[#7B837D]">{t('Created by')}</Text>
              <Text className="mt-0.5 text-[10px] font-bold text-[#252B27] dark:text-[#F1F4F1]">{course.instructor}</Text>
              <Text className="mt-0.5 text-[8px] text-[#7B837D]">{course.instructorRole}</Text>
            </View>
          </View>
        )}

        {course.objectives.length > 0 && (
          <View className="mt-5">
            <Text className="text-[15px] font-extrabold text-[#252B27] dark:text-[#F1F4F1]">{t('What you’ll learn')}</Text>
            {course.objectives.map((objective) => (
              <View key={objective} className="mt-3 flex-row items-start">
                <View className="mt-[1px] h-4 w-4 items-center justify-center rounded-full bg-[#E2EEE4]">
                  <Text className="text-[9px] font-bold text-[#477E62]">✓</Text>
                </View>
                <Text className="ml-2.5 flex-1 text-[10px] leading-[15px] text-[#465149] dark:text-[#B5C0B7]">{objective}</Text>
              </View>
            ))}
          </View>
        )}

        {course.skills.length > 0 && (
          <View className="mt-5">
            <Text className="text-[15px] font-extrabold text-[#252B27] dark:text-[#F1F4F1]">{t('Skills you’ll gain')}</Text>
            <View className="mt-2 flex-row flex-wrap gap-2">
              {course.skills.map((skill) => (
                <Text key={skill} className="rounded-full bg-[#EAF1E8] px-3 py-1.5 text-[10px] font-semibold text-[#477E62]">
                  {skill}
                </Text>
              ))}
            </View>
          </View>
        )}

        <View className="mt-5 rounded-2xl border border-[#DDE4DC] bg-white p-4 dark:border-[#35443A] dark:bg-[#1D2922]">
          <Text className="text-[11px] font-extrabold text-[#14543E]">{t('Your learning pathway')}</Text>
          <Text className="mt-2 text-[10px] leading-4 text-[#59635C] dark:text-[#B5C0B7]">{t('Practical lessons → assessment → microcredential → Skills Passport')}</Text>
          <Text className="mt-1 text-[9px] leading-4 text-[#717A74] dark:text-[#AAB6AD]">{t('Complete the lessons and pass the assessment to earn this course’s credential and skills.')}</Text>
        </View>

        <View className="mb-2 mt-6 flex-row items-center justify-between">
          <Text className="text-[15px] font-extrabold text-[#252B27] dark:text-[#F1F4F1]">{t('Course content')}</Text>
          <Text className="text-[9px] text-[#858C87]">{copy.lessonCount(course.lessonCount)}</Text>
        </View>
        {course.lessons.map((lesson, index) => (
          <View key={`${lesson.title}-${index}`} className="min-h-[55px] flex-row items-center border-b border-[#E1E5DF]">
            <Text className="w-7 text-[9px] font-bold text-[#85A28D]">{String(index + 1).padStart(2, '0')}</Text>
            <View className="flex-1 py-2">
              <Text className="text-[9px] font-bold text-[#343D37]">{lesson.title}</Text>
              <Text className="mt-1 text-[7px] text-[#858C87]">{lesson.type} · {lesson.duration}</Text>
            </View>
            <Text className="ml-3 text-[13px] text-[#59645C]">{lesson.type === 'Video' ? '▷' : '♙'}</Text>
          </View>
        ))}
        {error ? (
          <View accessibilityRole="alert" className="mt-4 rounded-xl border border-[#E8D2CD] bg-white p-3 dark:bg-[#1D2922]">
            <Text className="text-[10px] leading-4 text-[#9A5147]">{error}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View className="border-t border-[#E5E8E2] bg-[#F7F7F2] px-5 pb-3 pt-2 dark:border-[#35443A] dark:bg-[#101814]">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${enrolling ? t('Enrolling in') : t('Enrol in')} ${course.title}`}
          accessibilityState={{ disabled: enrolling }}
          disabled={enrolling}
          onPress={() => { void enrolInCourse(); }}
          className="h-11 flex-row items-center justify-center rounded-xl bg-[#14543E]"
        >
          {enrolling ? <ActivityIndicator color="white" /> : <Text className="text-[11px] font-extrabold text-white">{t('Enrol for free')}  →</Text>}
        </Pressable>
      </View>
    </View>
  );
}
