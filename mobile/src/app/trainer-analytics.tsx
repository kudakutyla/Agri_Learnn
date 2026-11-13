import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { CreatorBottomNav } from '../components/CreatorBottomNav';
import { api, type TrainerActiveLearners, type TrainerAnalytics } from '../services/api';
import { useUiText } from '../services/useUiText';

function percentage(value: number | null) {
  return value === null ? '—' : `${value}%`;
}

type MetricKey =
  | 'publishedCourses'
  | 'enrollmentCount'
  | 'activeLearnerCount'
  | 'averageCompletionRate'
  | 'assessmentAttemptCount'
  | 'averageAssessmentScore'
  | 'assessmentPassRate'
  | 'certificatesEarned';

type MetricDefinition = {
  metricKey: MetricKey;
  label: string;
  value: string;
  detail?: string;
};

function courseMetricValue(course: TrainerAnalytics['courses'][number], key: MetricKey) {
  switch (key) {
    case 'publishedCourses': return '1';
    case 'enrollmentCount': return String(course.enrollmentCount);
    case 'activeLearnerCount': return String(course.activeLearnerCount);
    case 'averageCompletionRate': return percentage(course.averageCompletionRate);
    case 'assessmentAttemptCount': return String(course.assessment.attemptCount);
    case 'averageAssessmentScore': return percentage(course.assessment.averageScore);
    case 'assessmentPassRate': return percentage(course.assessment.passRate);
    case 'certificatesEarned': return String(course.certificatesEarned);
  }
}

function MetricCard({
  label,
  value,
  detail,
  selected,
  onPress,
}: MetricDefinition & { selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}. View course breakdown.`}
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`min-h-[82px] flex-1 rounded-xl border p-3 ${selected ? 'border-[#14543E] bg-[#EAF1E8] dark:border-[#42664F] dark:bg-[#23362A]' : 'border-[#E3E8E2] bg-white dark:border-[#35443A] dark:bg-[#1D2922]'}`}
    >
      <View className="flex-row items-start justify-between">
        <Text className="flex-1 pr-1 text-[8px] font-semibold text-[#78817B] dark:text-[#AAB6AD]">{label}</Text>
        <Text className={`text-[9px] font-bold ${selected ? 'text-[#14543E] dark:text-[#B7E2C2]' : 'text-[#89918B] dark:text-[#AAB6AD]'}`}>›</Text>
      </View>
      <Text className="mt-1 text-[19px] font-extrabold text-[#14543E] dark:text-[#B7E2C2]">{value}</Text>
      {detail ? <Text className="mt-0.5 text-[8px] text-[#78817B] dark:text-[#AAB6AD]">{detail}</Text> : null}
    </Pressable>
  );
}

export default function TrainerAnalyticsScreen() {
  const [report, setReport] = useState<TrainerAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedMetric, setSelectedMetric] = useState<MetricKey | null>(null);
  const [activeLearnerDetails, setActiveLearnerDetails] = useState<TrainerActiveLearners | null>(null);
  const [activeLearnerDetailsLoading, setActiveLearnerDetailsLoading] = useState(false);
  const [activeLearnerDetailsError, setActiveLearnerDetailsError] = useState('');
  const activeLearnerRequest = useRef(0);
  const { t } = useUiText();

  async function loadAnalytics(refresh = false) {
    setError('');
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      setReport(await api.trainer.analytics());
    } catch (loadError) {
      setError(loadError instanceof Error ? t(loadError.message) : t('Could not load learner analytics.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    let active = true;
    api.trainer.analytics()
      .then((result) => {
        if (active) setReport(result);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? t(loadError.message) : t('Could not load learner analytics.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [t]);

  async function loadActiveLearnerDetails() {
    const requestId = ++activeLearnerRequest.current;
    setActiveLearnerDetails(null);
    setActiveLearnerDetailsError('');
    setActiveLearnerDetailsLoading(true);
    try {
      const result = await api.trainer.activeLearners();
      if (requestId === activeLearnerRequest.current) setActiveLearnerDetails(result);
    } catch (loadError) {
      if (requestId === activeLearnerRequest.current) {
        setActiveLearnerDetailsError(
          loadError instanceof Error ? t(loadError.message) : t('Could not load active learners.'),
        );
      }
    } finally {
      if (requestId === activeLearnerRequest.current) setActiveLearnerDetailsLoading(false);
    }
  }

  function selectMetric(metricKey: MetricKey) {
    const nextMetric = selectedMetric === metricKey ? null : metricKey;
    setSelectedMetric(nextMetric);
    activeLearnerRequest.current += 1;
    setActiveLearnerDetails(null);
    setActiveLearnerDetailsError('');
    setActiveLearnerDetailsLoading(false);
    if (nextMetric === 'activeLearnerCount') void loadActiveLearnerDetails();
  }

  function closeMetricBreakdown() {
    activeLearnerRequest.current += 1;
    setSelectedMetric(null);
    setActiveLearnerDetails(null);
    setActiveLearnerDetailsError('');
    setActiveLearnerDetailsLoading(false);
  }

  const summary = report?.summary;
  const metricCards: MetricDefinition[] = summary ? [
    { metricKey: 'publishedCourses', label: t('Published courses'), value: String(summary.publishedCourses) },
    { metricKey: 'enrollmentCount', label: t('Enrolments'), value: String(summary.enrollmentCount) },
    {
      metricKey: 'activeLearnerCount',
      label: t('Active learners'),
      value: String(summary.activeLearnerCount),
      detail: t('Last 30 days'),
    },
    { metricKey: 'averageCompletionRate', label: t('Average completion'), value: percentage(summary.averageCompletionRate) },
    { metricKey: 'assessmentAttemptCount', label: t('Assessment attempts'), value: String(summary.assessmentAttemptCount) },
    { metricKey: 'averageAssessmentScore', label: t('Average assessment score'), value: percentage(summary.averageAssessmentScore) },
    { metricKey: 'assessmentPassRate', label: t('Assessment pass rate'), value: percentage(summary.assessmentPassRate) },
    { metricKey: 'certificatesEarned', label: t('Certificates earned'), value: String(summary.certificatesEarned) },
  ] : [];
  const selectedMetricDefinition = metricCards.find((metric) => metric.metricKey === selectedMetric);

  return (
    <View className="flex-1 bg-[#F7F7F2] dark:bg-[#101814]">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-5 pt-12"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { void loadAnalytics(true); }} />}
      >
        <View className="mb-4">
          <Text className="text-[22px] font-extrabold leading-7 text-[#252B27] dark:text-[#F1F4F1]">{t('Learner analytics')}</Text>
          <Text className="mt-1 text-[9px] leading-4 text-[#78817B] dark:text-[#AAB6AD]">
            {t('Aggregate learning activity for your published courses. Active learner names appear only in that detail view.')}
          </Text>
        </View>

        {error ? (
          <View className="mb-4 rounded-xl border border-[#F0D1C8] bg-white p-4 dark:bg-[#1D2922]">
            <Text accessibilityRole="alert" className="text-[10px] leading-4 text-[#9A382C]">{error}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => { void loadAnalytics(); }}
              className="mt-3 self-start rounded-lg bg-[#14543E] px-4 py-2"
            >
              <Text className="text-[9px] font-bold text-white">{t('Try again')}</Text>
            </Pressable>
          </View>
        ) : null}

        {loading && !report ? (
          <View className="rounded-xl border border-[#E3E8E2] bg-white p-5 dark:border-[#35443A] dark:bg-[#1D2922]">
            <Text className="text-center text-[10px] text-[#78817B] dark:text-[#AAB6AD]">{t('Loading learner analytics…')}</Text>
          </View>
        ) : report && report.courses.length === 0 ? (
          <View className="rounded-xl border border-[#E3E8E2] bg-white p-5 dark:border-[#35443A] dark:bg-[#1D2922]">
            <Text className="text-sm font-bold text-[#252B27] dark:text-[#F1F4F1]">{t('No published courses yet')}</Text>
            <Text className="mt-1 text-[9px] leading-4 text-[#78817B] dark:text-[#AAB6AD]">
              {t('Analytics will appear here after one of your courses is approved and learners begin studying.')}
            </Text>
          </View>
        ) : summary ? (
          <>
            {Array.from({ length: Math.ceil(metricCards.length / 2) }, (_, row) => (
              <View key={`metric-row-${row}`} className="mb-2 flex-row gap-2">
                {metricCards.slice(row * 2, row * 2 + 2).map((metric) => (
                  <MetricCard
                    key={metric.metricKey}
                    metricKey={metric.metricKey}
                    label={metric.label}
                    value={metric.value}
                    detail={metric.detail}
                    selected={selectedMetric === metric.metricKey}
                    onPress={() => selectMetric(metric.metricKey)}
                  />
                ))}
              </View>
            ))}

            {selectedMetricDefinition ? (
              <View className="mb-5 rounded-xl border border-[#C7D9C9] bg-[#F0F6EF] p-3 dark:border-[#35443A] dark:bg-[#1D2922]">
                <View className="flex-row items-start justify-between">
                  <Text className="flex-1 text-[11px] font-extrabold text-[#252B27] dark:text-[#F1F4F1]">
                    {selectedMetricDefinition.label} · {t('Course breakdown')}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('Close course breakdown')}
                    onPress={closeMetricBreakdown}
                    className="ml-2 px-1"
                  >
                    <Text className="text-[13px] font-bold text-[#14543E]">×</Text>
                  </Pressable>
                </View>
                {selectedMetricDefinition.metricKey === 'activeLearnerCount' ? (
                  <>
                    <Text className="mt-1 text-[8px] leading-3 text-[#647169]">
                      {t('Learners with activity in the last 30 days. Names are loaded only for this detail view.')}
                    </Text>
                    {activeLearnerDetailsLoading ? (
                      <View className="items-center py-4">
                        <ActivityIndicator color="#14543E" />
                        <Text className="mt-2 text-[9px] text-[#78817B]">{t('Loading active learners…')}</Text>
                      </View>
                    ) : activeLearnerDetailsError ? (
                      <View className="mt-2 border-t border-[#DDE7DD] pt-2">
                        <Text accessibilityRole="alert" className="text-[9px] leading-4 text-[#9A382C]">{activeLearnerDetailsError}</Text>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => { void loadActiveLearnerDetails(); }}
                          className="mt-2 self-start rounded-lg bg-[#14543E] px-3 py-2"
                        >
                          <Text className="text-[9px] font-bold text-white">{t('Try again')}</Text>
                        </Pressable>
                      </View>
                    ) : activeLearnerDetails ? activeLearnerDetails.courses.map((course) => (
                      <View key={`active-learners-${course.id}`} className="mt-2 border-t border-[#DDE7DD] pt-2">
                        <View className="flex-row items-start justify-between gap-3">
                          <Text numberOfLines={2} className="flex-1 text-[9px] font-semibold text-[#3D4942]">{course.title}</Text>
                          <Text className="text-[10px] font-extrabold text-[#14543E]">{course.activeLearners.length}</Text>
                        </View>
                        {course.activeLearners.length ? course.activeLearners.map((learner, index) => (
                          <Text key={`${course.id}-active-learner-${index}`} className="mt-1 text-[9px] text-[#647169]">
                            {learner.name}
                          </Text>
                        )) : (
                          <Text className="mt-1 text-[8px] text-[#89918B]">{t('No active learners recorded.')}</Text>
                        )}
                      </View>
                    )) : null}
                  </>
                ) : (
                  <>
                    <Text className="mt-1 text-[8px] leading-3 text-[#647169]">
                      {t('Per-course values let you compare the published courses included in this metric.')}
                    </Text>
                    {report.courses.map((course) => (
                      <View key={`${selectedMetricDefinition.metricKey}-${course.id}`} className="mt-2 flex-row items-center justify-between border-t border-[#DDE7DD] pt-2">
                        <Text numberOfLines={2} className="flex-1 pr-3 text-[9px] font-semibold text-[#3D4942]">
                          {course.title}
                        </Text>
                        <Text className="text-[10px] font-extrabold text-[#14543E]">
                          {courseMetricValue(course, selectedMetricDefinition.metricKey)}
                        </Text>
                      </View>
                    ))}
                  </>
                )}
              </View>
            ) : (
              <Text className="mb-4 text-center text-[8px] text-[#89918B]">{t('Tap a card to view its course breakdown.')}</Text>
            )}

            <Text className="mb-2 text-[15px] font-extrabold text-[#252B27] dark:text-[#F1F4F1]">{t('Course breakdown')}</Text>
            {report.courses.map((course) => (
              <View key={course.id} className="mb-3 rounded-xl border border-[#E3E8E2] bg-white p-4 dark:border-[#35443A] dark:bg-[#1D2922]">
                <Text className="text-[13px] font-extrabold text-[#252B27] dark:text-[#F1F4F1]">{course.title}</Text>
                <View className="mt-2 flex-row flex-wrap gap-x-4 gap-y-1">
                  <Text className="text-[9px] text-[#647169] dark:text-[#B5C0B7]">{t('Enrolments')}: {course.enrollmentCount}</Text>
                  <Text className="text-[9px] text-[#647169] dark:text-[#B5C0B7]">{t('Average completion')}: {percentage(course.averageCompletionRate)}</Text>
                  <Text className="text-[9px] text-[#647169] dark:text-[#B5C0B7]">{t('Certificates earned')}: {course.certificatesEarned}</Text>
                </View>

                <Text className="mb-1 mt-4 text-[10px] font-extrabold text-[#252B27] dark:text-[#F1F4F1]">{t('Lesson progress')}</Text>
                {course.lessons.length ? course.lessons.map((lesson, index) => (
                  <View key={`${course.id}-lesson-${index}`} className="border-t border-[#E9EDE9] py-2">
                    <View className="flex-row items-center justify-between gap-2">
                      <Text numberOfLines={2} className="flex-1 text-[9px] text-[#3D4942] dark:text-[#E2EAE3]">{lesson.title}</Text>
                      <Text className="text-[8px] font-semibold text-[#647169] dark:text-[#B5C0B7]">
                        {lesson.completedCount}/{course.enrollmentCount} · {percentage(lesson.completionRate)}
                      </Text>
                    </View>
                  </View>
                )) : (
                  <Text className="border-t border-[#E9EDE9] py-2 text-[9px] text-[#78817B] dark:border-[#35443A] dark:text-[#AAB6AD]">{t('No lessons in this course.')}</Text>
                )}

                <Text className="mb-1 mt-3 text-[10px] font-extrabold text-[#252B27] dark:text-[#F1F4F1]">{t('Assessment performance')}</Text>
                <View className="flex-row flex-wrap gap-x-4 gap-y-1 border-t border-[#E9EDE9] pt-2 dark:border-[#35443A]">
                  <Text className="text-[9px] text-[#647169] dark:text-[#B5C0B7]">{t('Attempts')}: {course.assessment.attemptCount}</Text>
                  <Text className="text-[9px] text-[#647169] dark:text-[#B5C0B7]">{t('Average score')}: {percentage(course.assessment.averageScore)}</Text>
                  <Text className="text-[9px] text-[#647169] dark:text-[#B5C0B7]">{t('Passed')}: {course.assessment.passedCount}</Text>
                  <Text className="text-[9px] text-[#647169] dark:text-[#B5C0B7]">{t('Pass rate')}: {percentage(course.assessment.passRate)}</Text>
                </View>
              </View>
            ))}
            <Text className="mb-2 text-center text-[8px] text-[#89918B]">
              {t('Active learner counts cover the last 30 days. Pull down to refresh.')}
            </Text>
          </>
        ) : null}
      </ScrollView>
      <CreatorBottomNav />
    </View>
  );
}
