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
2. Create a draft course, select a video lesson, and choose a valid MP4 below the multipart threshold. Confirm its duration is read automatically, displayed in the lesson form, and matches the media's actual duration.
3. Confirm the app reports upload progress and completion. Verify the API video record and private R2 object exist; confirm the saved duration matches the selected media and the API response contains no credentials, permanent object URL, or storage key.
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

Automated backend tests exercise authorization and explicit missing-configuration behavior. On 2026-11-12, a real-R2 smoke test confirmed bucket access, uploaded a temporary 32-byte MP4-header fixture, verified its object metadata and `ftyp` signature using the server verifier, received an HTTP `206` response with the requested 16-byte range through a signed playback URL, and deleted the temporary object.

Also on 2026-11-12, a separate isolated API test registered a fresh trainer, created an owned draft course, obtained a signed R2 upload URL, uploaded the same 32-byte header fixture, completed server-side object verification and lesson association, and confirmed the uploaded record appeared in that trainer's video listing. The test video was deleted from R2 and all test metadata was isolated in a temporary data store and removed. This verified the registration-to-upload API flow, not the mobile app screens.

The browser upload initially failed because bucket CORS allowed `http://localhost:3000`, but the Expo web app was running at `http://localhost:8081`, and the policy did not expose the multipart `ETag` response header. On 2026-11-12, the existing origins and methods were preserved, `http://localhost:8081` was added, and `ETag`, `Content-Length`, `Content-Range`, and `Accept-Ranges` were exposed. The R2 preflight returned HTTP `204` with the expected origin and PUT method. Retrying in the shared browser uploaded the trainer's selected MP4 through multipart R2 upload; the server accepted and associated it with the lesson, and the authoring screen displayed the lesson with its automatically detected 4-minute duration.

The earlier 32-byte fixtures are not decodable videos and do **not** prove playback or offline playback. The following remain **not run**: learner-enrollment streaming, Android/iOS device playback, replace/delete through the mobile application, and production Render configuration. No Android device/emulator was connected, and an iOS device/simulator was unavailable on the test host. Do not treat the upload check as completion of the full real-R2 acceptance checklist.
