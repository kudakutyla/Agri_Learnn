import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import {
  api,
  type EnterpriseDiagnostic,
  type EnterprisePlan,
  type EnterprisePlanUpdate,
  type Profile,
  type Course,
} from '../services/api';

const diagnosticDimensions: {
  key: keyof EnterpriseDiagnostic;
  title: string;
  category: string;
}[] = [
  { key: 'registrationLegalForm', title: 'Registration and legal form', category: 'Agricultural Entrepreneurship' },
  { key: 'managementGovernance', title: 'Management and governance', category: 'Co-operative Management' },
  { key: 'financeRecordKeeping', title: 'Finance and record-keeping', category: 'Farm Financial Management' },
  { key: 'marketReadiness', title: 'Market readiness', category: 'Export Readiness' },
  { key: 'technologyAdoption', title: 'Technology adoption', category: 'Technology' },
  { key: 'skillsProfile', title: 'Skills profile', category: 'Agricultural Entrepreneurship' },
  { key: 'regulatoryCompliance', title: 'Regulatory compliance', category: 'Food Safety' },
  { key: 'productionCapability', title: 'Production capability', category: 'Crop Production' },
  { key: 'logistics', title: 'Logistics', category: 'Export Readiness' },
  { key: 'fundingReadiness', title: 'Funding readiness', category: 'Farm Financial Management' },
  { key: 'digitalMaturity', title: 'Digital maturity', category: 'Data Analytics' },
];

function hasCompleteDiagnostic(diagnostic: Partial<EnterpriseDiagnostic>): diagnostic is EnterpriseDiagnostic {
  return diagnosticDimensions.every(({ key }) => {
    const score = diagnostic[key];
    return Number.isInteger(score) && score !== undefined && score >= 1 && score <= 5;
  });
}

const fundingChecklistItems = [
  { id: 'registration', label: 'Business registration documents are available' },
  { id: 'financial-records', label: 'Financial records are organised' },
  { id: 'business-plan', label: 'A current business plan is prepared' },
  { id: 'cashflow-forecast', label: 'A cash-flow forecast is prepared' },
] as const;

const emptyBusinessProfile = {
  businessName: '',
  legalForm: '',
  province: '',
  sector: '',
  productsServices: '',
  businessDescription: '',
};

function getDiagnosticScore(diagnostic: EnterpriseDiagnostic | undefined) {
  if (!diagnostic) return null;
  const scores = Object.values(diagnostic);
  return Math.round(scores.reduce((total, score) => total + score, 0) / scores.length * 20);
}

function SectionTitle({ step, title, detail }: { step: string; title: string; detail: string }) {
  return (
    <View className="mb-4 flex-row items-start gap-3">
    <View className="h-8 w-8 items-center justify-center rounded-full bg-[#E8F0E7] dark:bg-[#23362A]">
        <Text className="text-xs font-extrabold text-[#14543E]">{step}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-base font-extrabold text-[#173D2D] dark:text-[#F1F4F1]">{title}</Text>
        <Text className="mt-1 text-xs leading-5 text-[#717A74] dark:text-[#B5C0B7]">{detail}</Text>
      </View>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  disabled = false,
  secondary = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      className={`min-h-11 items-center justify-center rounded-xl px-4 ${
        secondary ? 'border border-[#DDE4DC] bg-white dark:border-[#35443A] dark:bg-[#1D2922]' : 'bg-[#14543E]'
      } ${disabled ? 'opacity-50' : ''}`}
    >
      <Text className={`text-sm font-bold ${secondary ? 'text-[#14543E] dark:text-[#B7E2C2]' : 'text-white'}`}>{label}</Text>
    </Pressable>
  );
}

export default function SmmeScreen() {
  const [plan, setPlan] = useState<EnterprisePlan | null>(null);
  const [businessProfile, setBusinessProfile] = useState(emptyBusinessProfile);
  const [accountProfile, setAccountProfile] = useState<Profile | null>(null);
  const [diagnostic, setDiagnostic] = useState<Partial<EnterpriseDiagnostic>>({});
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [courseError, setCourseError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([api.profile.get(), api.smme.plan.get()])
      .then(([profileResult, planResult]) => {
        if (!active) return;
        const savedPlan = planResult.plan;
        setAccountProfile(profileResult.user);
        setPlan(savedPlan);
        setBusinessProfile({
          businessName: savedPlan?.businessName ?? '',
          legalForm: savedPlan?.legalForm ?? '',
          province: savedPlan?.province || profileResult.user.province || '',
          sector: savedPlan?.sector ?? '',
          productsServices: savedPlan?.productsServices ?? '',
          businessDescription: savedPlan?.businessDescription ?? '',
        });
        setDiagnostic(savedPlan?.diagnostic ?? {});
        setErrorMessage('');
      })
      .catch((error: unknown) => {
        if (active) setErrorMessage(error instanceof Error ? error.message : 'Could not load your SMME plan.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!plan?.diagnostic) return;
    let active = true;
    api.courses.listPublished()
      .then(({ courses: publishedCourses }) => {
        if (active) {
          setCourses(publishedCourses);
          setCourseError('');
        }
      })
      .catch((error: unknown) => {
        if (active) setCourseError(error instanceof Error ? error.message : 'Could not load published courses.');
      });
    return () => { active = false; };
  }, [plan?.diagnostic]);

  async function savePlan(update: EnterprisePlanUpdate) {
    setErrorMessage('');
    try {
      const result = await api.smme.plan.update(update);
      setPlan(result.plan);
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not save your SMME plan.');
      return false;
    }
  }

  async function saveBusinessProfile() {
    if (businessProfile.businessName.trim().length < 2) {
      setErrorMessage('Enter a business name with at least 2 characters.');
      return;
    }
    setSaving('profile');
    await savePlan({
      businessName: businessProfile.businessName.trim(),
      legalForm: businessProfile.legalForm.trim(),
      province: businessProfile.province.trim(),
      sector: businessProfile.sector.trim(),
      productsServices: businessProfile.productsServices.trim(),
      businessDescription: businessProfile.businessDescription.trim(),
    });
    setSaving('');
  }

  async function saveDiagnostic() {
    if (!plan?.businessName) {
      setErrorMessage('Save your business profile before completing the assessment.');
      return;
    }
    if (!hasCompleteDiagnostic(diagnostic)) {
      setErrorMessage('Rate all 11 areas before saving the assessment.');
      return;
    }
    setSaving('diagnostic');
    await savePlan({ diagnostic });
    setSaving('');
  }

  async function toggleFundingItem(id: string) {
    const currentItems = plan?.fundingChecklist ?? [];
    const nextItems = currentItems.includes(id)
      ? currentItems.filter((item) => item !== id)
      : [...currentItems, id];
    setSaving('funding');
    await savePlan({ fundingChecklist: nextItems });
    setSaving('');
  }

  async function recordMentorNeed() {
    setSaving('mentor');
    await savePlan({ mentorRequested: true });
    setSaving('');
  }

  const gapDimensions = diagnosticDimensions.filter(({ key }) => plan?.diagnostic && plan.diagnostic[key] <= 2);
  const gapCategories = new Set(gapDimensions.map(({ category }) => category.toLowerCase()));
  const recommendedCourses = courses.filter((course) =>
    gapCategories.has(course.category.toLowerCase())
    || (course.skills ?? []).some((skill) => gapDimensions.some(({ title }) => skill.toLowerCase().includes(title.toLowerCase()))),
  );
  const fundingChecklist = plan?.fundingChecklist ?? [];
  const assessmentHistory = plan?.assessmentHistory ?? [];
  const currentScore = getDiagnosticScore(plan?.diagnostic);
  const profileIsReady = Boolean(
    plan?.businessName
    && plan.legalForm
    && plan.province
    && plan.sector
    && plan.productsServices
    && plan.businessDescription,
  );

  const stages = [
    { title: 'Register', done: Boolean(accountProfile && plan?.businessName), detail: 'Your AgriLearn account and business profile are registered.' },
    { title: 'Digital maturity assessment', done: Boolean(plan?.diagnostic), detail: 'Assess 11 areas of enterprise readiness.' },
    { title: 'Skills-gap identification', done: Boolean(plan?.diagnostic), detail: 'Lower-rated areas are highlighted from your assessment.' },
    { title: 'Training plan', done: Boolean(plan?.diagnostic), detail: 'See course topics and available published training.' },
    { title: 'Mentor assignment', done: false, detail: plan?.mentorRequested ? 'Mentor need recorded; no match is assigned yet.' : 'Record that your enterprise needs a mentor.' },
    { title: 'Funding readiness', done: fundingChecklist.length === fundingChecklistItems.length, detail: 'Prepare core business and financial records.' },
    { title: 'Market linkage preparation', done: false, detail: profileIsReady ? 'Business profile prepared; no buyer directory is connected.' : 'Complete your business profile before market linkage is available.' },
    { title: 'Growth monitoring', done: assessmentHistory.length > 1, detail: 'Repeat the assessment over time to compare progress.' },
  ];
  const completedStages = stages.filter((stage) => stage.done).length;

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F7F8F4] dark:bg-[#101814]">
        <ActivityIndicator color="#14543E" />
        <Text className="mt-3 text-sm text-[#717A74]">Loading your SMME growth plan…</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F7F8F4] dark:bg-[#101814]">
      <ScrollView className="flex-1" contentContainerClassName="gap-4 px-4 pb-8 pt-4">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-xs font-bold uppercase tracking-[1px] text-[#52715E] dark:text-[#A9CDB2]">AgriLearn · SMME</Text>
            <Text className="mt-1 text-[24px] font-extrabold text-[#173D2D] dark:text-[#F1F4F1]">Grow your enterprise</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={() => router.push('/dashboard')} className="rounded-xl border border-[#DDE4DC] bg-white px-3 py-2 dark:border-[#35443A] dark:bg-[#1D2922]">
            <Text className="text-xs font-bold text-[#14543E] dark:text-[#B7E2C2]">Account</Text>
          </Pressable>
        </View>

        <View className="rounded-2xl bg-[#14543E] p-4">
          <View className="flex-row items-end justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-xs font-bold uppercase tracking-wide text-white/70">Your development journey</Text>
              <Text className="mt-2 text-sm leading-5 text-white">{completedStages} of 8 steps in progress</Text>
            </View>
            <Text className="text-[26px] font-extrabold text-white">{Math.round(completedStages / stages.length * 100)}%</Text>
          </View>
          <View className="mt-3 h-2 overflow-hidden rounded-full bg-white/20">
            <View className="h-full rounded-full bg-[#E7C769]" style={{ width: `${completedStages / stages.length * 100}%` }} />
          </View>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {stages.map((stage, index) => (
              <View key={stage.title} accessibilityLabel={`${stage.title}: ${stage.done ? 'complete' : 'not complete'}`} className={`rounded-full px-2 py-1 ${stage.done ? 'bg-white/20' : 'bg-black/10'}`}>
                <Text className="text-[10px] font-bold text-white">{index + 1} {stage.done ? '✓' : '·'}</Text>
              </View>
            ))}
          </View>
        </View>

        {errorMessage ? (
          <Text accessibilityRole="alert" className="rounded-xl border border-[#E8C7C2] bg-[#FFF2F0] px-4 py-3 text-sm leading-5 text-[#8F3229]">
            {errorMessage}
          </Text>
        ) : null}

        <View className="rounded-2xl border border-[#E3E8E1] bg-white p-4 dark:border-[#35443A] dark:bg-[#1D2922]">
          <SectionTitle step="1" title="Register your enterprise" detail="Add the business information used to shape your growth plan." />
          <View className="gap-3">
            <TextInput value={businessProfile.businessName} onChangeText={(value) => setBusinessProfile({ ...businessProfile, businessName: value })} maxLength={120} placeholder="Business or co-operative name" className="rounded-xl border border-[#DDE4DC] bg-white px-4 py-3 text-sm dark:border-[#35443A] dark:bg-[#101814] dark:text-[#E2EAE3]" />
            <TextInput value={businessProfile.legalForm} onChangeText={(value) => setBusinessProfile({ ...businessProfile, legalForm: value })} maxLength={100} placeholder="Legal form (e.g. co-operative, company)" className="rounded-xl border border-[#DDE4DC] bg-white px-4 py-3 text-sm dark:border-[#35443A] dark:bg-[#101814] dark:text-[#E2EAE3]" />
            <TextInput value={businessProfile.province} onChangeText={(value) => setBusinessProfile({ ...businessProfile, province: value })} maxLength={80} placeholder="Province" className="rounded-xl border border-[#DDE4DC] bg-white px-4 py-3 text-sm dark:border-[#35443A] dark:bg-[#101814] dark:text-[#E2EAE3]" />
            <TextInput value={businessProfile.sector} onChangeText={(value) => setBusinessProfile({ ...businessProfile, sector: value })} maxLength={120} placeholder="Agricultural sector or commodity" className="rounded-xl border border-[#DDE4DC] bg-white px-4 py-3 text-sm dark:border-[#35443A] dark:bg-[#101814] dark:text-[#E2EAE3]" />
            <TextInput value={businessProfile.productsServices} onChangeText={(value) => setBusinessProfile({ ...businessProfile, productsServices: value })} maxLength={500} placeholder="Products or services" className="rounded-xl border border-[#DDE4DC] bg-white px-4 py-3 text-sm dark:border-[#35443A] dark:bg-[#101814] dark:text-[#E2EAE3]" />
            <TextInput value={businessProfile.businessDescription} onChangeText={(value) => setBusinessProfile({ ...businessProfile, businessDescription: value })} maxLength={1000} multiline placeholder="Brief business description" className="min-h-20 rounded-xl border border-[#DDE4DC] bg-white px-4 py-3 text-sm dark:border-[#35443A] dark:bg-[#101814] dark:text-[#E2EAE3]" />
            <ActionButton label={saving === 'profile' ? 'Saving…' : 'Save business profile'} disabled={Boolean(saving)} onPress={() => { void saveBusinessProfile(); }} />
          </View>
        </View>

        <View className="rounded-2xl border border-[#E3E8E1] bg-white p-4 dark:border-[#35443A] dark:bg-[#1D2922]">
          <SectionTitle step="2" title="Digital maturity assessment" detail="Rate each area from 1 (needs support) to 5 (strong and established)." />
          <View className="gap-4">
            {diagnosticDimensions.map(({ key, title }) => (
              <View key={key} className="gap-2">
                <Text className="text-sm font-bold text-[#343D37] dark:text-[#E2EAE3]">{title}</Text>
                <View className="flex-row gap-2">
                  {[1, 2, 3, 4, 5].map((score) => (
                    <Pressable
                      key={score}
                      accessibilityRole="button"
                      accessibilityLabel={`${title}: ${score}`}
                      accessibilityState={{ selected: diagnostic[key] === score }}
                      onPress={() => setDiagnostic({ ...diagnostic, [key]: score })}
                      className={`h-9 flex-1 items-center justify-center rounded-lg border ${diagnostic[key] === score ? 'border-[#14543E] bg-[#E8F0E7] dark:border-[#42664F] dark:bg-[#23362A]' : 'border-[#DDE4DC] bg-white dark:border-[#35443A] dark:bg-[#101814]'}`}
                    >
                      <Text className={`text-xs font-bold ${diagnostic[key] === score ? 'text-[#14543E] dark:text-[#B7E2C2]' : 'text-[#717A74] dark:text-[#AAB6AD]'}`}>{score}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
            <ActionButton label={saving === 'diagnostic' ? 'Saving assessment…' : plan?.diagnostic ? 'Save reassessment' : 'Save assessment and identify gaps'} disabled={Boolean(saving) || !plan?.businessName} onPress={() => { void saveDiagnostic(); }} />
          </View>
          {!plan?.businessName ? <Text className="mt-3 text-xs leading-5 text-[#717A74]">Save your business profile before submitting the diagnostic.</Text> : null}
        </View>

        {plan?.diagnostic ? (
          <>
            <View className="rounded-2xl border border-[#E3E8E1] bg-white p-4">
              <SectionTitle step="3" title="Skills-gap identification" detail="Scores of 1 or 2 are highlighted as areas to strengthen." />
              <View className="mb-3 rounded-xl bg-[#F4F7F3] p-3">
                <Text className="text-xs font-bold text-[#14543E]">Enterprise readiness score</Text>
                <Text className="mt-1 text-[26px] font-extrabold text-[#173D2D]">{currentScore}<Text className="text-sm font-semibold text-[#717A74]"> / 100</Text></Text>
              </View>
              {gapDimensions.length ? (
                <View className="gap-3">
                  {gapDimensions.map(({ key, title, category }) => (
                    <View key={key} className="rounded-xl border border-[#E3E8E1] p-3">
                      <Text className="text-sm font-extrabold text-[#343D37]">{title} · {plan.diagnostic?.[key]}/5</Text>
                      <Text className="mt-1 text-xs text-[#717A74]">Suggested AgriLearn topic: {category}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text className="text-sm leading-5 text-[#717A74]">No areas scored 1 or 2. Review the assessment and choose any topics where additional support would help.</Text>
              )}
            </View>

            <View className="rounded-2xl border border-[#E3E8E1] bg-white p-4">
              <SectionTitle step="4" title="Training plan" detail="Use your identified gaps to choose practical learning." />
              {courseError ? <Text accessibilityRole="alert" className="mb-3 text-xs leading-5 text-[#8F3229]">{courseError}</Text> : null}
              {recommendedCourses.length ? (
                <View className="gap-2">
                  <Text className="mb-1 text-xs leading-5 text-[#717A74]">Published courses that match your assessment:</Text>
                  {recommendedCourses.slice(0, 5).map((course) => (
                    <Pressable key={course.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/course', params: { id: course.id } })} className="rounded-xl bg-[#F4F7F3] p-3">
                      <Text className="text-sm font-bold text-[#14543E]">{course.title}</Text>
                      <Text className="mt-1 text-xs text-[#717A74]">{course.category}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Text className="text-xs leading-5 text-[#717A74]">
                  {gapDimensions.length
                    ? 'There are no published courses matching these gaps yet. Browse the catalogue for other relevant training.'
                    : 'No priority gaps were identified. Browse the catalogue to choose learning that supports your goals.'}
                </Text>
              )}
              <View className="mt-4">
                <ActionButton label="Browse published courses" secondary onPress={() => router.push('/explore')} />
              </View>
            </View>

            <View className="rounded-2xl border border-[#E3E8E1] bg-white p-4">
              <SectionTitle step="5" title="Mentor assignment" detail="Record your enterprise’s need for a mentor." />
              {plan.mentorRequested ? (
                <Text className="rounded-xl bg-[#F4F7F3] px-3 py-3 text-sm leading-5 text-[#343D37]">
                  Mentor need recorded. The app does not currently have a mentor-matching service, so no mentor has been assigned.
                </Text>
              ) : (
                <>
                  <Text className="mb-3 text-xs leading-5 text-[#717A74]">This records your request in your development plan; it does not contact or assign a mentor.</Text>
                  <ActionButton label={saving === 'mentor' ? 'Recording…' : 'Record mentor need'} disabled={Boolean(saving)} onPress={() => { void recordMentorNeed(); }} />
                </>
              )}
            </View>

            <View className="rounded-2xl border border-[#E3E8E1] bg-white p-4">
              <SectionTitle step="6" title="Funding readiness" detail="Use this checklist to prepare common enterprise records." />
              <View className="gap-2">
                {fundingChecklistItems.map(({ id, label }) => {
                  const checked = fundingChecklist.includes(id);
                  return (
                    <Pressable key={id} accessibilityRole="checkbox" accessibilityState={{ checked }} disabled={Boolean(saving)} onPress={() => { void toggleFundingItem(id); }} className="flex-row items-center gap-3 rounded-xl border border-[#E3E8E1] px-3 py-3">
                      <View className={`h-5 w-5 items-center justify-center rounded border ${checked ? 'border-[#14543E] bg-[#14543E]' : 'border-[#BFC9C0]'}`}>
                        <Text className="text-xs font-bold text-white">{checked ? '✓' : ''}</Text>
                      </View>
                      <Text className="flex-1 text-sm leading-5 text-[#343D37]">{label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text className="mt-3 text-xs leading-5 text-[#717A74]">This checklist does not submit a funding application. Funding calls and applications are not connected in the app.</Text>
            </View>

            <View className="rounded-2xl border border-[#E3E8E1] bg-white p-4">
              <SectionTitle step="7" title="Market linkage preparation" detail="Complete the business profile above to prepare information for future buyer connections." />
              <Text className="rounded-xl bg-[#F4F7F3] px-3 py-3 text-xs leading-5 text-[#59645C]">
                {profileIsReady
                  ? 'Your market profile details are saved privately. The app does not yet publish a directory listing or connect businesses to buyers.'
                  : 'Add your legal form, province, sector, products or services, and description to complete your market profile preparation.'}
              </Text>
            </View>

            <View className="rounded-2xl border border-[#E3E8E1] bg-white p-4">
              <SectionTitle step="8" title="Growth monitoring" detail="Repeat the diagnostic as your business develops and compare readiness scores." />
              {assessmentHistory.length > 1 ? (
                <View className="gap-2">
                  {assessmentHistory.slice(-5).reverse().map((entry, index) => (
                    <View key={`${entry.submittedAt}-${index}`} className="flex-row items-center justify-between rounded-xl bg-[#F4F7F3] px-3 py-3">
                      <Text className="text-xs text-[#59645C]">{new Date(entry.submittedAt).toLocaleDateString()}</Text>
                      <Text className="text-sm font-extrabold text-[#14543E]">{entry.maturityScore} / 100</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text className="text-xs leading-5 text-[#717A74]">Your first assessment is saved. Complete another assessment later to start comparing progress.</Text>
              )}
              <Text className="mt-3 text-xs leading-5 text-[#717A74]">
                {assessmentHistory.length > 1 && assessmentHistory[assessmentHistory.length - 1].maturityScore > assessmentHistory[assessmentHistory.length - 2].maturityScore
                  ? 'Your latest readiness score increased from the previous assessment.'
                  : assessmentHistory.length > 1 && assessmentHistory[assessmentHistory.length - 1].maturityScore < assessmentHistory[assessmentHistory.length - 2].maturityScore
                    ? 'Your latest readiness score is lower than the previous assessment; review the area scores for support needs.'
                    : assessmentHistory.length > 1
                      ? 'Your latest readiness score is unchanged from the previous assessment.'
                      : 'Readiness is a self-assessment indicator, not an external certification.'}
              </Text>
            </View>
          </>
        ) : null}

        <Pressable accessibilityRole="button" onPress={() => router.push('/opportunities')} className="items-center py-3">
          <Text className="text-sm font-bold text-[#14543E]">Browse agricultural opportunities</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
