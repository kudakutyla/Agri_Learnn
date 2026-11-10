# Video Upload and Playback Tests

## Automated checks

Run from `server/`:

```powershell
npm test
npm run build
```

The automated API tests cover trainer authentication/role enforcement, invalid MP4/MOV metadata, configured size limits, the disabled legacy disk-video route, safe behavior when R2 is not configured, learner enrollment gating, and administrator metadata access without exposing object keys.

## Real R2 acceptance checklist

These are integration checks and require a development R2 bucket and bucket-scoped credentials configured in `server/.env`; automated tests do not fake a successful cloud upload.

1. Log in to the mobile app as a trainer.
2. Create a draft course, select a video lesson, and choose a valid MP4 below the multipart threshold.
3. Confirm the app reports upload progress and completion. Verify the API video record and private R2 object exist; confirm the API response contains no credentials, permanent object URL, or storage key.
4. Preview the video as the trainer and verify playback.
5. Upload an MP4 above the configured multipart threshold. Verify each part, ETag confirmation, object size, and playback.
6. Try an unsupported extension/MIME pair, oversized file, changed content with a non-MP4/MOV signature, expired URL, and incorrect R2 credentials. Each failure should be surfaced and should not produce an `uploaded` record.
7. Publish the course, enrol as a learner, reopen the lesson, and verify secure streaming, native play/pause, buffering/loading state, seeking, and video duration when available.
8. Request playback without a token, with a learner not enrolled, and for an unpublished/deleted lesson. Confirm the API denies access.
9. Replace the video as its trainer and confirm the lesson points to the new object and the old object is removed.
10. Delete a video as its trainer and as an administrator. Confirm it is unlinked and cannot return a new playback URL. Confirm a different trainer cannot replace or delete it.
11. Leave a multipart upload pending, inspect it in the admin video screen, abort/clean it, and confirm the object is unavailable. Also verify the bucket lifecycle rule for incomplete multipart uploads.
12. Repeat representative playback/upload checks on supported Android and iOS devices and the web app. Confirm web bucket CORS exposes `ETag` for multipart completion.

## Current validation record

The implementation was validated without R2 credentials. Automated backend tests exercise authorization and explicit missing-configuration behavior, but the following were **not run**: real R2 credential validation, object PUT/multipart completion, live signed playback, replace/delete against R2, Android/iOS device playback, and production Render configuration. Do not treat successful local tests as proof of a real R2 upload.
