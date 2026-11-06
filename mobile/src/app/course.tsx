import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { courses as sampleCourses } from '../data';
import { api, type Course } from '../services/api';
import { getStorageItem } from '../services/storage';

type CourseDetails = {
  id: string;
  title: string;
  category: string;
  description: string;
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

function sampleCourseDetails(id: string): CourseDetails | undefined {
  const course = sampleCourses.find((item) => item.id === id);
  if (!course) return undefined;
  return {
    id: course.id,
    title: course.title,
    category: course.category,
    description: course.description,
    duration: course.duration,
    lessonCount: course.lessons,
    level: course.level,
    objectives: course.objectives,
    skills: course.skills,
    lessons: course.lessonTitles.map((title, index) => ({
      title,
      type: index === 0 ? 'Video' : 'Reading',
      duration: index === 0 ? '12 min' : '10 min',
    })),
    instructor: course.instructor,
    instructorRole: course.instructorRole,
    published: false,
  };
}

function publishedCourseDetails(course: Course): CourseDetails {
  const lessons = course.lessons ?? [];
  return {
    id: course.id,
    title: course.title,
    category: course.category,
    description: course.description,
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
  const { id } = useLocalSearchParams<{ id: string }>();
  const sampleDetails = sampleCourseDetails(id);
  const [course, setCourse] = useState<CourseDetails | undefined>(sampleDetails);
  const [loading, setLoading] = useState(!sampleDetails);
  const [error, setError] = useState('');
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    if (sampleCourseDetails(id)) return;
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
    if (!course.published) {
      router.push({ pathname: '/course-content', params: { courseId: course.id } });
      return;
    }

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
      <View className="flex-1 items-center justify-center bg-[#F7F7F2]">
        <ActivityIndicator color="#14543E" />
        <Text className="mt-2 text-sm text-[#717A74]">Loading course…</Text>
      </View>
    );
  }

  if (!course) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F7F7F2] px-6">
        <Text className="text-lg font-extrabold text-[#252B27]">Course not found</Text>
        <Text className="mt-2 text-center text-sm text-[#717A74]">{error || 'This course may no longer be available.'}</Text>
        <Pressable accessibilityRole="button" onPress={goBackToExplore} className="mt-5 rounded-xl bg-[#14543E] px-5 py-3">
          <Text className="text-sm font-bold text-white">Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F7F7F2]">
      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-6 pt-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back to Explore"
          onPress={goBackToExplore}
          className="mb-4 h-10 w-10 items-center justify-center rounded-full border border-[#E1E5DF] bg-white"
        >
          <Text className="text-2xl leading-7 text-[#14543E]">‹</Text>
        </Pressable>

        <Text className="text-[9px] font-extrabold uppercase tracking-[1px] text-[#477E62]">{course.category}</Text>
        <Text className="mt-1 text-[25px] font-extrabold leading-[30px] text-[#252B27]">{course.title}</Text>
        <Text className="mt-2 text-[12px] leading-[18px] text-[#7B837D]">{course.description}</Text>

        <View className="mt-4 flex-row rounded-2xl border border-[#E5E8E2] bg-white px-2 py-4">
          {[
            { icon: '◷', value: course.duration, label: 'Duration' },
            { icon: '▤', value: `${course.lessonCount} lessons`, label: 'Self-paced' },
            { icon: '♙', value: course.level, label: 'Level' },
          ].map((item, index) => (
            <View key={item.label} className={`flex-1 items-center ${index > 0 ? 'border-l border-[#E8EBE6]' : ''}`}>
              <Text className="text-[15px] text-[#14543E]">{item.icon}</Text>
              <Text className="mt-1 text-[10px] font-bold text-[#252B27]">{item.value}</Text>
              <Text className="mt-0.5 text-[8px] text-[#858C87]">{item.label}</Text>
            </View>
          ))}
        </View>

        {course.instructor && (
          <View className="mt-3 flex-row items-center rounded-2xl bg-[#EAF1E8] p-3">
            <View className="h-9 w-9 items-center justify-center rounded-full bg-white">
              <Text className="text-[10px] font-extrabold text-[#14543E]">
                {course.instructor.split(' ').map((part) => part[0]).join('')}
              </Text>
            </View>
            <View className="ml-3">
              <Text className="text-[7px] font-bold uppercase tracking-[0.7px] text-[#7B837D]">Created by</Text>
              <Text className="mt-0.5 text-[10px] font-bold text-[#252B27]">{course.instructor}</Text>
              <Text className="mt-0.5 text-[8px] text-[#7B837D]">{course.instructorRole}</Text>
            </View>
          </View>
        )}

        {course.objectives.length > 0 && (
          <View className="mt-5">
            <Text className="text-[15px] font-extrabold text-[#252B27]">What you’ll learn</Text>
            {course.objectives.map((objective) => (
              <View key={objective} className="mt-3 flex-row items-start">
                <View className="mt-[1px] h-4 w-4 items-center justify-center rounded-full bg-[#E2EEE4]">
                  <Text className="text-[9px] font-bold text-[#477E62]">✓</Text>
                </View>
                <Text className="ml-2.5 flex-1 text-[10px] leading-[15px] text-[#465149]">{objective}</Text>
              </View>
            ))}
          </View>
        )}

        {course.skills.length > 0 && (
          <View className="mt-5">
            <Text className="text-[15px] font-extrabold text-[#252B27]">Skills you’ll gain</Text>
            <View className="mt-2 flex-row flex-wrap gap-2">
              {course.skills.map((skill) => (
                <Text key={skill} className="rounded-full bg-[#EAF1E8] px-3 py-1.5 text-[10px] font-semibold text-[#477E62]">
                  {skill}
                </Text>
              ))}
            </View>
          </View>
        )}

        <View className="mb-2 mt-6 flex-row items-center justify-between">
          <Text className="text-[15px] font-extrabold text-[#252B27]">Course content</Text>
          <Text className="text-[9px] text-[#858C87]">{course.lessonCount} lessons</Text>
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
          <View accessibilityRole="alert" className="mt-4 rounded-xl border border-[#E8D2CD] bg-white p-3">
            <Text className="text-[10px] leading-4 text-[#9A5147]">{error}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View className="border-t border-[#E5E8E2] bg-[#F7F7F2] px-5 pb-3 pt-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${enrolling ? 'Enrolling in' : 'Enrol in'} ${course.title}`}
          accessibilityState={{ disabled: enrolling }}
          disabled={enrolling}
          onPress={() => { void enrolInCourse(); }}
          className="h-11 flex-row items-center justify-center rounded-xl bg-[#14543E]"
        >
          {enrolling ? <ActivityIndicator color="white" /> : <Text className="text-[11px] font-extrabold text-white">Enrol for free  →</Text>}
        </Pressable>
      </View>
    </View>
  );
}
