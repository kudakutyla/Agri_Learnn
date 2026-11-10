import { File as ExpoFile } from 'expo-file-system';
import { api, LocalUploadFile } from './api';

const videoMimeByExtension: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
};

function mimeTypeFor(file: LocalUploadFile) {
  const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  const expectedMimeType = videoMimeByExtension[extension];
  if (!expectedMimeType || (file.mimeType && file.mimeType !== expectedMimeType)) {
    throw new Error('Choose a supported MP4 or MOV video file.');
  }
  return expectedMimeType;
}

async function getBlob(file: LocalUploadFile): Promise<Blob> {
  if (file.file) return file.file;
  if (file.uri.startsWith('file:') || file.uri.startsWith('content:')) {
    return new ExpoFile(file.uri);
  }
  const response = await fetch(file.uri);
  if (!response.ok) throw new Error('Could not read the selected video file.');
  return response.blob();
}

function uploadBlob(
  url: string,
  blob: Blob,
  mimeType: string,
  onProgress: (loaded: number) => void,
): Promise<string | undefined> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('PUT', url);
    request.timeout = 15 * 60 * 1000;
    request.setRequestHeader('Content-Type', mimeType);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded);
    };
    request.onerror = () => reject(new Error('Video upload failed. Check your connection and try again.'));
    request.ontimeout = () => reject(new Error('Video upload timed out. Please try again.'));
    request.onload = () => {
      if (request.status < 200 || request.status >= 300) {
        reject(request.status === 403
          ? new Error('Storage rejected the upload. The secure link may have expired; retry or contact the administrator.')
          : new Error(`Video upload failed with status ${request.status}.`));
        return;
      }
      resolve(request.getResponseHeader('ETag') ?? undefined);
    };
    request.send(blob);
  });
}

export async function uploadVideo(
  courseId: string,
  lessonIndex: number,
  file: LocalUploadFile,
  onProgress: (progress: number) => void,
) {
  const mimeType = mimeTypeFor(file);
  const blob = await getBlob(file);
  const fileSize = file.size ?? blob.size;
  if (!Number.isSafeInteger(fileSize) || fileSize <= 0 || blob.size !== fileSize) {
    throw new Error('The selected video file has an invalid size. Choose it again and retry.');
  }
  const { video, upload } = await api.videos.beginUpload(courseId, {
    lessonIndex,
    fileName: file.name,
    mimeType,
    fileSize,
    durationSeconds: file.durationSeconds,
  });

  try {
    let parts: { partNumber: number; etag: string }[] | undefined;
    if (upload.type === 'single') {
      await uploadBlob(upload.url, blob, mimeType, (loaded) => {
        onProgress(Math.min(99, Math.floor((loaded / fileSize) * 100)));
      });
    } else {
      const partCount = Math.ceil(fileSize / upload.partSizeBytes);
      parts = [];
      let completedBytes = 0;
      for (let partNumber = 1; partNumber <= partCount; partNumber += 1) {
        const start = (partNumber - 1) * upload.partSizeBytes;
        const end = Math.min(fileSize, start + upload.partSizeBytes);
        const part = blob.slice(start, end, mimeType);
        const { url } = await api.videos.partUploadUrl(video.id, partNumber);
        let partProgress = 0;
        const etag = await uploadBlob(url, part, mimeType, (loaded) => {
          partProgress = loaded;
          onProgress(Math.min(99, Math.floor(((completedBytes + partProgress) / fileSize) * 100)));
        });
        if (!etag) throw new Error('The storage service did not confirm an uploaded video part. Check the bucket CORS settings.');
        parts.push({ partNumber, etag });
        completedBytes += part.size;
      }
    }

    const completed = await api.videos.completeUpload(video.id, parts);
    onProgress(100);
    return completed.file;
  } catch (uploadError) {
    try {
      await api.videos.remove(video.id);
    } catch (cleanupError) {
      const uploadMessage = uploadError instanceof Error ? uploadError.message : 'Video upload failed.';
      const cleanupMessage = cleanupError instanceof Error ? cleanupError.message : 'Unknown cleanup error.';
      throw new Error(`${uploadMessage} The incomplete upload could not be cleaned up: ${cleanupMessage}`);
    }
    throw uploadError;
  }
}
