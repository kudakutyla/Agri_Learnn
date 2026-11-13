import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { AdminBottomNav } from '../components/AdminBottomNav';
import { api, type AdminReports } from '../services/api';

function MetricRow({ icon, label, value, detail }: { icon: string; label: string; value: string; detail: string }) {
  return (
    <View className="min-h-[54px] flex-row items-center border-b border-[#E6EBE6] py-2 last:border-b-0">
      <View className="mr-2.5 h-8 w-8 items-center justify-center rounded-lg bg-[#E8F0E7]">
        <Text className="text-sm text-[#39785C]">{icon}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-[13px] font-extrabold text-[#252B27]">{value}</Text>
        <Text className="mt-0.5 text-[8px] text-[#78817B]">{label} · {detail}</Text>
      </View>
    </View>
  );
}

export default function AdminReportsScreen() {
  const [report, setReport] = useState<AdminReports | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  async function loadReport(refresh = false) {
    setError('');
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      setReport(await api.admin.reports());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load platform reports.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    let active = true;
    void api.admin.reports()
      .then((result) => {
        if (active) setReport(result);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load platform reports.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const reportMonth = report
    ? new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(new Date(report.generatedAt))
    : new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(new Date());
  const maxDailyLearners = Math.max(1, ...(report?.learningPerformance.map((item) => item.activeLearners) ?? []));
  const completionValue = report?.averageCompletionRate === null || report?.averageCompletionRate === undefined
    ? '—'
    : `${report.averageCompletionRate}%`;

  return (
    <View className="flex-1 bg-[#F7F7F2] dark:bg-[#101814]">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-5 pt-12"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { void loadReport(true); }} />}
      >
        <View className="mb-5">
          <Text className="text-[22px] font-extrabold leading-7 text-[#252B27] dark:text-[#F1F4F1]">Reports &amp; analytics</Text>
          <Text className="mt-1 text-[9px] text-[#78817B] dark:text-[#AAB6AD]">Platform performance · {reportMonth}</Text>
        </View>

        {error ? (
          <View className="mb-4 rounded-xl border border-[#F0D1C8] bg-white p-4 dark:bg-[#1D2922]">
            <Text accessibilityRole="alert" className="text-[10px] leading-4 text-[#9A382C]">{error}</Text>
            <Pressable accessibilityRole="button" onPress={() => { void loadReport(); }} className="mt-3 self-start rounded-lg bg-[#14543E] px-4 py-2">
              <Text className="text-[9px] font-bold text-white">Try again</Text>
            </Pressable>
          </View>
        ) : null}

        <View className="min-h-[94px] flex-row items-center rounded-2xl bg-[#104B39] px-4 py-4">
          <Text className="mr-3 text-xl text-[#E6C970]">↗</Text>
          <View>
            <Text className="text-[8px] font-bold tracking-wider text-[#D4E1D8]">MONTHLY ACTIVE LEARNERS</Text>
            <Text className="mt-1 text-[22px] font-extrabold leading-6 text-white">
              {loading || !report ? '—' : report.activeLearners.toLocaleString()}
            </Text>
            <Text className="mt-1 text-[8px] text-[#E4D389]">
              {report ? `Learning activity in the last ${report.activeLearnerWindowDays} days` : 'Unique learners with recent learning activity'}
            </Text>
          </View>
        </View>

        <Text className="mb-2 mt-5 text-[14px] font-extrabold text-[#252B27] dark:text-[#F1F4F1]">Learning performance</Text>
        <View className="rounded-xl border border-[#E3E8E2] bg-white px-3 pb-2 pt-4 dark:border-[#35443A] dark:bg-[#1D2922]">
          {loading ? (
            <Text className="py-8 text-center text-[10px] text-[#78817B] dark:text-[#AAB6AD]">Loading weekly learning activity…</Text>
          ) : report ? (
            <>
              <View accessibilityLabel={`Unique active learners over the last seven days: ${report.learningPerformance.map((item) => `${item.day} ${item.activeLearners}`).join(', ')}`} className="h-[94px] flex-row items-end justify-around">
                {report.learningPerformance.map((item, index) => (
                  <View key={`${item.day}-${index}`} className="h-full flex-1 items-center justify-end">
                    <Text className="mb-1 text-[7px] text-[#477E62]">{item.activeLearners || ''}</Text>
                    <View
                      className={`w-5 rounded-t-[4px] ${index === report.learningPerformance.length - 1 ? 'bg-[#14543E]' : 'bg-[#91B397]'}`}
                      style={{ height: Math.max(3, (item.activeLearners / maxDailyLearners) * 55) }}
                    />
                  </View>
                ))}
              </View>
              <View className="mt-1 flex-row justify-around border-t border-[#E9EDE9] pt-1.5 dark:border-[#35443A]">
                {report.learningPerformance.map((item, index) => (
                  <Text key={`${item.day}-label-${index}`} className={`flex-1 text-center text-[7px] ${index === report.learningPerformance.length - 1 ? 'font-bold text-[#14543E]' : 'text-[#89918B]'}`}>
                    {item.day}
                  </Text>
                ))}
              </View>
            </>
          ) : (
            <Text className="py-8 text-center text-[10px] text-[#78817B] dark:text-[#AAB6AD]">Weekly activity is unavailable.</Text>
          )}
        </View>

        <View className="mt-2 rounded-xl border border-[#E3E8E2] bg-white px-3 dark:border-[#35443A] dark:bg-[#1D2922]">
          <MetricRow
            icon="♧"
            label="Certificates issued"
            value={loading || !report ? '—' : report.certificatesIssued.toLocaleString()}
            detail="All-time total"
          />
          <MetricRow
            icon="▤"
            label="Average course completion"
            value={loading || !report ? '—' : completionValue}
            detail={!report ? '—' : report.completionRateEnrollmentCount
              ? `Across ${report.completionRateEnrollmentCount} enrolments`
              : 'No course progress recorded'}
          />
          <MetricRow
            icon="▣"
            label="Active opportunities"
            value={loading || !report ? '—' : report.activeOpportunities.toLocaleString()}
            detail="Currently open vacancies"
          />
        </View>
      </ScrollView>

      <AdminBottomNav active="Reports" />
    </View>
  );
}
