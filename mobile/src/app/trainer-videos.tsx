import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { CreatorBottomNav } from '../components/CreatorBottomNav';
import { api, VideoRecord } from '../services/api';
import { uploadVideo } from '../services/videoStorage';

function formatBytes(bytes: number) {
  return bytes >= 1024 * 1024 * 1024
    ? `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
    : `${Math.max(1, Math.round(bytes / (1024 * 1024)))} MB`;
}

function statusLabel(status: VideoRecord['status']) {
  if (status === 'uploaded') return 'READY';
  if (status === 'pending') return 'UPLOAD INCOMPLETE';
  if (status === 'delete_failed') return 'CLEANUP REQUIRED';
  return 'FAILED';
}

export default function TrainerVideosScreen() {
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyVideoId, setBusyVideoId] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const loadVideos = useCallback(async () => {
    try {
      const result = await api.trainer.videos.list();
      setVideos(result.videos);
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load your videos.');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshVideos = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadVideos();
    } finally {
      setRefreshing(false);
    }
  }, [loadVideos]);

  useEffect(() => {
    let active = true;
    api.trainer.videos.list()
      .then((result) => {
        if (active) {
          setVideos(result.videos);
          setError('');
        }
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load your videos.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  async function replaceVideo(video: VideoRecord) {
    setError('');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['video/mp4', 'video/quicktime'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      setBusyVideoId(video.id);
      setProgress(0);
      await uploadVideo(video.courseId, video.lessonIndex, {
        uri: file.uri,
        name: file.name,
        mimeType: file.mimeType,
        size: file.size,
        durationSeconds: video.durationSeconds,
        file: file.file,
      }, setProgress);
      await loadVideos();
    } catch (replaceError) {
      setError(replaceError instanceof Error ? replaceError.message : 'Could not replace the lesson video.');
    } finally {
      setBusyVideoId('');
    }
  }

  function removeVideo(video: VideoRecord) {
    Alert.alert('Delete lesson video?', `Remove ${video.originalFileName} from ${video.lessonTitle}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setError('');
          setBusyVideoId(video.id);
          void api.videos.remove(video.id)
            .then(() => loadVideos())
            .catch((removeError: unknown) => {
              setError(removeError instanceof Error ? removeError.message : 'Could not delete the video.');
            })
            .finally(() => setBusyVideoId(''));
        },
      },
    ]);
  }

  async function previewVideo(video: VideoRecord) {
    setError('');
    try {
      const { url } = await api.videos.playbackUrl(video.id);
      await Linking.openURL(url);
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : 'Could not preview the video.');
    }
  }

  return (
    <View className="flex-1 bg-[#F7F7F2]">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-8 pt-6"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { void refreshVideos(); }} />}
      >
        <Text className="text-xl font-extrabold text-[#252B27]">Lesson videos</Text>
        <Text className="mt-2 text-xs leading-5 text-[#717A74]">
          Videos are stored privately in Cloudflare R2. Playback links are generated only when you preview a permitted course.
        </Text>
        {error ? <Text accessibilityRole="alert" className="mt-4 rounded-xl bg-[#FBE9E7] p-3 text-xs leading-5 text-[#9A382C]">{error}</Text> : null}
        {loading ? <Text className="py-8 text-center text-xs text-[#717A74]">Loading your videos…</Text> : null}
        {!loading && videos.length === 0 ? (
          <View className="mt-5 items-center rounded-xl border border-[#E1E5DF] bg-white p-5">
            <Text className="text-xs font-bold text-[#252B27]">No uploaded videos</Text>
            <Text className="mt-2 text-center text-[10px] leading-4 text-[#717A74]">Add a video to a lesson while creating or editing a module.</Text>
          </View>
        ) : null}
        {videos.map((video) => (
          <View key={video.id} className="mt-3 rounded-xl border border-[#E1E5DF] bg-white p-4">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-[11px] font-extrabold text-[#252B27]">{video.courseTitle}</Text>
                <Text className="mt-1 text-[10px] font-semibold text-[#477E62]">{video.lessonTitle}</Text>
                <Text numberOfLines={1} className="mt-2 text-[9px] text-[#717A74]">{video.originalFileName} · {formatBytes(video.fileSize)}</Text>
              </View>
              <Text className={`rounded-full px-2 py-1 text-[7px] font-extrabold ${video.status === 'uploaded' ? 'bg-[#EAF1E8] text-[#477E56]' : 'bg-[#FBE9E7] text-[#9A5147]'}`}>
                {statusLabel(video.status)}
              </Text>
            </View>
            {busyVideoId === video.id ? (
              <Text className="mt-3 text-center text-[9px] font-bold text-[#14543E]">Uploading replacement… {progress}%</Text>
            ) : null}
            <View className="mt-3 flex-row gap-2">
              {video.status === 'uploaded' ? (
                <>
                  <Pressable accessibilityRole="button" onPress={() => { void previewVideo(video); }} className="flex-1 items-center rounded-lg border border-[#DDE4DC] py-2.5">
                    <Text className="text-[9px] font-bold text-[#14543E]">Preview</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    disabled={Boolean(busyVideoId)}
                    onPress={() => { void replaceVideo(video); }}
                    className="flex-1 items-center rounded-lg bg-[#14543E] py-2.5"
                  >
                    <Text className="text-[9px] font-bold text-white">Replace</Text>
                  </Pressable>
                </>
              ) : null}
              <Pressable
                accessibilityRole="button"
                disabled={Boolean(busyVideoId)}
                onPress={() => removeVideo(video)}
                className="flex-1 items-center rounded-lg border border-[#E5C5BF] py-2.5"
              >
                <Text className="text-[9px] font-bold text-[#9A5147]">{video.status === 'uploaded' ? 'Delete' : 'Clean up'}</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
      <CreatorBottomNav />
    </View>
  );
}
