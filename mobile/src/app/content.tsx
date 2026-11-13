import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { CreatorBottomNav } from '../components/CreatorBottomNav';
import { api, Course } from '../services/api';

type ContentFilter = 'All' | 'Drafts' | 'In review' | 'Published';

function statusLabel(status: Course['status']) {
  if (status === 'approved') return 'PUBLISHED';
  if (status === 'submitted') return 'UNDER REVIEW';
  if (status === 'rejected') return 'REJECTED';
  return 'DRAFT';
}

function statusStyle(status: Course['status']) {
  if (status === 'approved') return 'bg-[#EAF1E8] text-[#477E56]';
  if (status === 'submitted') return 'bg-[#F5EAD4] text-[#806022]';
  if (status === 'rejected') return 'bg-[#FBE9E7] text-[#9A5147]';
  return 'bg-[#E9ECE7] text-[#69736C]';
}

function rowIcon(status: Course['status']) {
  if (status === 'approved') return '♧';
  if (status === 'submitted') return '⬡';
  return '▯';
}

function courseDuration(course: Course) {
  const lessons = course.lessons ?? [];
  if (lessons.length === 0) return 'Not set';

  const durations = lessons.map(({ duration }) => {
    const clock = duration.trim().match(/^(?:(\d{1,2}):)?(\d{1,2}):([0-5]\d)$/);
    if (clock) {
      return Number(clock[1] ?? 0) * 3600 + Number(clock[2]) * 60 + Number(clock[3]);
    }

    const amount = duration.trim().match(/^(\d+(?:\.\d+)?)\s*(s|sec(?:onds?)?|m|min(?:utes?)?|h|hr|hours?)$/i);
    if (!amount) return undefined;
    const count = Number(amount[1]);
    const unit = amount[2]?.toLowerCase() ?? '';
    return Math.round(count * (unit.startsWith('h') ? 3600 : unit.startsWith('m') ? 60 : 1));
  });

  const validDurations = durations.filter((duration): duration is number => typeof duration === 'number' && duration > 0);
  if (validDurations.length !== durations.length) return 'Not available';

  const totalMinutes = Math.ceil(validDurations.reduce((total, duration) => total + duration, 0) / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return [
    hours ? `${hours} hr${hours === 1 ? '' : 's'}` : '',
    minutes ? `${minutes} min` : '',
  ].filter(Boolean).join(' ') || 'Under 1 min';
}

export default function CreatorContentScreen() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [filter, setFilter] = useState<ContentFilter>('All');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;
    async function loadContent() {
      try {
        const result = await api.trainer.courses.list();
        if (active) setCourses(result.courses);
      } catch (error) {
        if (active) setErrorMessage(error instanceof Error ? error.message : 'Could not load content.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadContent();
    return () => { active = false; };
  }, []);

  const visibleCourses = useMemo(() => courses.filter((course) => {
    if (filter === 'Drafts') return course.status === 'draft';
    if (filter === 'In review') return course.status === 'submitted';
    if (filter === 'Published') return course.status === 'approved';
    return true;
  }), [courses, filter]);

  return (
    <View className="flex-1 bg-[#F7F7F2] dark:bg-[#101814]">
      <ScrollView className="flex-1" contentContainerClassName="pb-8">
        <View className="flex-row items-center justify-between px-5 pb-5 pt-5">
          <View>
          <Text className="text-lg font-extrabold text-[#252B27] dark:text-[#F1F4F1]">My content</Text>
            <Text className="mt-1 text-[11px] text-[#858C87] dark:text-[#AAB6AD]">{courses.length} learning module{courses.length === 1 ? '' : 's'}</Text>
          </View>
          <View className="h-9 w-9 items-center justify-center rounded-xl border border-[#E1E5DF] bg-white dark:border-[#35443A] dark:bg-[#1D2922]">
          <View className="items-center gap-[3px]">
            <View className="h-[1.5px] w-3 bg-[#14543E]" />
            <View className="h-[1.5px] w-2 bg-[#14543E]" />
            <View className="h-[1.5px] w-1 bg-[#14543E]" />
          </View>
        </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="mx-5 flex-row gap-1 rounded-lg bg-[#E8EBE6] p-1 dark:bg-[#1D2922]">
          {(['All', 'Drafts', 'In review', 'Published'] as const).map((item) => (
            <Pressable key={item} onPress={() => setFilter(item)} className={`h-9 min-w-[72px] items-center justify-center rounded-md px-2 ${filter === item ? 'bg-white dark:bg-[#35443A]' : ''}`}>
              <Text className={`text-[11px] ${filter === item ? 'font-extrabold text-[#14543E] dark:text-[#B7E2C2]' : 'font-medium text-[#687069] dark:text-[#AAB6AD]'}`}>{item}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View className="mt-3 px-5">
          {loading && <Text className="py-6 text-center text-xs text-[#717A74] dark:text-[#AAB6AD]">Loading your modules…</Text>}
          {errorMessage ? (
            <View className="items-start rounded-xl bg-[#FBE9E7] p-4">
              <Text accessibilityRole="alert" className="text-xs leading-5 text-[#9A382C]">{errorMessage}</Text>
              <Pressable accessibilityRole="button" onPress={() => router.replace('/manage-courses')} className="mt-3">
                <Text className="text-xs font-bold text-[#14543E]">Return to dashboard</Text>
              </Pressable>
            </View>
          ) : null}
          {!loading && visibleCourses.length === 0 && (
            <View className="items-center px-6 py-10">
              <Text className="text-sm font-bold text-[#252B27] dark:text-[#F1F4F1]">
                {filter === 'Drafts' ? 'No draft modules'
                  : filter === 'In review' ? 'No modules in review'
                    : filter === 'Published' ? 'No published modules'
                      : 'No modules yet'}
              </Text>
              <Text className="mt-2 text-center text-[10px] leading-4 text-[#717A74] dark:text-[#AAB6AD]">Create a module to start sharing your agricultural knowledge.</Text>
            </View>
          )}
          {visibleCourses.map((course) => (
            <Pressable
              key={course.id}
              accessibilityRole="button"
              accessibilityLabel={`View ${course.title}, ${statusLabel(course.status)}`}
              onPress={() => router.push({ pathname: '/module-details', params: { courseId: course.id } })}
              className="mb-3 min-h-[120px] flex-row items-center rounded-xl border border-[#E0E4DE] bg-white px-3 py-3 dark:border-[#35443A] dark:bg-[#1D2922]"
            >
              <View className="h-14 w-14 overflow-hidden rounded-xl bg-[#EAF1E8] dark:bg-[#23362A]">
                {course.coverImage ? (
                  <Image
                    accessibilityLabel={`${course.title} cover image`}
                    source={{ uri: course.coverImage }}
                    className="h-full w-full"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="flex-1 items-center justify-center">
                    <Text className="text-2xl text-[#14543E]">{rowIcon(course.status)}</Text>
                  </View>
                )}
              </View>
              <View className="ml-3 flex-1 py-1">
                <Text className={`self-start rounded-full px-2 py-1 text-[8px] font-extrabold ${statusStyle(course.status)}`}>{statusLabel(course.status)}</Text>
                <Text numberOfLines={2} className="mt-1.5 text-[13px] font-bold text-[#252B27] dark:text-[#F1F4F1]">{course.title}</Text>
                <Text className="mt-1 text-[10px] text-[#858C87] dark:text-[#AAB6AD]">
                  {course.status === 'approved' ? `${course.category} · ${course.language || 'English'} · tap to view`
                    : course.status === 'submitted' ? 'Submitted for review · tap to view'
                      : course.status === 'rejected' ? 'Changes requested · tap to view and edit'
                        : 'Draft module · tap to view and edit'}
                </Text>
                <View className="mt-1 flex-row flex-wrap gap-1">
                  {(course.skills?.length ? course.skills : ['Not specified']).map((skill) => (
                    <Text
                      key={skill}
                      numberOfLines={1}
                      className="max-w-full rounded-md border border-[#E8D7B3] bg-[#F5EAD4] px-2 py-1 text-[9px] font-bold text-[#806022]"
                    >
                      {skill}
                    </Text>
                  ))}
                </View>
                <Text className="mt-1 text-[10px] text-[#59635C] dark:text-[#B5C0B7]">Duration: {courseDuration(course)}</Text>
                {course.status === 'rejected' && course.reviewNote ? (
                  <Text numberOfLines={2} className="mt-1 text-[10px] leading-4 text-[#9A5147]">
                    Reviewer feedback: {course.reviewNote}
                  </Text>
                ) : null}
              </View>
              <Text className="ml-2 text-2xl text-[#5B645E] dark:text-[#AAB6AD]">›</Text>
            </Pressable>
          ))}
        </View>

        <Pressable onPress={() => router.push('/create-module')} className="mx-5 mt-1 h-12 flex-row items-center justify-center rounded-lg bg-[#14543E]">
          <Text className="text-[12px] font-extrabold text-white">Create new module  +</Text>
        </Pressable>
      </ScrollView>
      <CreatorBottomNav />
    </View>
  );
}
