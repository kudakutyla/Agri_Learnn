import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useEvent } from 'expo';
import { VideoView, useVideoPlayer } from 'expo-video';
import { CreatorBottomNav } from '../components/CreatorBottomNav';
import { api, type Course, type CourseAssessment } from '../services/api';

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

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/content');
}

function UploadedLessonVideoPreview({ videoId, title }: { videoId: string; title: string }) {
  const [uri, setUri] = useState<string | null>(null);
  const [error, setError] = useState('');
  const player = useVideoPlayer(uri);
  const playback = useEvent(player, 'statusChange', { status: player.status });

  useEffect(() => {
    let active = true;
    void api.videos.playbackUrl(videoId)
      .then(({ url }) => {
        if (active) setUri(url);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load this video.');
      });
    return () => { active = false; };
  }, [videoId]);

  return (
    <View className="relative mt-3 overflow-hidden rounded-xl bg-[#17261E]">
      {uri ? (
        <VideoView
          player={player}
          nativeControls
          contentFit="contain"
          accessibilityLabel={title}
          style={{ width: '100%', aspectRatio: 16 / 9 }}
        />
      ) : (
        <View className="h-48 items-center justify-center px-4">
          {error ? (
            <Text accessibilityRole="alert" className="text-center text-xs text-white">{error}</Text>
          ) : (
            <>
              <ActivityIndicator color="#FFFFFF" />
              <Text className="mt-2 text-xs text-white">Preparing secure video preview…</Text>
            </>
          )}
        </View>
      )}
      {playback.status === 'loading' ? (
        <View className="absolute inset-0 items-center justify-center bg-[#17261E]/70">
          <ActivityIndicator color="white" />
          <Text className="mt-2 text-[9px] text-white">Buffering…</Text>
        </View>
      ) : null}
      {playback.status === 'error' ? (
        <Text accessibilityRole="alert" className="absolute inset-0 bg-[#17261E]/90 px-4 py-8 text-center text-xs text-white">
          {playback.error?.message ?? 'Video playback failed.'}
        </Text>
      ) : null}
    </View>
  );
}

export default function ModuleDetailsScreen() {
  const { courseId: routeCourseId } = useLocalSearchParams<{ courseId?: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [assessment, setAssessment] = useState<CourseAssessment | null>(null);
  const [assessmentLoading, setAssessmentLoading] = useState(true);
  const [assessmentError, setAssessmentError] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const courseId = Array.isArray(routeCourseId) ? routeCourseId[0] : routeCourseId;

  useEffect(() => {
    let active = true;
    async function loadCourse() {
      try {
        if (!courseId) throw new Error('A module was not selected.');
        const { courses } = await api.trainer.courses.list();
        const selectedCourse = courses.find((item) => item.id === courseId);
        if (!selectedCourse) throw new Error('This module could not be found in your content.');
        if (active) setCourse(selectedCourse);
      } catch (error) {
        if (active) setErrorMessage(error instanceof Error ? error.message : 'Could not load this module.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadCourse();
    return () => { active = false; };
  }, [courseId]);

  useEffect(() => {
    let active = true;
    async function loadAssessment() {
      if (!courseId) {
        setAssessmentLoading(false);
        return;
      }

      setAssessmentLoading(true);
      setAssessmentError('');
      try {
        const result = await api.courses.assessment.get(courseId);
        if (active) setAssessment(result.assessment);
      } catch (error) {
        if (active) {
          setAssessmentError(error instanceof Error ? error.message : 'Could not load assessment questions.');
        }
      } finally {
        if (active) setAssessmentLoading(false);
      }
    }

    void loadAssessment();
    return () => { active = false; };
  }, [courseId]);

  function editCourse() {
    if (!course || course.status === 'submitted') return;
    router.push({ pathname: '/create-module', params: { courseId: course.id } });
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F7F7F2] dark:bg-[#101814]">
        <ActivityIndicator color="#14543E" />
        <Text className="mt-2 text-sm text-[#717A74] dark:text-[#AAB6AD]">Loading module…</Text>
      </View>
    );
  }

  if (!course) {
    return (
      <View className="flex-1 bg-[#F7F7F2] dark:bg-[#101814]">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-lg font-extrabold text-[#252B27] dark:text-[#F1F4F1]">Module unavailable</Text>
          <Text accessibilityRole="alert" className="mt-2 text-center text-sm text-[#717A74] dark:text-[#AAB6AD]">
            {errorMessage || 'Could not load this module.'}
          </Text>
          <Pressable accessibilityRole="button" onPress={goBack} className="mt-5 rounded-xl bg-[#14543E] px-5 py-3">
            <Text className="text-sm font-bold text-white">Back to content</Text>
          </Pressable>
        </View>
        <CreatorBottomNav />
      </View>
    );
  }

  const objectives = (course.objectives ?? '').split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  const canEdit = course.status !== 'submitted';

  return (
    <View className="flex-1 bg-[#F7F7F2] dark:bg-[#101814]">
      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-6 pt-[88px]">
        {course.coverImage ? (
          <Image
            accessibilityLabel={`${course.title} cover image`}
            source={{ uri: course.coverImage }}
            className="mb-4 h-44 w-full rounded-2xl bg-[#DDE8DE]"
            resizeMode="cover"
          />
        ) : null}

        <View className="flex-row items-center justify-between">
          <Text className={`rounded-full px-3 py-1 text-[9px] font-extrabold ${statusStyle(course.status)}`}>
            {statusLabel(course.status)}
          </Text>
          <Text className="text-[9px] text-[#858C87] dark:text-[#AAB6AD]">{course.level}</Text>
        </View>
        <Text className="mt-3 text-2xl font-extrabold text-[#252B27] dark:text-[#F1F4F1]">{course.title}</Text>
        <Text className="mt-2 text-xs leading-5 text-[#59635C] dark:text-[#B5C0B7]">
          {course.description || 'No description has been added.'}
        </Text>

        <View className="mt-4 flex-row flex-wrap gap-2">
          <Text className="rounded-full bg-white px-3 py-2 text-[10px] font-semibold text-[#14543E] dark:bg-[#1D2922] dark:text-[#B7E2C2]">
            {course.category}
          </Text>
          <Text className="rounded-full bg-white px-3 py-2 text-[10px] font-semibold text-[#14543E] dark:bg-[#1D2922] dark:text-[#B7E2C2]">
            {course.language || 'English'}
          </Text>
        </View>

        {course.status === 'approved' ? (
          <View className="mt-4 rounded-xl border border-[#CFE0D0] bg-[#EAF1E8] p-3 dark:border-[#35443A] dark:bg-[#1D2922]">
            <Text className="text-[10px] leading-4 text-[#14543E] dark:text-[#B7E2C2]">
              This module is published. Your edits will be saved while it remains available to learners.
            </Text>
          </View>
        ) : null}
        {course.status === 'submitted' ? (
          <View className="mt-4 rounded-xl border border-[#E7D7B5] bg-[#F5EAD4] p-3">
            <Text className="text-[10px] leading-4 text-[#806022]">
              This module is under administrator review and cannot be edited until it has been reviewed.
            </Text>
          </View>
        ) : null}
        {course.status === 'rejected' && course.reviewNote ? (
          <View className="mt-4 rounded-xl border border-[#E8D2CD] bg-[#FBE9E7] p-3">
            <Text className="text-[10px] font-bold text-[#9A5147]">Reviewer feedback</Text>
            <Text className="mt-1 text-[10px] leading-4 text-[#9A5147]">{course.reviewNote}</Text>
          </View>
        ) : null}

        {objectives.length > 0 ? (
          <View className="mt-6">
            <Text className="text-base font-extrabold text-[#252B27] dark:text-[#F1F4F1]">Learning objectives</Text>
            {objectives.map((objective) => (
              <View key={objective} className="mt-3 flex-row items-start">
                <Text className="mr-2 text-xs font-bold text-[#477E62]">✓</Text>
                <Text className="flex-1 text-[11px] leading-4 text-[#465149] dark:text-[#B5C0B7]">{objective}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {course.skills?.length ? (
          <View className="mt-6">
            <Text className="text-base font-extrabold text-[#252B27] dark:text-[#F1F4F1]">Skills learners will gain</Text>
            <View className="mt-2 flex-row flex-wrap gap-2">
              {course.skills.map((skill) => (
                <Text key={skill} className="rounded-full bg-[#EAF1E8] px-3 py-2 text-[9px] font-bold text-[#14543E] dark:bg-[#1D2922] dark:text-[#B7E2C2]">
                  {skill}
                </Text>
              ))}
            </View>
          </View>
        ) : null}

        <View className="mt-6">
          <Text className="text-base font-extrabold text-[#252B27] dark:text-[#F1F4F1]">Lessons</Text>
          {(course.lessons ?? []).length ? (course.lessons ?? []).map((lesson, index) => (
            <View key={`${lesson.title}-${index}`} className="min-h-[58px] flex-row items-center border-b border-[#E1E5DF] dark:border-[#35443A]">
              <Text className="w-8 text-[10px] font-bold text-[#85A28D]">{String(index + 1).padStart(2, '0')}</Text>
              <View className="flex-1 py-3">
                <Text className="text-[11px] font-bold text-[#343D37] dark:text-[#F1F4F1]">{lesson.title}</Text>
                <Text className="mt-1 text-[9px] text-[#858C87] dark:text-[#AAB6AD]">{lesson.type} · {lesson.duration}</Text>
                {lesson.file ? (
                  <Text numberOfLines={1} className="mt-1 text-[9px] text-[#14543E] dark:text-[#8FC6A4]">{lesson.file.name}</Text>
                ) : null}
                {lesson.file?.mimeType.startsWith('video/') ? (
                  <UploadedLessonVideoPreview videoId={lesson.file.id} title={lesson.title} />
                ) : null}
              </View>
            </View>
          )) : (
            <Text className="mt-2 text-[10px] text-[#717A74] dark:text-[#AAB6AD]">No lessons have been added.</Text>
          )}
        </View>

        <View className="mt-5 rounded-xl border border-[#E1E5DF] bg-white p-4 dark:border-[#35443A] dark:bg-[#1D2922]">
          <View>
            <Text className="text-xs font-extrabold text-[#252B27] dark:text-[#F1F4F1]">Final assessment</Text>
            {assessmentLoading ? (
              <Text className="mt-2 text-[10px] text-[#717A74] dark:text-[#AAB6AD]">Loading assessment questions…</Text>
            ) : assessmentError ? (
              <Text accessibilityRole="alert" className="mt-2 text-[10px] leading-4 text-[#9A382C]">{assessmentError}</Text>
            ) : assessment ? (
              <>
                <Text className="mt-1 text-[10px] text-[#717A74] dark:text-[#AAB6AD]">
                  {assessment.questions.length} questions · Pass mark {assessment.passingScore}%
                </Text>
                {assessment.questions.map((question, index) => (
                  <View key={`${question.prompt}-${index}`} className="mt-3 rounded-xl bg-[#F7F7F2] p-3 dark:bg-[#101814]">
                    <Text className="text-[11px] font-semibold leading-4 text-[#34483A] dark:text-[#E2EAE3]">
                      {index + 1}. {question.prompt}
                    </Text>
                    {question.options.map((option, optionIndex) => (
                      <Text
                        key={`${option}-${optionIndex}`}
                        className={`mt-2 text-[10px] leading-4 ${optionIndex === question.correctOption ? 'font-bold text-[#39785C] dark:text-[#A9CDB2]' : 'text-[#69736C] dark:text-[#AAB6AD]'}`}
                      >
                        {optionIndex === question.correctOption ? '✓ ' : '· '}{option}
                      </Text>
                    ))}
                  </View>
                ))}
              </>
            ) : (
              <Text className="mt-2 text-[10px] text-[#717A74] dark:text-[#AAB6AD]">No assessment questions are available.</Text>
            )}
          </View>
        </View>

        {canEdit ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit ${course.title}`}
            onPress={editCourse}
            className="mt-6 min-h-12 items-center justify-center rounded-xl bg-[#14543E]"
          >
            <Text className="text-sm font-bold text-white">Edit module</Text>
          </Pressable>
        ) : null}
      </ScrollView>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to content"
        onPress={goBack}
        className="absolute left-7 top-8 z-10 h-10 w-10 items-center justify-center rounded-full border border-[#E1E5DF] bg-white dark:border-[#35443A] dark:bg-[#1D2922]"
      >
        <Text className="text-2xl leading-7 text-[#14543E] dark:text-[#8FC6A4]">‹</Text>
      </Pressable>
      <CreatorBottomNav />
    </View>
  );
}
