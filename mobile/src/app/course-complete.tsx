import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { courses } from '../data';
import { useUiText } from '../services/useUiText';

export default function CourseCompleteScreen() {
  const { t } = useUiText();
  const { courseId, title, questionCount, passMark } = useLocalSearchParams<{
    courseId: string;
    title?: string;
    questionCount?: string;
    passMark?: string;
  }>();
  const courseTitle = title ?? courses.find((course) => course.id === courseId)?.title ?? 'your course';
  const parsedCount = Number(questionCount);
  const parsedPassMark = Number(passMark);
  const testQuestionCount = Number.isInteger(parsedCount) && parsedCount > 0 ? parsedCount : 0;
  const testPassMark = Number.isInteger(parsedPassMark) && parsedPassMark > 0 && parsedPassMark <= 100
    ? parsedPassMark
    : 0;
  const hasAssessment = testQuestionCount > 0 && testPassMark > 0;

  function startTest() {
    if (!courseId) return;
    router.push({ pathname: '/assessment', params: { courseId } });
  }

  function returnToCourse() {
    if (router.canGoBack()) {
      router.back();
    } else if (courseId) {
      router.replace({ pathname: '/course-content', params: { courseId } });
    } else {
      router.replace('/learning');
    }
  }

  return (
    <View className="flex-1 bg-[#F7F7F2] dark:bg-[#101814]">
      <ScrollView className="flex-1" contentContainerClassName="flex-grow justify-center px-5 py-8">
        <View className="items-center rounded-[22px] border border-[#E5E8E2] bg-white px-5 py-7 dark:border-[#35443A] dark:bg-[#1D2922]">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-[#EAF1E8]">
            <Text className="text-3xl font-bold text-[#14543E]">✓</Text>
          </View>
          <Text className="mt-4 text-center text-[20px] font-extrabold text-[#173D2C] dark:text-[#F1F4F1]">{t('Course content complete')}</Text>
          <Text className="mt-2 text-center text-[12px] font-bold text-[#252B27] dark:text-[#F1F4F1]">{courseTitle}</Text>
          <Text className="mt-3 text-center text-[11px] leading-[18px] text-[#717A74] dark:text-[#AAB6AD]">
            {t('You’ve reached the end of the lessons. Next, you’ll take a short knowledge test to check what you’ve learned.')}
          </Text>

          {hasAssessment ? (
            <View className="mt-5 w-full flex-row rounded-xl bg-[#EAF1E8] py-3 dark:bg-[#23362A]">
              <View className="flex-1 items-center">
                <Text className="text-[13px] font-extrabold text-[#14543E]">{testQuestionCount}</Text>
                <Text className="mt-1 text-[8px] text-[#717A74] dark:text-[#AAB6AD]">{t('Questions')}</Text>
              </View>
              <View className="flex-1 items-center border-l border-[#D8E4D9]">
                <Text className="text-[13px] font-extrabold text-[#14543E]">{testPassMark}%</Text>
                <Text className="mt-1 text-[8px] text-[#717A74] dark:text-[#AAB6AD]">{t('Pass mark')}</Text>
              </View>
            </View>
          ) : (
            <Text className="mt-5 text-center text-[11px] leading-[18px] text-[#717A74]">
              {t('This course’s assessment is not available yet. Check back after the content creator adds the test.')}
            </Text>
          )}

          {hasAssessment ? (
            <Pressable
              accessibilityRole="button"
              onPress={startTest}
              className="mt-5 h-11 w-full items-center justify-center rounded-xl bg-[#14543E]"
            >
              <Text className="text-[11px] font-extrabold text-white">{t('Start test')}  →</Text>
            </Pressable>
          ) : null}
          <Pressable accessibilityRole="button" onPress={returnToCourse} className="mt-3 px-4 py-2">
            <Text className="text-[10px] font-bold text-[#14543E]">{t('Review course content')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
