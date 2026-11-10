# AgriLearn API

The API runs on port `4000` by default.

## Public endpoints

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/health` | - | Service health |
| POST | `/api/auth/register` | `name`, `email`, `password`, optional `role` | Public user and JWT |
| POST | `/api/auth/login` | `email`, `password` | Public user and JWT |
| POST | `/api/auth/forgot-password` | `email` | Sends a single-use password reset link when the email belongs to an account; response does not disclose account existence |
| POST | `/api/auth/reset-password` | `token`, `newPassword`, `confirmPassword` | Resets the password when the token is valid, unused, and unexpired |

## Protected endpoints

Send `Authorization: Bearer <token>`.

| Method | Path | Authorization | Response |
|---|---|---|---|
| GET | `/api/me` | Any authenticated role | Current public user |
| GET | `/api/admin/users` | Admin | User directory with public profile fields only; password hashes are excluded |
| GET | `/api/admin/overview` | Admin | Persisted dashboard metrics, six months of learner registrations, and recent platform activity |
| GET | `/api/admin/reports` | Admin | Unique learners active in the last 30 days, seven daily activity counts, average lesson completion across persisted enrolments, certificate total, and open opportunity count |
| GET | `/api/admin/approvals` | Admin | Submitted and previously reviewed courses, trainer names, and review history |
| POST | `/api/admin/approvals/:courseId` | Admin | Body: `status` (`approved` or `rejected`) and optional `note`; returning a course requires at least 5 characters of feedback and each review is recorded |
| GET | `/api/trainer/courses` | Trainer | Courses owned by the authenticated trainer, including private return feedback |

## Learning and opportunities

Protected learners can submit applications and assessment attempts, and retrieve their certificates. Trainers create and edit owned courses; admins can manage every course. Employers create jobs and invitations. Admins manage categories and can read the user directory. Course, job, category, application, invitation, attempt, and certificate data is persisted.

### Jobs and applications

| Method | Path | Authorization | Notes |
|---|---|---|---|
| GET | `/api/jobs` | Public | Lists open jobs, including any `requiredSkills` |
| POST | `/api/jobs` | Employer or admin | Creates an open job with `title`, `location`, `description`, optional `requiredSkills` (up to 12 items), and `type` |
| POST | `/api/jobs/:jobId/applications` | Learner or employer | Applies to an open job; duplicate applications return `409` |

`requiredSkills` is an optional array of 2–80 character skill names. The Opportunities screen displays these requirements to applicants before they apply.

### Assessments and certificates

| Method | Path | Authorization | Notes |
|---|---|---|---|
| POST | `/api/courses/:id/lessons/:lessonIndex/complete` | Learner or employer | Persists lesson completion in course order |
| GET | `/api/courses/:id/progress` | Learner or employer | Returns the signed-in learner's completed lessons and next lesson index |
| GET | `/api/courses/:id/learner-assessment` | Learner or employer | Published course questions and pass mark after all lessons are complete; correct answers are not returned |
| POST | `/api/assessments/:id/attempts` | Learner or employer | Body: `answers` as one option index per question; requires all lessons complete; server calculates score and pass result |
| GET | `/api/certificates` | Authenticated | Lists credentials for the current learner/employer |

A passing attempt after all lessons in a published course are completed issues one certificate per learner and course. The certificate includes the skills defined by the course; these are shown on the learner’s Skills Passport only after earning the certificate. Further passing attempts return the existing certificate rather than creating duplicate credentials. Attempts against unpublished or incomplete courses and incomplete or invalid answer sets are rejected.

### Courses

| Method | Path | Authorization | Notes |
|---|---|---|---|
| GET | `/api/courses` | Public | Lists available course records |
| POST | `/api/courses` | Trainer or admin | Creates an owned draft |
| PATCH | `/api/courses/:id` | Owner trainer or admin | Updates validated course fields |
| DELETE | `/api/courses/:id` | Owner trainer or admin | Deletes a course |
| POST | `/api/courses/:id/uploads` | Owner trainer or admin | Multipart `file` upload for PDF notes; `X-Upload-Kind: video` returns `410` |
| GET | `/api/courses/:id/files/:fileId` | Public for approved courses; otherwise owner trainer or admin | Downloads a PDF attached to the course |

Course drafts accept `title`, `category`, `description`, `objectives`, up to 12 optional `skills` (each 2–80 characters and case-insensitively unique), optional `coverImage`, `lessons`, optional `assessment`, `level`, and `status`. Course skills are copied to the learner’s certificate when they pass the assessment after completing all lessons. A lesson contains a `title`, `type` (`Video` or `Reading`), `duration`, and an optional uploaded `file` record. Video lessons accept MP4 and MOV uploads directly to a private Cloudflare R2 bucket; the backend verifies the completed object before saving metadata. Reading lessons accept PDF notes up to 25 MB stored using the existing API-local file path. See [CLOUDFLARE_R2_SETUP.md](./CLOUDFLARE_R2_SETUP.md) for backend environment configuration. Cover images are optional base64 JPG/PNG data URIs up to 3 MB; the JSON request limit is 4 MB.

### Cloud video storage

| Method | Path | Authorization | Notes |
|---|---|---|---|
| POST | `/api/courses/:id/videos/uploads` | Owner trainer or admin | Body: `lessonIndex`, `fileName`, `mimeType`, `fileSize`, optional `durationSeconds`; returns a 15-minute signed PUT URL or multipart upload session |
| POST | `/api/videos/:id/parts/:partNumber/upload-url` | Owner trainer or admin | Returns a short-lived URL for one multipart part |
| POST | `/api/videos/:id/complete` | Owner trainer or admin | Completes multipart upload (body has ordered `parts` with `partNumber` and `etag`), verifies object size/type/container header, and saves metadata |
| GET | `/api/videos/:id/playback-url` | Authenticated course owner/admin or enrolled learner | Returns a fresh 5-minute playback URL; callers cannot supply an R2 key |
| GET | `/api/trainer/videos` | Trainer or admin | Lists videos belonging to the trainer's courses, with upload status and lesson association |
| GET | `/api/admin/videos` | Admin | Lists all video metadata and cleanup statuses without storage keys |
| DELETE | `/api/videos/:id` | Owner trainer or admin | Aborts/removes the object and unlinks the lesson |

Only MP4/MOV extensions with matching MIME types are accepted; the server additionally verifies the ISO-BMFF `ftyp` signature after upload. The default maximum is 2 GiB, multipart threshold 100 MiB, and part size 16 MiB. Configure limits with `R2_MAX_VIDEO_BYTES`, `R2_MULTIPART_THRESHOLD_BYTES`, and `R2_MULTIPART_PART_SIZE_BYTES`. R2 credentials are backend-only and presigned URLs are never stored. Learners can play only videos attached to lessons in approved courses where they have an enrollment record. The current backend uses the JSON file store; there is no PostgreSQL/Neon schema yet.

Public registration roles are limited to `learner`, `employer`, and `trainer`; administrator accounts must be provisioned outside public registration. Employers retain learner access to opportunities, applications, assessments, and their own certificates. Learners can only view their own applications, employers can view their own applications and applications to their jobs, and administrators can view all applications. Trainers cannot access application records. Invalid input returns `400`, duplicate accounts return `409`, missing or expired authentication returns `401`, and forbidden roles return `403`.
