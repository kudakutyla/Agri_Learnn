import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const MiB = 1024 * 1024;
const signedUrlSeconds = 15 * 60;

export class R2ConfigurationError extends Error {}
export class R2ObjectMissingError extends Error {}
export class InvalidVideoContentError extends Error {}

export type VideoUploadPolicy = {
  maxBytes: number;
  multipartThresholdBytes: number;
  partSizeBytes: number;
};

function requiredEnvironment(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new R2ConfigurationError();
  return value;
}

function positiveInteger(name: string, fallback: number, minimum: number) {
  const value = process.env[name]?.trim();
  if (!value) return fallback;
  const parsed = Number(value);
  if (/^\d+$/.test(value) && Number.isSafeInteger(parsed) && parsed >= minimum) return parsed;
  throw new R2ConfigurationError();
}

export function getVideoUploadPolicy(): VideoUploadPolicy {
  const partSizeBytes = positiveInteger('R2_MULTIPART_PART_SIZE_BYTES', 16 * MiB, 5 * MiB);
  const maxBytes = positiveInteger('R2_MAX_VIDEO_BYTES', 2 * 1024 * MiB, 1);
  return {
    maxBytes,
    multipartThresholdBytes: positiveInteger('R2_MULTIPART_THRESHOLD_BYTES', 100 * MiB, 5 * MiB),
    partSizeBytes,
  };
}

function createR2Client() {
  const accountId = requiredEnvironment('R2_ACCOUNT_ID');
  const endpoint = requiredEnvironment('R2_ENDPOINT');
  const accessKeyId = requiredEnvironment('R2_ACCESS_KEY_ID');
  const secretAccessKey = requiredEnvironment('R2_SECRET_ACCESS_KEY');
  const region = process.env.R2_REGION?.trim() || 'auto';

  let endpointUrl: URL;
  try {
    endpointUrl = new URL(endpoint);
  } catch {
    throw new R2ConfigurationError();
  }
  if (
    endpointUrl.protocol !== 'https:'
    || endpointUrl.hostname !== `${accountId}.r2.cloudflarestorage.com`
    || endpointUrl.pathname !== '/'
    || endpointUrl.search
    || endpointUrl.username
    || endpointUrl.password
  ) {
    throw new R2ConfigurationError();
  }

  return {
    client: new S3Client({
      endpoint: endpointUrl.origin,
      region,
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    }),
    bucket: requiredEnvironment('R2_BUCKET_NAME'),
  };
}

export async function createSingleUploadUrl(input: {
  key: string;
  mimeType: string;
}) {
  const { client, bucket } = createR2Client();
  try {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: input.key,
      ContentType: input.mimeType,
    });
    return await getSignedUrl(client, command, { expiresIn: signedUrlSeconds });
  } finally {
    client.destroy();
  }
}

export async function beginMultipartUpload(input: { key: string; mimeType: string }) {
  const { client, bucket } = createR2Client();
  try {
    const result = await client.send(new CreateMultipartUploadCommand({
      Bucket: bucket,
      Key: input.key,
      ContentType: input.mimeType,
    }));
    if (!result.UploadId) throw new Error('R2 did not return a multipart upload ID');
    return result.UploadId;
  } finally {
    client.destroy();
  }
}

export async function createPartUploadUrl(input: {
  key: string;
  uploadId: string;
  partNumber: number;
}) {
  const { client, bucket } = createR2Client();
  try {
    return await getSignedUrl(client, new UploadPartCommand({
      Bucket: bucket,
      Key: input.key,
      UploadId: input.uploadId,
      PartNumber: input.partNumber,
    }), { expiresIn: signedUrlSeconds });
  } finally {
    client.destroy();
  }
}

export async function completeMultipartUpload(input: {
  key: string;
  uploadId: string;
  parts: Array<{ partNumber: number; etag: string }>;
}) {
  const { client, bucket } = createR2Client();
  try {
    await client.send(new CompleteMultipartUploadCommand({
      Bucket: bucket,
      Key: input.key,
      UploadId: input.uploadId,
      MultipartUpload: {
        Parts: input.parts.map((part) => ({ PartNumber: part.partNumber, ETag: part.etag })),
      },
    }));
  } finally {
    client.destroy();
  }
}

export async function abortMultipartUpload(input: { key: string; uploadId: string }) {
  const { client, bucket } = createR2Client();
  try {
    await client.send(new AbortMultipartUploadCommand({
      Bucket: bucket,
      Key: input.key,
      UploadId: input.uploadId,
    }));
  } finally {
    client.destroy();
  }
}

export async function verifyUploadedVideo(input: {
  key: string;
  mimeType: string;
  size: number;
}) {
  const { client, bucket } = createR2Client();
  try {
    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: input.key }));
    if (head.ContentLength === undefined || head.ContentLength !== input.size || head.ContentType !== input.mimeType) {
      throw new InvalidVideoContentError();
    }

    const preview = await client.send(new GetObjectCommand({
      Bucket: bucket,
      Key: input.key,
      Range: 'bytes=0-31',
    }));
    if (!preview.Body) throw new InvalidVideoContentError();
    const header = await preview.Body.transformToByteArray();
    const hasFtypBox = header.length >= 12
      && String.fromCharCode(...header.slice(4, 8)) === 'ftyp';
    if (!hasFtypBox) throw new InvalidVideoContentError();
    return { size: head.ContentLength };
  } catch (error) {
    if (error instanceof InvalidVideoContentError) throw error;
    if (error && typeof error === 'object' && '$metadata' in error) {
      const metadata = (error as { $metadata?: { httpStatusCode?: number } }).$metadata;
      if (metadata?.httpStatusCode === 404) throw new R2ObjectMissingError();
    }
    throw error;
  } finally {
    client.destroy();
  }
}

export async function createPlaybackUrl(key: string, downloadFileName?: string) {
  const { client, bucket } = createR2Client();
  try {
    return await getSignedUrl(client, new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ...(downloadFileName ? {
        ResponseContentDisposition: `attachment; filename="${downloadFileName.replace(/["\\]/g, '_')}"`,
      } : {}),
    }), { expiresIn: 5 * 60 });
  } finally {
    client.destroy();
  }
}

export async function deleteVideoObject(key: string) {
  const { client, bucket } = createR2Client();
  try {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } finally {
    client.destroy();
  }
}
