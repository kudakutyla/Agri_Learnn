import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ImageBackground, Linking, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { courses as sampleCourses } from '../data';
import { API_URL, api, Course } from '../services/api';
import { downloadOfflineVideo, getOfflineCourse, getOfflineVideoFile, saveCourseForOffline } from '../services/offlineVideos';

const courseImages = [
  'https://images.unsplash.com/photo-1492496913980-501348b61469?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1529583647475-67602abaa6f2?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1506349103253-e648563ec8b9?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1492496913980-501348b61469?auto=format&fit=crop&w=900&q=85',
];

function sampleCourseById(id: string): Course | undefined {
  const sample = sampleCourses.find((item) => item.id === id);
  if (
    !sample
    || (sample.level !== 'Beginner' && sample.level !== 'Intermediate' && sample.level !== 'Advanced')
  ) return undefined;
  return {
    id: sample.id,
    ownerId: '',
    title: sample.title,
    category: sample.category,
    description: sample.description,
    objectives: sample.objectives.join('\n'),
    level: sample.level,
    status: 'approved',
    lessons: sample.lessonTitles.map((title, index) => ({
      title,
      type: index === 0 ? 'Video' : 'Reading',
      duration: index === 0 ? '12 min' : '10 min',
    })),
  };
}

function LessonVideo({ uri, title }: { uri: string; title: string }) {
  const player = useVideoPlayer({ uri }, (videoPlayer) => {
    videoPlayer.loop = false;
  });

  return (
    <View className="mt-3 overflow-hidden rounded-2xl bg-[#17261E]">
      <VideoView
        player={player}
        nativeControls
        contentFit="contain"
        accessibilityLabel={title}
        style={{ width: '100%', aspectRatio: 16 / 9 }}
      />
    </View>
  );
}

export default function CourseContentScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLesson, setSelectedLesson] = useState(0);
  const [offlineVideoUri, setOfflineVideoUri] = useState<string | null>(null);
  const [isVideoDownloaded, setIsVideoDownloaded] = useState(false);
  const [downloadingVideo, setDownloadingVideo] = useState(false);
  const [completingLesson, setCompletingLesson] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    let active = true;
    async function loadCourse() {
      try {
        const result = await api.courses.list();
        const match = result.courses.find((item) => item.id === courseId);
        if (active && match) {
          setCourse(match);
          try {
            await saveCourseForOffline(match);
          } catch (cacheError) {
            if (active) {
              setError(`Course is available, but could not be saved for offline use: ${cacheError instanceof Error ? cacheError.message : 'Please try again.'}`);
            }
          }
          return;
        }

        if (active) {
          const sample = sampleCourseById(courseId);
          setCourse(sample ?? await getOfflineCourse(courseId));
        }
      } catch (loadError) {
        if (active) {
          try {
            const savedCourse = await getOfflineCourse(courseId);
            const sample = sampleCourseById(courseId);
            if (savedCourse) {
              setCourse(savedCourse);
            } else if (sample) {
              setCourse(sample);
              setError(`Could not load uploaded lesson files: ${loadError instanceof Error ? loadError.message : 'Please try again.'}`);
            } else {
              setError(loadError instanceof Error ? loadError.message : 'Please try again.');
            }
          } catch (offlineError) {
            setError(offlineError instanceof Error ? offlineError.message : 'Could not load saved course data.');
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadCourse();
    return () => { active = false; };
  }, [courseId]);

  const lessons = course?.lessons ?? [];
  const lesson = lessons[selectedLesson];
  const videoFile = lesson?.type === 'Video' ? lesson.file : undefined;
  const pdfFile = lesson?.type === 'Reading' ? lesson.file : undefined;
  const videoUri = videoFile
    ? `${API_URL}/api/courses/${encodeURIComponent(course?.id ?? '')}/files/${encodeURIComponent(videoFile.id)}`
    : undefined;
  const activeVideoUri = offlineVideoUri ?? videoUri;
  const pdfUri = pdfFile
    ? `${API_URL}/api/courses/${encodeURIComponent(course?.id ?? '')}/files/${encodeURIComponent(pdfFile.id)}`
    : undefined;
  const imageIndex = sampleCourses.findIndex((item) => item.id === courseId);
  const mediaImage = course?.coverImage
    ?? courseImages[imageIndex >= 0 ? imageIndex : 0];
  const objective = course?.objectives?.split(/\n|(?<=[.!?])\s+/).find(Boolean);
  const isFirstLesson = selectedLesson === 0;
  const isLastLesson = selectedLesson >= lessons.length - 1;
  const progress = lessons.length ? ((selectedLesson + 1) / lessons.length) * 100 : 0;

  useEffect(() => {
    let active = true;
    async function checkDownloadedVideo() {
      setOfflineVideoUri(null);
      setIsVideoDownloaded(false);
      if (Platform.OS === 'web' || !course || !videoFile) return;

      const localFile = getOfflineVideoFile(course.id, videoFile.id, videoFile.mimeType);
      if (active && localFile.exists) {
        setOfflineVideoUri(localFile.uri);
        setIsVideoDownloaded(true);
      }
    }

    void checkDownloadedVideo();
    return () => { active = false; };
  }, [course, videoFile]);

  function exitLesson() {
    if (router.canGoBack()) {
      router.back();
    } else if (courseId) {
      router.replace({ pathname: '/course', params: { id: courseId } });
    } else {
      router.replace('/learning');
    }
  }

  function showUnavailableVideo() {
    Alert.alert('Video not available', 'The instructor has not attached a video to this lesson yet.');
  }

  async function openLessonPdf() {
    if (!pdfUri) return;
    try {
      await Linking.openURL(pdfUri);
    } catch (openError) {
      Alert.alert(
        'Could not open PDF notes',
        openError instanceof Error ? openError.message : 'Please try again.',
      );
    }
  }

  async function completeLesson() {
    if (!course || completingLesson) return;
    setError('');
    setCompletingLesson(true);
    try {
      await api.courses.lessons.complete(course.id, selectedLesson);
      if (isLastLesson) {
        router.push({
          pathname: '/course-complete',
          params: {
            courseId: course.id,
            title: course.title,
            questionCount: String(course.assessment?.questionCount ?? ''),
            passMark: String(course.assessment?.passMark ?? ''),
          },
        });
      } else {
        setSelectedLesson((current) => Math.min(lessons.length - 1, current + 1));
      }
    } catch (completionError) {
      setError(completionError instanceof Error ? completionError.message : 'Could not save lesson progress.');
    } finally {
      setCompletingLesson(false);
    }
  }

  async function downloadVideoForOffline() {
    if (!course || !videoFile || !videoUri || downloadingVideo) return;
    if (Platform.OS === 'web') {
      const link = document.createElement('a');
      link.href = `${videoUri}?download=1`;
      link.download = videoFile.name;
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      link.remove();
      return;
    }

    setDownloadingVideo(true);
    setDownloadProgress(0);
    try {
      const downloadedFile = await downloadOfflineVideo(
        course,
        videoFile.id,
        videoFile.mimeType,
        videoUri,
        setDownloadProgress,
      );
      setOfflineVideoUri(downloadedFile.uri);
      setIsVideoDownloaded(true);
    } catch (downloadError) {
      Alert.alert(
        'Could not download video',
        downloadError instanceof Error ? downloadError.message : 'Please check your connection and try again.',
      );
    } finally {
      setDownloadingVideo(false);
    }
  }

  return (
    <View className="flex-1 bg-[#FBFAF5]">
      <View className="h-[3px] bg-[#E4E8E1]">
        <View className="h-full bg-[#D9AE3F]" style={{ width: `${progress}%` }} />
      </View>

      <View className="h-[62px] flex-row items-center justify-between border-b border-[#E5E8E2] bg-white px-4">
        <View className="flex-row items-center">
          <View className="h-8 w-8 items-center justify-center rounded-xl bg-[#14543E]">
            <Text className="text-sm text-white">♧</Text>
          </View>
          <Text className="ml-2 text-[14px] font-extrabold text-[#14543E]">AgriLearn</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={exitLesson} className="px-1 py-2">
          <Text className="text-[10px] font-bold text-[#14543E]">Save &amp; exit</Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-4 pb-8 pt-4">
        {loading ? (
          <View className="items-center py-16">
            <ActivityIndicator color="#14543E" />
            <Text className="mt-3 text-xs text-[#717A74]">Loading lesson…</Text>
          </View>
        ) : !course ? (
          <View className="items-center rounded-2xl bg-white px-5 py-8">
            <Text className="text-base font-extrabold text-[#252B27]">Could not load course content</Text>
            <Text className="mt-2 text-center text-xs leading-5 text-[#717A74]">
              {error || 'This course may no longer be available.'}
            </Text>
            <Pressable accessibilityRole="button" onPress={exitLesson} className="mt-4 rounded-lg bg-[#14543E] px-4 py-2.5">
              <Text className="text-[10px] font-bold text-white">Go back</Text>
            </Pressable>
          </View>
        ) : course.status !== 'approved' ? (
          <View className="items-center rounded-2xl bg-white px-5 py-8">
            <Text className="text-base font-extrabold text-[#252B27]">Course not published yet</Text>
            <Text className="mt-2 text-center text-xs leading-5 text-[#717A74]">
              Lessons will be available after this course is approved.
            </Text>
          </View>
        ) : lessons.length === 0 ? (
          <View className="items-center rounded-2xl bg-white px-5 py-8">
            <Text className="text-base font-extrabold text-[#252B27]">No lessons available</Text>
            <Text className="mt-2 text-center text-xs leading-5 text-[#717A74]">
              The instructor has not added course lessons yet.
            </Text>
          </View>
        ) : (
          <>
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-[8px] font-extrabold uppercase tracking-[1px] text-[#59846A]">
                Lesson {selectedLesson + 1} of {lessons.length}
              </Text>
              <Text className="text-[8px] font-bold uppercase tracking-[0.7px] text-[#59846A]">
                ◷  About {lesson.duration}
              </Text>
            </View>

            <Text className="text-[21px] font-medium leading-[27px] tracking-[-0.5px] text-[#22382C]">
              {lesson.title}
            </Text>

            {videoUri ? (
              <>
                <LessonVideo key={activeVideoUri} uri={activeVideoUri ?? videoUri} title={lesson.title} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isVideoDownloaded || downloadingVideo }}
                  disabled={isVideoDownloaded || downloadingVideo}
                  onPress={() => { void downloadVideoForOffline(); }}
                  className={`mt-3 h-10 flex-row items-center justify-center rounded-xl border border-[#DDE4DC] bg-white ${downloadingVideo || isVideoDownloaded ? 'opacity-75' : ''}`}
                >
                  <Text className="text-[9px] font-extrabold text-[#14543E]">
                    {downloadingVideo
                      ? `Downloading video… ${downloadProgress}%`
                      : isVideoDownloaded
                        ? 'Downloaded for offline  ✓'
                        : Platform.OS === 'web'
                          ? 'Download video'
                          : 'Download for offline  ↓'}
                  </Text>
                </Pressable>
                <Text className="mt-1 text-center text-[8px] text-[#858C87]">
                  {Platform.OS === 'web'
                    ? 'Saves the video to your browser’s downloads.'
                    : isVideoDownloaded
                      ? 'This video is saved on your device and can play without internet.'
                      : 'Save this video on your device to watch it offline.'}
                </Text>
              </>
            ) : pdfUri && pdfFile ? (
              <View className="mt-3 rounded-2xl border border-[#E1E5DF] bg-white p-4">
                <View className="flex-row items-center">
                  <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#EAF1E8]">
                    <Text className="text-[10px] font-extrabold text-[#14543E]">PDF</Text>
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-[10px] font-bold text-[#252B27]">Lesson notes</Text>
                    <Text numberOfLines={1} className="mt-1 text-[8px] text-[#858C87]">{pdfFile.name}</Text>
                  </View>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => { void openLessonPdf(); }}
                  className="mt-4 h-10 flex-row items-center justify-center rounded-xl bg-[#14543E]"
                >
                  <Text className="text-[9px] font-extrabold text-white">Open PDF notes  ↗</Text>
                </Pressable>
                <Text className="mt-2 text-center text-[8px] text-[#858C87]">
                  Opens in your device’s PDF viewer or browser.
                </Text>
              </View>
            ) : (
              <ImageBackground
                source={{ uri: mediaImage }}
                imageStyle={{ borderRadius: 13 }}
                className="mt-3 h-[190px] items-center justify-center overflow-hidden rounded-[13px] bg-[#DDEBDD]"
                resizeMode="cover"
              >
                <View className="absolute inset-0 bg-black/20" />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Video is not available"
                  onPress={showUnavailableVideo}
                  className="h-12 w-12 items-center justify-center rounded-full bg-white"
                >
                  <Text className="ml-1 text-[20px] text-[#14543E]">▶</Text>
                </Pressable>
                <View className="absolute bottom-2 right-2 rounded bg-black/65 px-2 py-1">
                  <Text className="text-[7px] font-bold text-white">
                    {lesson.type === 'Video' ? 'VIDEO NOT ADDED' : 'PDF NOTES NOT ADDED'}
                  </Text>
                </View>
              </ImageBackground>
            )}

            <Text className="mt-2 text-[11px] leading-[18px] text-[#465149]">
              {lesson.type === 'Reading'
                ? (pdfUri ? `Read the attached notes for ${lesson.title}.` : 'The instructor has not attached PDF notes to this lesson yet.')
                : (course.description || `${lesson.title} is part of ${course.title}.`)}
            </Text>

            {objective ? (
              <View className="mt-3 flex-row items-start rounded-xl bg-[#E7EFE4] p-3">
                <Text className="mr-2 text-[11px] text-[#477E62]">♧</Text>
                <Text className="flex-1 text-[9px] leading-[14px] text-[#46624F]">
                  Remember: {objective}
                </Text>
              </View>
            ) : null}

            {error ? (
              <Text accessibilityRole="alert" className="mt-3 text-center text-[8px] leading-4 text-[#9A5147]">
                {error}
              </Text>
            ) : null}

            <View className="mt-4 flex-row items-center justify-between">
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: isFirstLesson }}
                disabled={isFirstLesson}
                onPress={() => setSelectedLesson((current) => Math.max(0, current - 1))}
                className={`h-10 min-w-[78px] items-center justify-center rounded-xl border border-[#DDE4DC] bg-white px-3 ${isFirstLesson ? 'opacity-45' : ''}`}
              >
                <Text className="text-[9px] font-bold text-[#14543E]">Previous</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: completingLesson }}
                disabled={completingLesson}
                onPress={() => { void completeLesson(); }}
                className={`h-10 min-w-[108px] flex-row items-center justify-center rounded-xl bg-[#14543E] px-3 ${completingLesson ? 'opacity-60' : ''}`}
              >
                <Text className="text-[9px] font-extrabold text-white">
                  {completingLesson ? 'Saving…' : isLastLesson ? 'Complete course' : 'Next topic  →'}
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
