import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { AdminBottomNav } from '../components/AdminBottomNav';
import { api, type AdminApprovalCourse } from '../services/api';

type ApprovalTab = 'Pending' | 'Approved' | 'Returned';
const tabs: ApprovalTab[] = ['Pending', 'Approved', 'Returned'];

function courseTab(course: AdminApprovalCourse): ApprovalTab {
  if (course.status === 'approved') return 'Approved';
  if (course.status === 'rejected') return 'Returned';
  return 'Pending';
}

function relativeTime(value?: string) {
  if (!value) return 'Submission date unavailable';
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return 'Submission date unavailable';
  const hours = Math.max(0, Math.floor((Date.now() - timestamp) / 3_600_000));
  if (hours < 1) return 'Submitted less than an hour ago';
  if (hours < 24) return `Submitted ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Submitted ${days} day${days === 1 ? '' : 's'} ago`;
}

function isNewSubmission(course: AdminApprovalCourse) {
  const time = new Date(course.updatedAt ?? course.createdAt ?? '').getTime();
  return course.status === 'submitted' && !Number.isNaN(time) && Date.now() - time < 24 * 60 * 60 * 1000;
}

export default function AdminApprovalsScreen() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const [courses, setCourses] = useState<AdminApprovalCourse[]>([]);
  const activeTab: ApprovalTab = tab === 'Approved' || tab === 'Reviewed'
    ? 'Approved'
    : tab === 'Returned' ? 'Returned' : 'Pending';
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadApprovals = useCallback(async (refresh = false) => {
    setError('');
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const result = await api.admin.approvals();
      setCourses(result.courses);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load content approvals.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void loadApprovals();
  }, [loadApprovals]));

  const tabCourses = useMemo(
    () => courses.filter((course) => courseTab(course) === activeTab),
    [activeTab, courses],
  );
  const pendingCount = courses.filter((course) => course.status === 'submitted').length;

  return (
    <View className="flex-1 bg-[#F7F7F2] dark:bg-[#101814]">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-5 pt-12"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { void loadApprovals(true); }} />}
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-[22px] font-extrabold leading-7 text-[#252B27] dark:text-[#F1F4F1]">Content approvals</Text>
            <Text className="mt-1 text-[9px] text-[#78817B] dark:text-[#AAB6AD]">
              {loading ? 'Loading submissions…' : error ? 'Approval count unavailable'
                : `${pendingCount} item${pendingCount === 1 ? '' : 's'} require attention`}
            </Text>
          </View>
          <View className="h-9 w-9 items-center justify-center rounded-full border border-[#E0E5DF] bg-white dark:border-[#35443A] dark:bg-[#1D2922]">
            <Text className="text-base text-[#14543E]">▽</Text>
          </View>
        </View>

        <View className="mt-5 flex-row rounded-xl bg-[#E9ECE7] p-1 dark:bg-[#1D2922]">
          {tabs.map((item) => (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityState={{ selected: activeTab === item }}
              onPress={() => router.setParams({ tab: item })}
              className={`h-7 flex-1 items-center justify-center rounded-lg ${activeTab === item ? 'bg-white shadow-sm dark:bg-[#35443A]' : ''}`}
            >
              <Text className={`text-[8px] font-semibold ${activeTab === item ? 'text-[#14543E] dark:text-[#B7E2C2]' : 'text-[#67716A] dark:text-[#AAB6AD]'}`}>
                {item}{item === 'Pending' ? ` ${pendingCount}` : ''}
              </Text>
            </Pressable>
          ))}
        </View>

        {error ? (
          <View className="mt-4 rounded-xl border border-[#F0D1C8] bg-white p-4 dark:bg-[#1D2922]">
            <Text accessibilityRole="alert" className="text-[10px] leading-4 text-[#9A382C]">{error}</Text>
            <Pressable accessibilityRole="button" onPress={() => { void loadApprovals(); }} className="mt-3 self-start rounded-lg bg-[#14543E] px-4 py-2">
              <Text className="text-[9px] font-bold text-white">Try again</Text>
            </Pressable>
          </View>
        ) : null}

        <View className="mt-3">
          {loading ? (
            <Text className="py-4 text-[10px] text-[#78817B] dark:text-[#AAB6AD]">Loading submitted courses…</Text>
          ) : error ? null : tabCourses.length ? tabCourses.map((course, index) => (
            <Pressable
              key={course.id}
              accessibilityRole="button"
              accessibilityLabel={`View ${course.title} by ${course.ownerName}`}
              onPress={() => router.push({
                pathname: '/admin-approval-details',
                params: { courseId: course.id, returnTab: activeTab },
              })}
              className={`min-h-[82px] flex-row items-center py-3 ${index > 0 ? 'border-t border-[#DDE3DD] dark:border-[#35443A]' : ''}`}
            >
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-[#E8F0E7]">
                <Text className="text-base text-[#39785C]">◩</Text>
              </View>
              <View className="flex-1 pr-2">
                <View className="mb-1 self-start rounded-full bg-[#F3E9D1] px-2 py-0.5">
                  <Text className="text-[7px] font-bold text-[#86662C]">
                    {activeTab === 'Pending' ? isNewSubmission(course) ? 'NEW' : 'PENDING REVIEW'
                      : activeTab === 'Approved' ? 'APPROVED' : 'RETURNED'}
                  </Text>
                </View>
                <Text numberOfLines={1} className="text-[10px] font-bold text-[#252B27] dark:text-[#F1F4F1]">{course.title}</Text>
                <Text numberOfLines={1} className="mt-0.5 text-[8px] text-[#78817B] dark:text-[#AAB6AD]">
                  By {course.ownerName} · {relativeTime(course.updatedAt ?? course.createdAt)}
                </Text>
                <Text className="mt-1 text-[7px] text-[#477E62] dark:text-[#A9CDB2]">
                  {course.language || 'English'} · {(course.lessons ?? []).length} lesson{(course.lessons ?? []).length === 1 ? '' : 's'} · {course.assessment?.questionCount ?? 0} question{course.assessment?.questionCount === 1 ? '' : 's'}
                </Text>
              </View>
              <Text className="text-lg text-[#526058]">›</Text>
            </Pressable>
          )) : (
            <View className="items-center py-12">
              <Text className="text-[11px] font-bold text-[#34483A] dark:text-[#E2EAE3]">
                {activeTab === 'Pending' ? 'No pending submissions'
                  : activeTab === 'Approved' ? 'No approved courses yet' : 'No returned courses'}
              </Text>
              <Text className="mt-1 text-center text-[9px] text-[#78817B] dark:text-[#AAB6AD]">
                {activeTab === 'Pending' ? 'New content creator submissions will appear here.'
                  : activeTab === 'Approved' ? 'Approved courses will appear here.'
                    : 'Courses sent back to content creators will appear here.'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <AdminBottomNav active="Approvals" />
    </View>
  );
}
