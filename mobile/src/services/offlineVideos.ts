import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import { Course } from './api';

function getOfflineDirectory() {
  return new Directory(Paths.document, 'offline-videos');
}

function safeFileNamePart(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function videoExtension(mimeType: string) {
  if (mimeType === 'video/quicktime') return 'mov';
  if (mimeType === 'video/x-m4v') return 'm4v';
  if (mimeType === 'video/webm') return 'webm';
  return 'mp4';
}

export function getOfflineVideoFile(courseId: string, fileId: string, mimeType: string) {
  const fileName = `${safeFileNamePart(courseId)}-${safeFileNamePart(fileId)}.${videoExtension(mimeType)}`;
  return new File(getOfflineDirectory(), fileName);
}

export async function downloadOfflineVideo(
  course: Course,
  fileId: string,
  mimeType: string,
  remoteUri: string,
  onProgress: (progress: number) => void,
) {
  if (Platform.OS === 'web') {
    throw new Error('Use the browser download action on web.');
  }

  const offlineDirectory = getOfflineDirectory();
  offlineDirectory.create({ idempotent: true, intermediates: true });
  const destination = getOfflineVideoFile(course.id, fileId, mimeType);
  try {
    return await File.downloadFileAsync(remoteUri, destination, {
      idempotent: true,
      onProgress: ({ bytesWritten, totalBytes }) => {
        if (totalBytes > 0) onProgress(Math.min(100, Math.round((bytesWritten / totalBytes) * 100)));
      },
    });
  } catch (error) {
    if (destination.exists) destination.delete();
    throw error;
  }
}

export async function saveCourseForOffline(course: Course) {
  if (Platform.OS === 'web') return;

  const offlineDirectory = getOfflineDirectory();
  offlineDirectory.create({ idempotent: true, intermediates: true });
  const courseFile = new File(offlineDirectory, `${safeFileNamePart(course.id)}.course.json`);
  await courseFile.write(JSON.stringify(course));
}

export async function getOfflineCourse(courseId: string): Promise<Course | null> {
  if (Platform.OS === 'web') return null;

  const courseFile = new File(getOfflineDirectory(), `${safeFileNamePart(courseId)}.course.json`);
  if (!courseFile.exists) return null;
  const course = JSON.parse(await courseFile.text()) as Course;
  if (course.id !== courseId) throw new Error('Saved course data is invalid.');
  return course;
}
