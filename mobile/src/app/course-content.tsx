import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ImageBackground, Linking, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useEvent } from 'expo';
import { VideoView, useVideoPlayer } from 'expo-video';
import { API_URL, api, Course } from '../services/api';
import { downloadOfflineVideo, getOfflineCourse, getOfflineVideoFile, saveCourseForOffline } from '../services/offlineVideos';
import { useUiText } from '../services/useUiText';

const courseImages = [
  'https://images.unsplash.com/photo-1492496913980-501348b61469?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1529583647475-67602abaa6f2?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1506349103253-e648563ec8b9?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1492496913980-501348b61469?auto=format&fit=crop&w=900&q=85',
];

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}

function LessonVideo({ uri, title }: { uri: string; title: string }) {
  const { t } = useUiText();
  const player = useVideoPlayer({ uri }, (videoPlayer) => {
    videoPlayer.loop = false;
  });
  const playback = useEvent(player, 'statusChange', { status: player.status });

  return (
    <View className="relative mt-3 overflow-hidden rounded-2xl bg-[#17261E]">
      <VideoView
        player={player}
        nativeControls
        contentFit="contain"
        accessibilityLabel={title}
        style={{ width: '100%', aspectRatio: 16 / 9 }}
      />
      {playback.status === 'loading' ? (
        <View className="absolute inset-0 items-center justify-center bg-[#17261E]/80">
          <ActivityIndicator color="white" />
          <Text className="mt-2 text-[9px] font-semibold text-white">{t('Loading video…')}</Text>
        </View>
      ) : null}
      {playback.status === 'error' ? (
        <View className="absolute inset-0 items-center justify-center bg-[#17261E]/90 px-5">
          <Text className="text-center text-[10px] font-bold text-white">{t('Video playback failed')}</Text>
          <Text numberOfLines={2} className="mt-1 text-center text-[8px] text-white/75">
            {playback.error?.message ?? t('Check your connection and try again.')}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default function CourseContentScreen() {
  const { t } = useUiText();
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [videoPlayback, setVideoPlayback] = useState<{ videoId: string; url?: string; error?: string } | null>(null);
  const [selectedLesson, setSelectedLesson] = useState(0);
  const [offlineVideoUri, setOfflineVideoUri] = useState<string | null>(null);
  const [isVideoDownloaded, setIsVideoDownloaded] = useState(false);
  const [downloadingVideo, setDownloadingVideo] = useState(false);
  const [completingLesson, setCompletingLesson] = useState(false);
  const [savingAndExiting, setSavingAndExiting] = useState(false);
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
            const progress = await api.courses.lessons.progress(match.id);
            if (active) setSelectedLesson(progress.resumeLessonIndex);
          } catch (progressError) {
            if (active) setError(progressError instanceof Error ? progressError.message : t('Could not load saved learning progress.'));
          }
          try {
            await saveCourseForOffline(match);
          } catch (cacheError) {
            if (active) {
              setError(`${t('Course is available, but could not be saved for offline use')}: ${cacheError instanceof Error ? cacheError.message : t('Please try again.')}`);
            }
          }
          return;
        }

        if (active) {
          const offlineCourse = await getOfflineCourse(courseId);
          if (offlineCourse) setCourse(offlineCourse);
          else setError('This course is not published or is no longer available.');
        }
      } catch (loadError) {
        if (active) {
          try {
            const savedCourse = await getOfflineCourse(courseId);
            if (savedCourse) {
              setCourse(savedCourse);
            } else {
              setError(loadError instanceof Error ? loadError.message : t('Please try again.'));
            }
          } catch (offlineError) {
            setError(offlineError instanceof Error ? offlineError.message : t('Could not load saved course data.'));
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadCourse();
    return () => { active = false; };
  }, [courseId, t]);

  const lessons = course?.lessons ?? [];
  const lesson = lessons[selectedLesson];
  const videoFile = lesson?.type === 'Video' ? lesson.file : undefined;
  const videoFileId = videoFile?.id;
  const currentVideoPlayback = videoPlayback?.videoId === videoFileId ? videoPlayback : null;
  const playbackUrl = currentVideoPlayback?.url ?? '';
  const playbackError = currentVideoPlayback?.error ?? '';
  const playbackLoading = Boolean(videoFileId && !currentVideoPlayback);
  const pdfFile = lesson?.type === 'Reading' ? lesson.file : undefined;
  const videoUri = playbackUrl || undefined;
  const activeVideoUri = offlineVideoUri ?? videoUri;
  const pdfUri = pdfFile
    ? `${API_URL}/api/courses/${encodeURIComponent(course?.id ?? '')}/files/${encodeURIComponent(pdfFile.id)}`
    : undefined;
  const mediaImage = course?.coverImage
    ?? courseImages[0];
  const objective = course?.objectives?.split(/\n|(?<=[.!?])\s+/).find(Boolean);
  const isFirstLesson = selectedLesson === 0;
  const isLastLesson = selectedLesson >= lessons.length - 1;
  const progress = lessons.length ? ((selectedLesson + 1) / lessons.length) * 100 : 0;

  useEffect(() => {
    let active = true;
    if (!videoFileId) return () => { active = false; };
    void api.videos.playbackUrl(videoFileId)
      .then(({ url }) => {
        if (active) setVideoPlayback({ videoId: videoFileId, url });
      })
      .catch((playbackLoadError: unknown) => {
        if (active) setVideoPlayback({
          videoId: videoFileId,
          error: playbackLoadError instanceof Error ? playbackLoadError.message : t('Could not load the secure video stream.'),
        });
      });
    return () => { active = false; };
  }, [videoFileId, t]);

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

  async function exitLesson() {
    if (savingAndExiting) return;
    if (!course) {
      router.replace('/learning');
      return;
    }
    setError('');
    setSavingAndExiting(true);
    try {
      await api.courses.lessons.savePosition(course.id, selectedLesson);
      router.replace('/learning');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t('Could not save your course position.'));
    } finally {
      setSavingAndExiting(false);
    }
  }

  function showUnavailableVideo() {
    Alert.alert(t('Video not available'), t('The instructor has not attached a video to this lesson yet.'));
  }

  async function openLessonPdf() {
    if (!pdfUri) return;
    try {
      await Linking.openURL(pdfUri);
    } catch (openError) {
      Alert.alert(
        t('Could not open PDF notes'),
        openError instanceof Error ? openError.message : t('Please try again.'),
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
      setError(completionError instanceof Error ? completionError.message : t('Could not save lesson progress.'));
    } finally {
      setCompletingLesson(false);
    }
  }

  async function downloadVideoForOffline() {
    if (!course || !videoFile || downloadingVideo) return;

    setDownloadingVideo(true);
    setDownloadProgress(0);
    try {
      const { url } = await api.videos.playbackUrl(videoFile.id, true);

      if (Platform.OS === 'web') {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Download failed (${response.status}).`);

        const reader = response.body?.getReader();
        if (!reader) throw new Error('Your browser could not stream the video download.');

        const contentLengthHeader = response.headers.get('content-length');
        const totalBytes = contentLengthHeader ? Number.parseInt(contentLengthHeader, 10) : NaN;
        const chunks: Uint8Array[] = [];
        let receivedBytes = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            receivedBytes += value.byteLength;
            if (Number.isFinite(totalBytes) && totalBytes > 0) {
              const nextProgress = Math.min(100, Math.round((receivedBytes / totalBytes) * 100));
              setDownloadProgress(nextProgress);
            }
          }
        }

        const allBytes = new Uint8Array(receivedBytes);
        let offset = 0;
        for (const chunk of chunks) {
          allBytes.set(chunk, offset);
          offset += chunk.byteLength;
        }

        const blob = new Blob([allBytes], { type: videoFile.mimeType || 'video/mp4' });
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = videoFile.name;
        link.rel = 'noopener';
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        setDownloadProgress(100);
        setIsVideoDownloaded(true);
        return;
      }

      const downloadedFile = await downloadOfflineVideo(
        course,
        videoFile.id,
        videoFile.mimeType,
        url,
        setDownloadProgress,
      );
      setOfflineVideoUri(downloadedFile.uri);
      setIsVideoDownloaded(true);
    } catch (downloadError) {
      Alert.alert(
        t('Could not download video'),
        downloadError instanceof Error ? downloadError.message : t('Please check your connection and try again.'),
      );
    } finally {
      setDownloadingVideo(false);
    }
  }

  return (
    <View className="flex-1 bg-[#FBFAF5] dark:bg-[#101814]">
      <View className="h-[3px] bg-[#E4E8E1]">
        <View className="h-full bg-[#D9AE3F]" style={{ width: `${progress}%` }} />
      </View>

      <View className="h-[62px] flex-row items-center justify-between border-b border-[#E5E8E2] bg-white px-4 dark:border-[#35443A] dark:bg-[#1D2922]">
        <View className="flex-row items-center">
          <View className="h-8 w-8 items-center justify-center rounded-xl bg-[#14543E]">
            <Text className="text-sm text-white">♧</Text>
          </View>
          <Text className="ml-2 text-[14px] font-extrabold text-[#14543E]">AgriLearn</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: savingAndExiting }}
          disabled={savingAndExiting}
          onPress={() => { void exitLesson(); }}
          className="px-1 py-2"
        >
          <Text className="text-[10px] font-bold text-[#14543E]">{savingAndExiting ? t('Saving…') : t('Save & exit')}</Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-4 pb-8 pt-4">
        {loading ? (
          <View className="items-center py-16">
            <ActivityIndicator color="#14543E" />
            <Text className="mt-3 text-xs text-[#717A74] dark:text-[#AAB6AD]">{t('Loading lesson…')}</Text>
          </View>
        ) : !course ? (
          <View className="items-center rounded-2xl bg-white px-5 py-8 dark:bg-[#1D2922]">
            <Text className="text-base font-extrabold text-[#252B27] dark:text-[#F1F4F1]">{t('Could not load course content')}</Text>
            <Text className="mt-2 text-center text-xs leading-5 text-[#717A74] dark:text-[#AAB6AD]">
              {error || t('This course may no longer be available.')}
            </Text>
            <Pressable accessibilityRole="button" onPress={exitLesson} className="mt-4 rounded-lg bg-[#14543E] px-4 py-2.5">
              <Text className="text-[10px] font-bold text-white">{t('Go back')}</Text>
            </Pressable>
          </View>
        ) : course.status !== 'approved' ? (
          <View className="items-center rounded-2xl bg-white px-5 py-8 dark:bg-[#1D2922]">
            <Text className="text-base font-extrabold text-[#252B27] dark:text-[#F1F4F1]">{t('Course not published yet')}</Text>
            <Text className="mt-2 text-center text-xs leading-5 text-[#717A74] dark:text-[#AAB6AD]">
              {t('Lessons will be available after this course is approved.')}
            </Text>
          </View>
        ) : lessons.length === 0 ? (
          <View className="items-center rounded-2xl bg-white px-5 py-8 dark:bg-[#1D2922]">
            <Text className="text-base font-extrabold text-[#252B27] dark:text-[#F1F4F1]">{t('No lessons available')}</Text>
            <Text className="mt-2 text-center text-xs leading-5 text-[#717A74] dark:text-[#AAB6AD]">
              {t('The instructor has not added course lessons yet.')}
            </Text>
          </View>
        ) : (
          <>
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-[8px] font-extrabold uppercase tracking-[1px] text-[#59846A]">
                {t('Lesson')} {selectedLesson + 1} {t('of')} {lessons.length}
              </Text>
              <Text className="text-[8px] font-bold uppercase tracking-[0.7px] text-[#59846A]">
                ◷  {videoFile?.durationSeconds ? formatDuration(videoFile.durationSeconds) : `About ${lesson.duration}`}
              </Text>
            </View>

            <Text className="text-[21px] font-medium leading-[27px] tracking-[-0.5px] text-[#22382C] dark:text-[#F1F4F1]">
              {lesson.title}
            </Text>

            {videoFile ? (
              <>
                {playbackLoading && !offlineVideoUri ? (
                  <View className="mt-3 items-center justify-center rounded-2xl bg-[#17261E] py-10">
                    <ActivityIndicator color="white" />
                    <Text className="mt-2 text-[9px] text-white">{t('Preparing secure video…')}</Text>
                  </View>
                ) : null}
                {playbackError && !offlineVideoUri ? (
                  <Text accessibilityRole="alert" className="mt-3 rounded-xl bg-[#FBE9E7] p-3 text-center text-[9px] leading-4 text-[#9A382C]">
                    {playbackError}
                  </Text>
                ) : null}
                {activeVideoUri && (!playbackLoading || offlineVideoUri) ? (
                  <LessonVideo key={activeVideoUri} uri={activeVideoUri} title={lesson.title} />
                ) : null}
                <View className="mt-3 rounded-2xl border border-[#DDE4DC] bg-white p-3 dark:border-[#35443A] dark:bg-[#1D2922]">
                  <View className="mb-2 flex-row items-center justify-between">
                    <Text className="text-[9px] font-extrabold uppercase tracking-[0.8px] text-[#14543E] dark:text-[#B7E2C2]">
                      {t('Download video')}
                    </Text>
                    <Text className="text-[8px] font-bold text-[#14543E] dark:text-[#B7E2C2]">
                      {downloadingVideo ? `${downloadProgress}%` : isVideoDownloaded ? t('Saved') : t('Ready')}
                    </Text>
                  </View>

                  <View className="h-2 overflow-hidden rounded-full bg-[#E7EAE5] dark:bg-[#35443A]">
                    <View
                      className={`h-full rounded-full ${downloadingVideo ? 'bg-[#14543E]' : 'bg-[#8BBB9A]'}`}
                      style={{ width: `${downloadingVideo ? downloadProgress : isVideoDownloaded ? 100 : 0}%` }}
                    />
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ disabled: isVideoDownloaded || downloadingVideo || playbackLoading }}
                    disabled={isVideoDownloaded || downloadingVideo || playbackLoading}
                    onPress={() => { void downloadVideoForOffline(); }}
                    className={`mt-3 h-10 flex-row items-center justify-center rounded-xl border border-[#DDE4DC] bg-[#F8FBF9] dark:border-[#35443A] dark:bg-[#101814] ${downloadingVideo || isVideoDownloaded ? 'opacity-75' : ''}`}
                  >
                    <Text className="text-[9px] font-extrabold text-[#14543E] dark:text-[#B7E2C2]">
                      {downloadingVideo
                        ? `${t('Downloading video…')} ${downloadProgress}%`
                        : isVideoDownloaded
                          ? `${t('Downloaded for offline')}  ✓`
                          : Platform.OS === 'web'
                            ? t('Download video')
                            : `${t('Download for offline')}  ↓`}
                    </Text>
                  </Pressable>
                </View>
                <Text className="mt-1 text-center text-[8px] text-[#858C87] dark:text-[#AAB6AD]">
                  {Platform.OS === 'web'
                    ? t('Saves the video to your browser’s downloads.')
                    : isVideoDownloaded
                      ? t('This video is saved on your device and can play without internet.')
                      : t('Save this video on your device to watch it offline.')}
                </Text>
              </>
            ) : pdfUri && pdfFile ? (
              <View className="mt-3 rounded-2xl border border-[#E1E5DF] bg-white p-4 dark:border-[#35443A] dark:bg-[#1D2922]">
                <View className="flex-row items-center">
                  <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#EAF1E8]">
                    <Text className="text-[10px] font-extrabold text-[#14543E]">PDF</Text>
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-[10px] font-bold text-[#252B27] dark:text-[#F1F4F1]">{t('Lesson notes')}</Text>
                    <Text numberOfLines={1} className="mt-1 text-[8px] text-[#858C87] dark:text-[#AAB6AD]">{pdfFile.name}</Text>
                  </View>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => { void openLessonPdf(); }}
                  className="mt-4 h-10 flex-row items-center justify-center rounded-xl bg-[#14543E]"
                >
                  <Text className="text-[9px] font-extrabold text-white">{t('Open PDF notes')}  ↗</Text>
                </Pressable>
                <Text className="mt-2 text-center text-[8px] text-[#858C87] dark:text-[#AAB6AD]">
                  {t('Opens in your device’s PDF viewer or browser.')}
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
                  accessibilityLabel={t('Video is not available')}
                  onPress={showUnavailableVideo}
                  className="h-12 w-12 items-center justify-center rounded-full bg-white"
                >
                  <Text className="ml-1 text-[20px] text-[#14543E]">▶</Text>
                </Pressable>
                <View className="absolute bottom-2 right-2 rounded bg-black/65 px-2 py-1">
                  <Text className="text-[7px] font-bold text-white">
                    {lesson.type === 'Video' ? t('VIDEO NOT ADDED') : t('PDF NOTES NOT ADDED')}
                  </Text>
                </View>
              </ImageBackground>
            )}

            <Text className="mt-2 text-[11px] leading-[18px] text-[#465149] dark:text-[#B5C0B7]">
              {lesson.type === 'Reading'
                ? (pdfUri ? `${t('Read the attached notes for')} ${lesson.title}.` : t('The instructor has not attached PDF notes to this lesson yet.'))
                : (course.description || `${lesson.title} is part of ${course.title}.`)}
            </Text>

            {objective ? (
              <View className="mt-3 flex-row items-start rounded-xl bg-[#E7EFE4] p-3 dark:bg-[#23362A]">
                <Text className="mr-2 text-[11px] text-[#477E62]">♧</Text>
                <Text className="flex-1 text-[9px] leading-[14px] text-[#46624F] dark:text-[#B5C0B7]">
                  {t('Remember')}: {objective}
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
                <Text className="text-[9px] font-bold text-[#14543E]">{t('Previous')}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: completingLesson }}
                disabled={completingLesson}
                onPress={() => { void completeLesson(); }}
                className={`h-10 min-w-[108px] flex-row items-center justify-center rounded-xl bg-[#14543E] px-3 ${completingLesson ? 'opacity-60' : ''}`}
              >
                <Text className="text-[9px] font-extrabold text-white">
                  {completingLesson ? t('Saving…') : isLastLesson ? t('Complete course') : `${t('Next topic')}  →`}
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
