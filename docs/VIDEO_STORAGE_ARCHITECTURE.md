# Video Storage Architecture

## Components and persistence

- The Expo app selects MP4 or MOV files with the existing document picker and uses `expo-video` for playback.
- The Express API authenticates every upload, completion, management, and playback request. It uses the AWS JavaScript SDK against Cloudflare's S3-compatible R2 endpoint.
- Video bytes go directly from the device to a private R2 bucket using short-lived presigned URLs. Large uploads use S3 multipart upload; the API does not proxy video bytes.
- The backend currently persists AgriLearn records in `server/data/agrilearn.json`. The video record stores only metadata and an opaque R2 object key; the video binary is never stored in JSON or PostgreSQL. There is no PostgreSQL/Neon schema or migration in this project yet.
- Existing reading PDFs continue using the current API upload/download path. The old local-disk video upload route now returns `410`; existing local video records must be re-uploaded to R2.

## Upload lifecycle

1. A trainer selects a course, lesson, and local video. The app submits the original name, MIME type, file size, and lesson index to `POST /api/courses/:id/videos/uploads`.
2. The API checks trainer/admin role, course ownership, edit status, supported extension/MIME pair, configured maximum size, and (for published courses) that the selected lesson exists and is a video lesson.
3. The server generates an unpredictable UUID object key; the client cannot choose an R2 key or bucket. Files below the configured multipart threshold use a signed PUT. Larger videos use `CreateMultipartUpload` and request a signed URL for each numbered part.
4. The app transfers the bytes directly to R2 and reports progress. Multipart ETags are sent back to the API.
5. `POST /api/videos/:id/complete` completes multipart uploads, checks object size and MIME metadata, and reads the MP4/MOV `ftyp` container signature from R2. Only verified objects receive `uploaded` status. If the lesson already exists, completion associates the new file and removes the replaced object; cleanup failures remain visible to administrators.
6. Draft lesson metadata is saved by the existing course authoring workflow. A video can only be played after its video ID is attached to the matching course lesson.

Default limits are 2 GiB maximum, multipart at 100 MiB, and 16 MiB parts. Configure `R2_MAX_VIDEO_BYTES`, `R2_MULTIPART_THRESHOLD_BYTES`, and `R2_MULTIPART_PART_SIZE_BYTES` on the backend. Upload and part URLs expire after 15 minutes; playback URLs expire after 5 minutes.

## Playback authorization

The app asks `GET /api/videos/:id/playback-url` for a fresh signed GET URL. The API looks up the video record (never accepts a caller-provided object key), confirms the lesson still references that video, and checks storage availability. Course owners and administrators may preview their permitted content. Learners/employers must be enrolled in an approved course; unpublished content and un-enrolled learners are denied. R2 remains private, and its signed GET supports the byte-range requests used for streaming and seeking. The app uses Expo Video native controls, including play/pause and seeking, and shows loading/error states.

Course learning progress continues using the existing persisted progress records. `GET /api/courses/:id/progress` returns the next incomplete lesson so the lesson screen can resume.

## Management and cleanup

- `GET /api/trainer/videos` shows all videos for a trainer's courses, including pending and failed uploads.
- `GET /api/admin/videos` provides administrators with course/lesson association, metadata, and status.
- `DELETE /api/videos/:id` checks course ownership/admin role, aborts incomplete multipart uploads or removes the object, and unlinks the lesson. Failed cleanup remains represented as a `delete_failed` record if replacing a file.
- Administrators can remove stale pending/failed records in the mobile administration screen. Configure an R2 lifecycle rule for incomplete multipart uploads as additional cleanup.
- Deleting a course removes its managed R2 video records and objects before deleting the course record. If R2 cleanup fails, the API reports the failure and leaves the course metadata available for retry.

## Database migration

The JSON store gains a `videos` collection with fields for ID, course ID, lesson index, original filename, object key, MIME type, byte size, optional duration seconds, upload status, uploading user, timestamps, and multipart upload ID while the upload is pending. Presigned URLs are never stored. When migrating to PostgreSQL/Neon, map this record to a `Video` table with a foreign key to `Course`, unique object key, indexed course/lesson/status columns, and an appropriate user foreign key. Keep R2 object keys and authorization checks; only replace the persistence adapter. Do not move video bytes into the database.
