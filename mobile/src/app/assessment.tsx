import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api, type AssessmentAttempt, type Certificate, type LearnerAssessment } from '../services/api';

type AssessmentResult = {
  attempt: AssessmentAttempt;
  certificate: Certificate | null;
};

export default function AssessmentScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const [courseTitle, setCourseTitle] = useState('');
  const [assessment, setAssessment] = useState<LearnerAssessment | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function loadAssessment() {
      try {
        const response = await api.courses.assessment.getForLearner(courseId);
        if (!active) return;
        setCourseTitle(response.course.title);
        setAssessment(response.assessment);
        setAnswers(Array(response.assessment.questions.length).fill(-1));
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load the course test.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadAssessment();
    return () => { active = false; };
  }, [courseId]);

  async function submitAssessment() {
    if (!assessment) return;
    if (answers.some((answer) => answer < 0)) {
      setError('Answer every question before submitting your test.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const response = await api.assessments.submit(assessment.id, answers);
      setResult(response);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not submit your test.');
    } finally {
      setSubmitting(false);
    }
  }

  function retryTest() {
    setResult(null);
    setAnswers(Array(assessment?.questions.length ?? 0).fill(-1));
    setError('');
  }

  return (
    <View className="flex-1 bg-[#F7F7F2]">
      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-8 pt-10">
        <Pressable accessibilityRole="button" onPress={() => router.back()} className="mb-5 self-start rounded-lg px-2 py-2">
          <Text className="text-[11px] font-bold text-[#14543E]">‹  Back</Text>
        </Pressable>

        {loading ? (
          <View className="rounded-2xl bg-white p-5">
            <Text className="text-sm text-[#717A74]">Loading your test…</Text>
          </View>
        ) : error && !assessment ? (
          <View className="rounded-2xl border border-[#E5E8E2] bg-white p-5">
            <Text className="text-lg font-extrabold text-[#173D2C]">Test unavailable</Text>
            <Text accessibilityRole="alert" className="mt-2 text-sm leading-5 text-[#717A74]">{error}</Text>
          </View>
        ) : result ? (
          <View className="items-center rounded-[22px] border border-[#E5E8E2] bg-white px-5 py-7">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-[#EAF1E8]">
              <Text className="text-2xl font-bold text-[#14543E]">{result.attempt.passed ? '✓' : '↻'}</Text>
            </View>
            <Text className="mt-4 text-center text-xl font-extrabold text-[#173D2C]">
              {result.attempt.passed ? 'You passed!' : 'Keep learning and try again'}
            </Text>
            <Text className="mt-2 text-center text-sm font-bold text-[#252B27]">{courseTitle}</Text>
            <Text className="mt-3 text-center text-3xl font-extrabold text-[#14543E]">{result.attempt.score}%</Text>
            <Text className="mt-1 text-center text-xs text-[#717A74]">
              Pass mark: {assessment?.passingScore}%
            </Text>
            {result.certificate ? (
              <View className="mt-5 w-full rounded-xl bg-[#EAF1E8] p-4">
                <Text className="text-center text-sm font-extrabold text-[#14543E]">Certificate earned</Text>
                <Text className="mt-1 text-center text-xs text-[#46624F]">Credential ID: {result.certificate.credentialId}</Text>
              </View>
            ) : null}
            {result.attempt.passed ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.replace('/passport')}
                className="mt-5 h-11 w-full items-center justify-center rounded-xl bg-[#14543E]"
              >
                <Text className="text-[11px] font-extrabold text-white">View Skills Passport</Text>
              </Pressable>
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={retryTest}
                className="mt-5 h-11 w-full items-center justify-center rounded-xl bg-[#14543E]"
              >
                <Text className="text-[11px] font-extrabold text-white">Try again</Text>
              </Pressable>
            )}
          </View>
        ) : assessment ? (
          <>
            <Text className="text-[22px] font-extrabold text-[#173D2C]">Course knowledge test</Text>
            <Text className="mt-1 text-sm text-[#717A74]">{courseTitle}</Text>
            <Text className="mt-2 text-xs text-[#717A74]">
              {assessment.questions.length} questions · Pass mark {assessment.passingScore}%
            </Text>

            {assessment.questions.map((question, questionIndex) => (
              <View key={`${questionIndex}-${question.prompt}`} className="mt-4 rounded-2xl border border-[#E5E8E2] bg-white p-4">
                <Text className="text-sm font-extrabold leading-5 text-[#252B27]">
                  {questionIndex + 1}. {question.prompt}
                </Text>
                <View className="mt-3 gap-2">
                  {question.options.map((option, optionIndex) => {
                    const selected = answers[questionIndex] === optionIndex;
                    return (
                      <Pressable
                        key={`${optionIndex}-${option}`}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected }}
                        onPress={() => setAnswers((current) => current.map((answer, index) => (
                          index === questionIndex ? optionIndex : answer
                        )))}
                        className={`min-h-11 flex-row items-center rounded-xl border px-3 py-2 ${selected ? 'border-[#14543E] bg-[#EAF1E8]' : 'border-[#E1E5DF] bg-white'}`}
                      >
                        <View className={`mr-3 h-4 w-4 items-center justify-center rounded-full border ${selected ? 'border-[#14543E]' : 'border-[#AAB2AC]'}`}>
                          {selected ? <View className="h-2 w-2 rounded-full bg-[#14543E]" /> : null}
                        </View>
                        <Text className="flex-1 text-xs leading-5 text-[#34483A]">{option}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}

            {error ? (
              <Text accessibilityRole="alert" className="mt-4 rounded-xl bg-[#FFF1E8] p-3 text-xs leading-5 text-[#8B3F21]">
                {error}
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: submitting }}
              disabled={submitting}
              onPress={() => { void submitAssessment(); }}
              className={`mt-5 h-12 items-center justify-center rounded-xl bg-[#14543E] ${submitting ? 'opacity-60' : ''}`}
            >
              <Text className="text-xs font-extrabold text-white">{submitting ? 'Submitting…' : 'Submit test'}</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
