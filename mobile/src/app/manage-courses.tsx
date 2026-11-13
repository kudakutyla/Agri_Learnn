import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { CreatorBottomNav } from '../components/CreatorBottomNav';
import { ThemePreferenceControl } from '../components/ThemePreferenceControl';
import { api, Course, Profile } from '../services/api';
import { getDashboardLanguage } from '../services/dashboardLanguage';
import { useUiText } from '../services/useUiText';

function statusLabel(status: Course['status']) {
  if (status === 'approved') return 'PUBLISHED';
  if (status === 'submitted') return 'UNDER REVIEW';
  if (status === 'rejected') return 'CHANGES REQUESTED';
  return 'DRAFT';
}

function statusStyle(status: Course['status']) {
  if (status === 'approved') return 'bg-[#EAF1E8] text-[#477E56]';
  if (status === 'submitted') return 'bg-[#F5EAD4] text-[#806022]';
  if (status === 'rejected') return 'bg-[#FBE9E7] text-[#9A5147]';
  return 'bg-[#E9ECE7] text-[#69736C]';
}

export default function ManageCoursesScreen() {
  const { t } = useUiText();
  const [courses, setCourses] = useState<Course[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadDashboard() {
      try {
        const [result, currentProfile] = await Promise.all([
          api.trainer.courses.list(),
          api.profile.get(),
        ]);
        if (!active) return;
        if (currentProfile.user.role !== 'trainer' && currentProfile.user.role !== 'admin') {
          throw new Error('This dashboard is only available to content creators.');
        }
        setProfile(currentProfile.user);
        setCourses(result.courses);
        setErrorMessage('');
      } catch (error) {
        if (active) setErrorMessage(error instanceof Error ? error.message : 'Could not load the content creator dashboard.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadDashboard();
    return () => { active = false; };
  }, []);

  const recentCourse = useMemo(
    () => [...courses].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))[0],
    [courses],
  );
  const initials = profile?.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() ?? 'TR';
  const dashboardLanguage = getDashboardLanguage(profile?.language);
  const stats = [
    { value: courses.length, label: 'Total modules', icon: '▭' },
    { value: courses.filter((course) => course.status === 'approved').length, label: 'Published', icon: '◉' },
    { value: courses.filter((course) => course.status === 'draft').length, label: 'Drafts', icon: '✎' },
    { value: courses.filter((course) => course.status === 'submitted').length, label: 'In review', icon: '◷' },
  ];

  return (
    <View className="flex-1 bg-[#F7F7F2] dark:bg-[#101814]">
      <ScrollView className="flex-1" contentContainerClassName="pb-24">
        <View className="bg-[#075541] px-5 pb-7 pt-14">
          <View className="flex-row items-center justify-between">
            <Text className="text-xl font-extrabold text-white">AgriLearn</Text>
            <View className="flex-row items-center gap-2">
              <ThemePreferenceControl compact />
              <View className="h-9 w-9 items-center justify-center rounded-full bg-[#F1C86A]">
                <Text className="text-xs font-extrabold text-[#435031]">{initials}</Text>
              </View>
            </View>
          </View>
          <Text className="mt-8 text-[24px] font-extrabold text-white">
            {dashboardLanguage.welcomeBack}{profile?.name ? `, ${profile.name}` : ''}
          </Text>
          <Text className="mt-2 text-xs leading-5 text-white/75">Manage your modules, learning resources and reviews.</Text>
        </View>

        <View className="px-5 pt-5">
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/create-module')}
            className="h-[52px] flex-row items-center justify-center rounded-xl bg-[#F1C86A]"
          >
            <Text className="mr-2 text-xl text-[#2D4A3D]">＋</Text>
            <Text className="font-extrabold text-[#2D4A3D]">Create new module</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/trainer-videos')}
            className="mt-2 h-11 flex-row items-center justify-center rounded-xl border border-[#DDE4DC] bg-white dark:border-[#35443A] dark:bg-[#1D2922]"
          >
            <Text className="text-xs font-bold text-[#14543E] dark:text-[#B7E2C2]">Manage lesson videos</Text>
          </Pressable>

          {errorMessage ? (
            <Text accessibilityRole="alert" className="mt-4 rounded-xl bg-[#FBE9E7] p-4 text-xs leading-5 text-[#9A382C]">
              {errorMessage}
            </Text>
          ) : null}

          <View className="mt-4 flex-row gap-2">
            {stats.map((stat) => (
              <View key={stat.label} className="h-[104px] flex-1 items-center justify-center rounded-xl border border-[#E8E9E3] bg-white dark:border-[#35443A] dark:bg-[#1D2922]">
                <Text className="text-lg text-[#6F766F]">{stat.icon}</Text>
                <Text className="mt-1 text-lg font-extrabold text-[#252B27] dark:text-[#F1F4F1]">{loading ? '—' : stat.value}</Text>
                <Text className="mt-1 text-center text-[8px] text-[#7A807C] dark:text-[#AAB6AD]">{stat.label}</Text>
              </View>
            ))}
          </View>

          <View className="mt-6 flex-row items-center justify-between">
            <Text className="text-[17px] font-extrabold text-[#252B27] dark:text-[#F1F4F1]">Recent content</Text>
            <Pressable accessibilityRole="button" onPress={() => router.push('/content')}>
              <Text className="text-xs font-bold text-[#075541]">View all</Text>
            </Pressable>
          </View>

          {loading ? (
            <View className="mt-3 rounded-xl border border-[#E8E9E3] bg-white p-4 dark:border-[#35443A] dark:bg-[#1D2922]">
              <Text className="text-[10px] text-[#7A807C] dark:text-[#AAB6AD]">Loading your modules…</Text>
            </View>
          ) : recentCourse ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`View ${recentCourse.title}, ${statusLabel(recentCourse.status)}`}
              onPress={() => router.push({ pathname: '/module-details', params: { courseId: recentCourse.id } })}
              className="mt-3 overflow-hidden rounded-xl border border-[#E8E9E3] bg-white dark:border-[#35443A] dark:bg-[#1D2922]"
            >
              {recentCourse.coverImage ? (
                <View style={{ height: 112, width: '100%' }}>
                  <Image
                    accessibilityLabel={`${recentCourse.title} cover image`}
                    source={{ uri: recentCourse.coverImage }}
                    style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
                    resizeMode="cover"
                  />
                </View>
              ) : (
                <View className="h-[72px] items-center justify-center bg-[#EAF1E8] dark:bg-[#23362A]">
                  <Text className="text-2xl text-[#14543E]">▧</Text>
                </View>
              )}
              <View className="flex-row items-center justify-between p-4">
                <View className="flex-1 pr-3">
                  <View className={`self-start rounded-full px-2 py-1 ${statusStyle(recentCourse.status)}`}>
                    <Text className="text-[8px] font-extrabold">{statusLabel(recentCourse.status)}</Text>
                  </View>
                  <Text numberOfLines={1} className="mt-2 text-sm font-bold text-[#252B27] dark:text-[#F1F4F1]">{recentCourse.title}</Text>
                  <Text className="mt-1 text-[9px] text-[#7A807C] dark:text-[#AAB6AD]">
                    {recentCourse.status === 'rejected' ? 'View and edit review feedback'
                      : recentCourse.status === 'submitted' ? 'Awaiting administrator review · tap to view'
                        : recentCourse.status === 'approved' ? `${recentCourse.category} · tap to view`
                          : 'Tap to view and edit this draft'}
                  </Text>
                  {recentCourse.skills && recentCourse.skills.length > 0 ? (
                    <Text numberOfLines={1} className="mt-2 text-[9px] font-semibold text-[#477E62]">
                      Skills: {recentCourse.skills.join(' · ')}
                    </Text>
                  ) : null}
                  {recentCourse.status === 'rejected' && recentCourse.reviewNote ? (
                    <Text numberOfLines={2} className="mt-1 text-[9px] leading-4 text-[#9A5147]">
                      Reviewer feedback: {recentCourse.reviewNote}
                    </Text>
                  ) : null}
                </View>
                <Text className="text-xl text-[#5B645E]">›</Text>
              </View>
            </Pressable>
          ) : (
            <View className="mt-3 items-center rounded-xl border border-[#E8E9E3] bg-white p-5 dark:border-[#35443A] dark:bg-[#1D2922]">
              <Text className="text-xs font-bold text-[#252B27] dark:text-[#F1F4F1]">No modules yet</Text>
              <Text className="mt-1 text-center text-[9px] leading-4 text-[#7A807C] dark:text-[#AAB6AD]">Create a module to begin building your content library.</Text>
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/trainer-analytics')}
            className="mt-4 rounded-xl bg-[#EDF3E9] p-4 dark:bg-[#23362A]"
          >
            <Text className="text-xs font-extrabold text-[#252B27] dark:text-[#F1F4F1]">{t('Learner analytics')}</Text>
            <Text className="mt-1 text-[9px] leading-4 text-[#717A74] dark:text-[#B5C0B7]">
              {t('Review aggregate course enrolment, lesson completion, assessment and certificate activity.')}
            </Text>
          </Pressable>
          <Text className="mt-6 text-[17px] font-extrabold text-[#252B27] dark:text-[#F1F4F1]">Review status</Text>
          <View className="mt-3 rounded-xl border border-[#E8E9E3] bg-white p-4 dark:border-[#35443A] dark:bg-[#1D2922]">
            <Text className="text-[11px] font-bold text-[#252B27] dark:text-[#F1F4F1]">
              {courses.filter((course) => course.status === 'submitted').length
                ? `${courses.filter((course) => course.status === 'submitted').length} module${courses.filter((course) => course.status === 'submitted').length === 1 ? '' : 's'} submitted for review`
                : 'No modules awaiting review'}
            </Text>
            <Text className="mt-1 text-[9px] text-[#7A807C] dark:text-[#AAB6AD]">Open My content to review draft and submission statuses.</Text>
          </View>
        </View>
      </ScrollView>
      <CreatorBottomNav />
    </View>
  );
}
