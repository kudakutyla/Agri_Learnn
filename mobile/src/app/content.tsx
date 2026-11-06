import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
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
    <View className="flex-1 bg-[#F7F7F2]">
      <ScrollView className="flex-1" contentContainerClassName="pb-8">
        <View className="flex-row items-center justify-between px-5 pb-5 pt-5">
          <View>
          <Text className="text-base font-extrabold text-[#252B27]">My content</Text>
            <Text className="mt-1 text-[9px] text-[#858C87]">{courses.length} learning module{courses.length === 1 ? '' : 's'}</Text>
          </View>
          <View className="h-9 w-9 items-center justify-center rounded-xl border border-[#E1E5DF] bg-white">
          <View className="items-center gap-[3px]">
            <View className="h-[1.5px] w-3 bg-[#14543E]" />
            <View className="h-[1.5px] w-2 bg-[#14543E]" />
            <View className="h-[1.5px] w-1 bg-[#14543E]" />
          </View>
        </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="mx-5 flex-row gap-1 rounded-lg bg-[#E8EBE6] p-1">
          {(['All', 'Drafts', 'In review', 'Published'] as const).map((item) => (
            <Pressable key={item} onPress={() => setFilter(item)} className={`h-8 min-w-[68px] items-center justify-center rounded-md px-2 ${filter === item ? 'bg-white' : ''}`}>
              <Text className={`text-[9px] ${filter === item ? 'font-extrabold text-[#14543E]' : 'font-medium text-[#687069]'}`}>{item}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View className="mt-3 px-5">
          {loading && <Text className="py-6 text-center text-xs text-[#717A74]">Loading your modules…</Text>}
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
              <Text className="text-sm font-bold text-[#252B27]">
                {filter === 'Drafts' ? 'No draft modules'
                  : filter === 'In review' ? 'No modules in review'
                    : filter === 'Published' ? 'No published modules'
                      : 'No modules yet'}
              </Text>
              <Text className="mt-2 text-center text-[10px] leading-4 text-[#717A74]">Create a module to start sharing your agricultural knowledge.</Text>
            </View>
          )}
          {visibleCourses.map((course) => (
            <Pressable
              key={course.id}
              accessibilityRole={course.status === 'draft' || course.status === 'rejected' ? 'button' : undefined}
              accessibilityLabel={course.status === 'draft' || course.status === 'rejected' ? `Edit ${course.title}` : `${course.title}, ${statusLabel(course.status)}`}
              disabled={course.status === 'submitted' || course.status === 'approved'}
              onPress={() => router.push({ pathname: '/create-module', params: { courseId: course.id } })}
              className="min-h-[76px] flex-row items-center border-b border-[#E0E4DE]"
            >
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#EAF1E8]">
                <Text className="text-lg text-[#14543E]">{rowIcon(course.status)}</Text>
              </View>
              <View className="ml-3 flex-1 py-3">
                <Text className={`self-start rounded-full px-2 py-1 text-[7px] font-extrabold ${statusStyle(course.status)}`}>{statusLabel(course.status)}</Text>
                <Text numberOfLines={1} className="mt-1.5 text-[10px] font-bold text-[#252B27]">{course.title}</Text>
                <Text className="mt-1 text-[8px] text-[#858C87]">
                  {course.status === 'approved' ? course.category
                    : course.status === 'submitted' ? 'Submitted for review · editing locked'
                      : course.status === 'rejected' ? 'Changes requested · tap to edit'
                        : 'Draft module · tap to edit'}
                </Text>
                {course.status === 'rejected' && course.reviewNote ? (
                  <Text numberOfLines={2} className="mt-1 text-[8px] leading-3 text-[#9A5147]">
                    Reviewer feedback: {course.reviewNote}
                  </Text>
                ) : null}
              </View>
              <Text className="ml-2 text-xl text-[#5B645E]">{course.status === 'submitted' || course.status === 'approved' ? '•' : '›'}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable onPress={() => router.push('/create-module')} className="mx-5 mt-4 h-10 flex-row items-center justify-center rounded-lg bg-[#14543E]">
          <Text className="text-[10px] font-extrabold text-white">Create new module  +</Text>
        </Pressable>
      </ScrollView>
      <CreatorBottomNav />
    </View>
  );
}
