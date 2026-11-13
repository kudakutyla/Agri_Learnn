import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { AdminBottomNav } from '../components/AdminBottomNav';
import { api, VideoRecord } from '../services/api';

function formatBytes(bytes: number) {
  return bytes >= 1024 * 1024 * 1024
    ? `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
    : `${Math.max(1, Math.round(bytes / (1024 * 1024)))} MB`;
}

export default function AdminVideosScreen() {
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadVideos = useCallback(async () => {
    try {
      const result = await api.admin.videos();
      setVideos(result.videos);
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load uploaded videos.');
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
    api.admin.videos()
      .then((result) => {
        if (active) {
          setVideos(result.videos);
          setError('');
        }
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load uploaded videos.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  function removeVideo(video: VideoRecord) {
    Alert.alert('Remove lesson video?', `Remove ${video.originalFileName} from ${video.courseTitle}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          setError('');
          void api.admin.removeVideo(video.id)
            .then(() => loadVideos())
            .catch((removeError: unknown) => {
              setError(removeError instanceof Error ? removeError.message : 'Could not remove the video.');
            });
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
    <View className="flex-1 bg-[#F7F7F2] dark:bg-[#101814]">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-8 pt-6"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { void refreshVideos(); }} />}
      >
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-xl font-extrabold text-[#252B27] dark:text-[#F1F4F1]">Uploaded videos</Text>
            <Text className="mt-1 text-[9px] text-[#717A74] dark:text-[#AAB6AD]">{videos.length} storage record{videos.length === 1 ? '' : 's'}</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={() => { void refreshVideos(); }} className="rounded-lg border border-[#DDE4DC] bg-white px-3 py-2 dark:border-[#35443A] dark:bg-[#1D2922]">
            <Text className="text-[9px] font-bold text-[#14543E] dark:text-[#B7E2C2]">Refresh</Text>
          </Pressable>
        </View>
        <Text className="mt-2 text-[10px] leading-4 text-[#717A74] dark:text-[#AAB6AD]">Review course associations and status. Removing a video also unlinks it from its lesson and removes its R2 object.</Text>
        {error ? <Text accessibilityRole="alert" className="mt-4 rounded-xl bg-[#FBE9E7] p-3 text-xs leading-5 text-[#9A382C]">{error}</Text> : null}
        {loading ? <Text className="py-8 text-center text-xs text-[#717A74] dark:text-[#AAB6AD]">Loading storage records…</Text> : null}
        {!loading && videos.length === 0 ? (
          <View className="mt-5 items-center rounded-xl border border-[#E1E5DF] bg-white p-5 dark:border-[#35443A] dark:bg-[#1D2922]">
            <Text className="text-xs font-bold text-[#252B27] dark:text-[#F1F4F1]">No videos recorded</Text>
          </View>
        ) : null}
        {videos.map((video) => (
          <View key={video.id} className="mt-3 rounded-xl border border-[#E1E5DF] bg-white p-4 dark:border-[#35443A] dark:bg-[#1D2922]">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-[11px] font-extrabold text-[#252B27] dark:text-[#F1F4F1]">{video.courseTitle}</Text>
                <Text className="mt-1 text-[10px] font-semibold text-[#477E62]">{video.lessonTitle}</Text>
                <Text numberOfLines={1} className="mt-2 text-[9px] text-[#717A74] dark:text-[#AAB6AD]">{video.originalFileName}</Text>
                <Text className="mt-1 text-[8px] text-[#858C87] dark:text-[#AAB6AD]">{video.mimeType} · {formatBytes(video.fileSize)} · {new Date(video.createdAt).toLocaleDateString()}</Text>
              </View>
              <Text className={`rounded-full px-2 py-1 text-[7px] font-extrabold ${video.status === 'uploaded' ? 'bg-[#EAF1E8] text-[#477E56]' : 'bg-[#FBE9E7] text-[#9A5147]'}`}>
                {video.status.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
            <View className="mt-3 flex-row gap-2">
              {video.status === 'uploaded' ? (
                <Pressable accessibilityRole="button" onPress={() => { void previewVideo(video); }} className="flex-1 items-center rounded-lg border border-[#DDE4DC] py-2.5 dark:border-[#35443A]">
                  <Text className="text-[9px] font-bold text-[#14543E] dark:text-[#B7E2C2]">Preview</Text>
                </Pressable>
              ) : null}
              <Pressable accessibilityRole="button" onPress={() => removeVideo(video)} className="flex-1 items-center rounded-lg border border-[#E5C5BF] py-2.5">
                <Text className="text-[9px] font-bold text-[#9A5147]">{video.status === 'pending' ? 'Abort upload' : 'Remove record'}</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
      <AdminBottomNav active="Dashboard" />
    </View>
  );
}
