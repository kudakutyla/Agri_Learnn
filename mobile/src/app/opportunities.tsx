import { useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { BottomNav } from '../components/BottomNav';
import { api, type Application, type Job } from '../services/api';
import { getStorageItem } from '../services/storage';
import { useUiText } from '../services/useUiText';

async function fetchOpportunityData(t: (text: string) => string) {
  const { jobs } = await api.jobs.list();
  try {
    const token = await getStorageItem('agrilearn_token');
    if (!token) return { jobs, applications: [], applicationError: '' };
    const { applications } = await api.applications.list();
    return { jobs, applications, applicationError: '' };
  } catch (error) {
    return {
      jobs,
      applications: [],
      applicationError: error instanceof Error ? t(error.message) : t('Could not load your applications.'),
    };
  }
}

export default function OpportunitiesScreen() {
  const { t } = useUiText();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [applicationError, setApplicationError] = useState('');

  async function loadOpportunities(refresh = false) {
    setError('');
    setApplicationError('');
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await fetchOpportunityData(t);
      setJobs(data.jobs);
      setApplications(data.applications);
      setApplicationError(data.applicationError);
    } catch (loadError) {
      setError(loadError instanceof Error ? t(loadError.message) : t('Could not load opportunities.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    let active = true;
    void fetchOpportunityData(t)
      .then((data) => {
        if (!active) return;
        setJobs(data.jobs);
        setApplications(data.applications);
        setApplicationError(data.applicationError);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? t(loadError.message) : t('Could not load opportunities.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [t]);

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return jobs;
    return jobs.filter((job) => `${job.title} ${job.location} ${job.type} ${job.description}`.toLowerCase().includes(query));
  }, [jobs, search]);

  async function applyForJob(job: Job) {
    try {
      const token = await getStorageItem('agrilearn_token');
      if (!token) {
        router.push('/login');
        return;
      }
      setApplyingJobId(job.id);
      setApplicationError('');
      const { application } = await api.applications.submit(job.id);
      setApplications((current) => [...current, application]);
    } catch (submitError) {
      setApplicationError(submitError instanceof Error ? t(submitError.message) : t('Could not submit your application.'));
    } finally {
      setApplyingJobId(null);
    }
  }

  return (
    <View className="flex-1 bg-[#F7F7F2] dark:bg-[#101814]">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-6 pt-5"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { void loadOpportunities(true); }} />}
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-[22px] font-extrabold text-[#17261E] dark:text-[#F1F4F1]">{t('Opportunities')}</Text>
            <Text className="mt-1 text-[11px] leading-4 text-[#7B837D] dark:text-[#AAB6AD]">
              {t('Find agricultural roles and projects that match your skills.')}
            </Text>
          </View>
          <View className="h-10 w-10 items-center justify-center rounded-[14px] bg-[#E8F0E7] dark:bg-[#25342B]">
            <Text className="text-lg font-bold text-[#14543E] dark:text-[#8FC6A4]">↗</Text>
          </View>
        </View>

        <View className="mt-5 h-11 flex-row items-center rounded-xl border border-[#E1E5DF] bg-white px-3 dark:border-[#35443A] dark:bg-[#1D2922]">
          <Text className="mr-2 text-base text-[#78817B]">⌕</Text>
          <TextInput
            accessibilityLabel={t('Search opportunities')}
            value={search}
            onChangeText={setSearch}
            placeholder={t('Search role, location or type')}
            placeholderTextColor="#A0A7A1"
            className="h-full flex-1 text-[12px] text-[#252B27] dark:text-[#F1F4F1]"
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable accessibilityRole="button" accessibilityLabel={t('Clear search')} onPress={() => setSearch('')}>
              <Text className="px-1 text-lg text-[#78817B]">×</Text>
            </Pressable>
          )}
        </View>

        <View className="mt-5 flex-row items-center justify-between">
          <Text className="text-[15px] font-extrabold text-[#252B27] dark:text-[#F1F4F1]">{t('Open opportunities')}</Text>
          {!loading && !error && (
            <Text className="text-[10px] text-[#7B837D] dark:text-[#AAB6AD]">{filteredJobs.length} {t('found')}</Text>
          )}
        </View>

        {applicationError ? (
          <Text accessibilityRole="alert" className="mt-3 rounded-xl bg-[#FFF1E8] px-3 py-2.5 text-[10px] leading-4 text-[#8B3F21]">
            {applicationError}
          </Text>
        ) : null}

        {loading ? (
          <View className="mt-4 rounded-2xl border border-[#E5E8E2] bg-white p-5 dark:border-[#35443A] dark:bg-[#1D2922]">
            <Text className="text-[11px] text-[#7B837D] dark:text-[#AAB6AD]">{t('Loading opportunities…')}</Text>
          </View>
        ) : error ? (
          <View className="mt-4 items-start rounded-2xl border border-[#E5E8E2] bg-white p-5 dark:border-[#35443A] dark:bg-[#1D2922]">
            <Text accessibilityRole="alert" className="text-[12px] font-semibold text-[#9A382C] dark:text-[#FFB4A9]">{error}</Text>
            <Pressable accessibilityRole="button" onPress={() => { void loadOpportunities(); }} className="mt-3 rounded-lg bg-[#14543E] px-4 py-2.5">
              <Text className="text-[10px] font-bold text-white">{t('Try again')}</Text>
            </Pressable>
          </View>
        ) : filteredJobs.length > 0 ? (
          filteredJobs.map((job) => {
            const applied = applications.some((application) => application.jobId === job.id);
            return (
              <View key={job.id} className="mt-3 rounded-2xl border border-[#E5E8E2] bg-white p-4 dark:border-[#35443A] dark:bg-[#1D2922]">
                <View className="flex-row items-start justify-between gap-3">
                  <Text className="flex-1 text-[15px] font-extrabold leading-5 text-[#252B27] dark:text-[#F1F4F1]">{job.title}</Text>
                  <Text className="rounded-full bg-[#EAF1E8] px-2.5 py-1 text-[9px] font-bold text-[#477E62] dark:bg-[#253A2D] dark:text-[#A9D6B6]">{t('OPEN')}</Text>
                </View>
                <Text className="mt-2 text-[10px] text-[#687069] dark:text-[#AAB6AD]">{job.location}  ·  {job.type}</Text>
                <Text numberOfLines={3} className="mt-2 text-[11px] leading-[18px] text-[#59635C] dark:text-[#C1CCC3]">{job.description}</Text>
                {job.requiredSkills && job.requiredSkills.length > 0 ? (
                  <View className="mt-3">
                    <Text className="mb-1.5 text-[10px] font-extrabold text-[#34483A] dark:text-[#DCE7DE]">{t('Skills needed')}</Text>
                    <View className="flex-row flex-wrap gap-1.5">
                      {job.requiredSkills.map((skill) => (
                        <Text key={skill} className="rounded-full bg-[#EAF1E8] px-2.5 py-1 text-[9px] font-semibold text-[#477E62] dark:bg-[#253A2D] dark:text-[#A9D6B6]">
                          {skill}
                        </Text>
                      ))}
                    </View>
                  </View>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={applied ? `${t('Application submitted for')} ${job.title}` : `${t('Apply for')} ${job.title}`}
                  accessibilityState={{ disabled: applied || applyingJobId === job.id }}
                  disabled={applied || applyingJobId === job.id}
                  onPress={() => { void applyForJob(job); }}
                  className={`mt-4 h-10 items-center justify-center rounded-xl ${applied ? 'bg-[#E8EBE6] dark:bg-[#34483A]' : 'bg-[#14543E]'}`}
                >
                  <Text className={`text-[11px] font-extrabold ${applied ? 'text-[#687069] dark:text-[#C1CCC3]' : 'text-white'}`}>
                    {applied ? t('Application submitted') : applyingJobId === job.id ? t('Submitting…') : t('Apply now')}
                  </Text>
                </Pressable>
              </View>
            );
          })
        ) : (
          <View className="mt-4 items-center rounded-2xl border border-[#E5E8E2] bg-white px-6 py-8 dark:border-[#35443A] dark:bg-[#1D2922]">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-[#EAF1E8] dark:bg-[#253A2D]">
              <Text className="text-xl text-[#477E62] dark:text-[#A9D6B6]">{search.trim() ? '⌕' : '↗'}</Text>
            </View>
            <Text className="mt-3 text-center text-[13px] font-extrabold text-[#252B27] dark:text-[#F1F4F1]">
              {search.trim() ? t('No matching opportunities') : t('No opportunities available yet')}
            </Text>
            <Text className="mt-1.5 text-center text-[10px] leading-4 text-[#7B837D] dark:text-[#AAB6AD]">
              {search.trim()
                ? t('Try another role, location or opportunity type.')
                : t('New roles and projects will appear here when employers publish them.')}
            </Text>
            {!search.trim() && (
              <Pressable accessibilityRole="button" onPress={() => router.replace('/explore')} className="mt-4 rounded-lg bg-[#14543E] px-4 py-2.5">
                <Text className="text-[10px] font-bold text-white">{t('Explore courses')}</Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>
      <BottomNav />
    </View>
  );
}
