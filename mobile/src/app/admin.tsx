import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { AdminBottomNav } from '../components/AdminBottomNav';
import { api, type AdminOverview } from '../services/api';

const metricCards = [
  { key: 'registeredLearners', label: 'REGISTERED LEARNERS', icon: '♙' },
  { key: 'publishedModules', label: 'PUBLISHED MODULES', icon: '▤' },
  { key: 'certificatesIssued', label: 'CERTIFICATES ISSUED', icon: '♧' },
  { key: 'registeredSMMEs', label: 'REGISTERED SMMEs', icon: '▥' },
] as const;

function relativeTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export default function AdminScreen() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadOverview = useCallback(async (refresh = false) => {
    setError('');
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      setOverview(await api.admin.overview());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load the platform overview.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void api.admin.overview()
      .then((result) => {
        if (active) setOverview(result);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load the platform overview.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const today = new Intl.DateTimeFormat('en', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
  const maxLearners = Math.max(1, ...(overview?.learnerGrowth.map((item) => item.learners) ?? []));
  const recentLearners = overview?.learnerGrowth.reduce((total, item) => total + item.learners, 0) ?? 0;

  return (
    <View className="flex-1 bg-[#F7F7F2]">
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-5"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { void loadOverview(true); }} />}
      >
        <View className="relative overflow-hidden bg-[#104B39] px-5 pb-8 pt-12">
          <View pointerEvents="none" className="absolute -right-7 -top-8 h-40 w-40 rounded-full bg-white/5" />
          <View pointerEvents="none" className="absolute right-8 top-14 h-24 w-24 rounded-full bg-white/5" />
          <Text className="text-[9px] font-bold tracking-[1.4px] text-[#C2D9CA]">ADMINISTRATION</Text>
          <Text className="mt-2 text-[24px] font-extrabold leading-7 text-white">Platform overview</Text>
          <Text className="mt-2 text-[10px] text-[#D4E1D8]">{today}</Text>
        </View>

        <View className="-mt-3 px-4">
          {error ? (
            <View className="mb-3 rounded-xl border border-[#F0D1C8] bg-white p-4">
              <Text accessibilityRole="alert" className="text-[11px] leading-4 text-[#9A382C]">{error}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => { void loadOverview(); }}
                className="mt-3 self-start rounded-lg bg-[#14543E] px-4 py-2"
              >
                <Text className="text-[10px] font-bold text-white">Try again</Text>
              </Pressable>
            </View>
          ) : null}

          <View className="flex-row gap-2">
            {metricCards.slice(0, 2).map((card) => (
              <MetricCard key={card.key} icon={card.icon} label={card.label} value={overview?.metrics[card.key]} loading={loading} />
            ))}
          </View>
          <View className="mt-2 flex-row gap-2">
            {metricCards.slice(2).map((card) => (
              <MetricCard key={card.key} icon={card.icon} label={card.label} value={overview?.metrics[card.key]} loading={loading} />
            ))}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open pending content approvals"
            onPress={() => router.push({ pathname: '/admin-approvals', params: { tab: 'Pending' } })}
            className="mt-2 flex-row items-center rounded-xl border border-[#E8D29F] bg-[#F8EED7] px-3 py-3"
          >
            <View className="mr-3 h-9 w-9 items-center justify-center rounded-lg bg-white">
              <Text className="text-base text-[#9A7330]">◷</Text>
            </View>
            <View className="flex-1">
              <Text className="text-[11px] font-extrabold text-[#57482B]">
                {loading ? 'Checking content approvals…' : overview
                  ? `${overview.metrics.pendingApprovals} content approval${overview.metrics.pendingApprovals === 1 ? '' : 's'} waiting`
                  : 'Approval count unavailable'}
              </Text>
              <Text className="mt-1 text-[8px] leading-3 text-[#88764F]">Submitted modules awaiting administrator review</Text>
            </View>
            <Text className="ml-2 text-lg text-[#9A7330]">›</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Manage uploaded lesson videos"
            onPress={() => router.push('/admin-videos')}
            className="mt-2 flex-row items-center rounded-xl border border-[#DDE4DC] bg-white px-3 py-3"
          >
            <View className="mr-3 h-9 w-9 items-center justify-center rounded-lg bg-[#E8F0E7]">
              <Text className="text-base text-[#39785C]">▶</Text>
            </View>
            <View className="flex-1">
              <Text className="text-[11px] font-extrabold text-[#252B27]">Manage lesson videos</Text>
              <Text className="mt-1 text-[8px] leading-3 text-[#717A74]">Review upload status and remove outdated or abandoned objects</Text>
            </View>
            <Text className="ml-2 text-lg text-[#5B645E]">›</Text>
          </Pressable>

          <View className="mt-5 flex-row items-center justify-between">
            <Text className="text-[15px] font-extrabold text-[#252B27]">Learner growth</Text>
            <Text className="text-[9px] font-semibold text-[#477E62]">Last 6 months</Text>
          </View>
          <View className="mt-2 rounded-xl border border-[#E5E8E2] bg-white p-4">
            <Text className="text-[8px] font-bold tracking-wide text-[#78817B]">NEW LEARNER REGISTRATIONS</Text>
            <Text className="mt-1 text-[20px] font-extrabold text-[#252B27]">
              {loading || !overview ? '—' : recentLearners.toLocaleString()}
            </Text>
            {loading ? (
              <Text className="mt-5 text-[10px] text-[#78817B]">Loading registration history…</Text>
            ) : overview ? (
              <View accessibilityLabel={`Learner registrations by month, ${overview.learnerGrowth.map((item) => `${item.month}: ${item.learners}`).join(', ')}`} className="mt-3 h-[90px] flex-row items-end justify-between border-b border-[#E5E8E2] px-1">
                {overview?.learnerGrowth.map((item) => (
                  <View key={item.month} className="h-full flex-1 items-center justify-end">
                    <Text className="mb-1 text-[8px] text-[#477E62]">{item.learners || ''}</Text>
                    <View
                      className="w-5 rounded-t-md bg-[#39785C]"
                      style={{ height: Math.max(4, (item.learners / maxLearners) * 55) }}
                    />
                    <Text className="mt-1 text-[8px] text-[#78817B]">{item.month}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text className="mt-5 text-[10px] text-[#78817B]">Registration history is unavailable.</Text>
            )}
          </View>

          <Text className="mt-5 text-[15px] font-extrabold text-[#252B27]">Recent activity</Text>
          <View className="mt-2 overflow-hidden rounded-xl border border-[#E5E8E2] bg-white px-3">
            {loading ? (
              <Text className="py-4 text-[10px] text-[#78817B]">Loading recent activity…</Text>
            ) : overview ? overview.recentActivity.length ? overview.recentActivity.map((activity, index) => (
              <View key={`${activity.type}-${activity.createdAt}-${index}`} className={`flex-row items-center py-3 ${index > 0 ? 'border-t border-[#E8ECE7]' : ''}`}>
                <View className="mr-2.5 h-8 w-8 items-center justify-center rounded-full bg-[#E8F0E7]">
                  <Text className="text-sm text-[#39785C]">
                    {activity.type === 'approval' ? '↑' : activity.type === 'learner' ? '♙' : '▣'}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text numberOfLines={1} className="text-[9px] font-bold text-[#34483A]">{activity.title}</Text>
                  <Text className="mt-1 text-[8px] text-[#78817B]">{relativeTime(activity.createdAt)}</Text>
                </View>
              </View>
            )) : (
              <Text className="py-4 text-[10px] text-[#78817B]">No recent platform activity.</Text>
            ) : (
              <Text className="py-4 text-[10px] text-[#78817B]">Activity is unavailable.</Text>
            )}
          </View>
        </View>
      </ScrollView>

      <AdminBottomNav active="Dashboard" />
    </View>
  );
}

function MetricCard({ icon, label, value, loading }: { icon: string; label: string; value?: number; loading: boolean }) {
  return (
    <View className="h-[90px] flex-1 justify-center rounded-xl border border-[#E5E8E2] bg-white px-3">
      <View className="h-7 w-7 items-center justify-center rounded-lg bg-[#E8F0E7]">
        <Text className="text-sm text-[#39785C]">{icon}</Text>
      </View>
      <Text className="mt-1.5 text-[7px] font-semibold tracking-wide text-[#78817B]">{label}</Text>
      <Text className="mt-0.5 text-[17px] font-extrabold leading-5 text-[#252B27]">
        {loading || value === undefined ? '—' : value.toLocaleString()}
      </Text>
    </View>
  );
}
