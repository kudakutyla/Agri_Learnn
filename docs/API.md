# AgriLearn API

The API runs on port `4000` by default.

## Public endpoints

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/health` | - | Service health |
| POST | `/api/auth/register` | `name`, `email`, `password`; optional `role`, `mobileNumber`, `province`, `category`, `primaryInterest`, and `language` | Public user and JWT; `language` accepts the supported AgriLearn language choices and defaults to `English` |
| POST | `/api/auth/login` | `email`, `password` | Public user and JWT |
| POST | `/api/auth/forgot-password` | `email` | Sends a single-use password reset link when the email belongs to an account; response does not disclose account existence |
| POST | `/api/auth/reset-password` | `token`, `newPassword`, `confirmPassword` | Resets the password when the token is valid, unused, and unexpired |

## Protected endpoints

Send `Authorization: Bearer <token>`.

| Method | Path | Authorization | Response |
|---|---|---|---|
| GET | `/api/me` | Any authenticated role | Current public user |
| PATCH | `/api/me` | Any authenticated role | Updates `name`, `email`, `mobileNumber`, `province`, `category`, `primaryInterest`, and optional `language`; returns the updated public user |
| GET | `/api/me/notifications` | Any authenticated role | Only the signed-in user's notifications, newest first; new accounts receive a welcome notification |
| GET | `/api/me/progress` | Learner or employer | Only the signed-in user's approved-course enrolments, with completed lesson indexes, progress percentage, and next lesson; an account with no enrolments receives an empty `courses` array |
| GET | `/api/smme/plan` | Employer | The signed-in employer's private enterprise profile, latest diagnostic, assessment history, and tracked development actions; returns `null` before setup |
| PUT | `/api/smme/plan` | Employer | Saves validated business-profile fields, an 11-area diagnostic (scores 1–5), funding-readiness checklist, or mentor-need marker; repeated diagnostics append a readiness-score history entry |
| GET | `/api/admin/users` | Admin | User directory with public profile fields only; password hashes are excluded |
| GET | `/api/admin/overview` | Admin | Persisted dashboard metrics, six months of learner registrations, and recent platform activity |
| GET | `/api/admin/reports` | Admin | Unique learners active in the last 30 days, seven daily activity counts, average lesson completion across persisted enrolments, certificate total, and open opportunity count |
| GET | `/api/admin/approvals` | Admin | Submitted and previously reviewed courses, trainer names, and review history |
| POST | `/api/admin/approvals/:courseId` | Admin | Body: `status` (`approved` or `rejected`) and optional `note`; returning a course requires at least 5 characters of feedback and each review is recorded |
| GET | `/api/trainer/courses` | Trainer | Courses owned by the authenticated trainer, including private return feedback |
| GET | `/api/trainer/analytics` | Trainer | Aggregate metrics and per-course breakdowns for the trainer's approved courses; excludes learner identities and raw answers |
| GET | `/api/trainer/analytics/active-learners` | Trainer | On-demand names of learners active in the preceding 30 days, grouped by the trainer's approved courses; returns names only, with no email, learner ID, or assessment answers |

## Learning and opportunities

Protected learners can submit applications and assessment attempts, and retrieve their certificates. Trainers create and edit owned courses; admins can manage every course. Employers create jobs and invitations. Admins manage categories and can read the user directory. Course, job, enterprise-plan, category, application, invitation, attempt, and certificate data is persisted.

The SMME plan supports a private business profile, handbook-aligned enterprise diagnostic, score-derived skills gaps, recommendations from matching published courses, a funding-preparation checklist, a recorded mentor need, and repeat-assessment history. The current app does not connect to mentor matching, funding applications, or a buyer marketplace; recording readiness or market-profile details does not contact a provider or publish a listing.

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
| POST | `/api/courses/:id/enrol` | Learner or employer | Creates the user's enrolment and a notification for that account |
| GET | `/api/courses/:id/progress` | Learner or employer | Returns the signed-in learner's completed lessons and next lesson index |
| PUT | `/api/courses/:id/progress` | Learner or employer | Body: `{ "lessonIndex": 0 }`; saves a resume position without marking the lesson complete and creates the learner's enrolment if needed |
| GET | `/api/me/progress` | Learner or employer | Returns that user's enrolled approved courses with lesson completion and calculated progress |
| GET | `/api/courses/:id/learner-assessment` | Learner or employer | Published course questions and pass mark after all lessons are complete; correct answers are not returned |
| POST | `/api/assessments/:id/attempts` | Learner or employer | Body: `answers` as one option index per question; requires all lessons complete; server calculates score and pass result |
| GET | `/api/certificates` | Authenticated | Lists credentials for the current learner/employer |

A passing attempt after all lessons in a published course are completed issues one certificate per learner and course. The certificate includes the skills defined by the course; these are shown on the learner’s Skills Passport only after earning the certificate. Further passing attempts return the existing certificate rather than creating duplicate credentials. Attempts against unpublished or incomplete courses and incomplete or invalid answer sets are rejected.

The course progress GET response includes `completedLessons`, `nextLessonIndex`, and `resumeLessonIndex`. Save & exit stores the current lesson separately from completed lessons; returning to the course resumes at that position, and My Learning lists the enrolled course without treating the current lesson as completed.

### Courses

| Method | Path | Authorization | Notes |
|---|---|---|---|
| GET | `/api/courses` | Public | Lists available course records |
| POST | `/api/courses` | Trainer or admin | Creates an owned draft |
| PATCH | `/api/courses/:id` | Owner trainer or admin | Updates validated course fields |
| DELETE | `/api/courses/:id` | Owner trainer or admin | Deletes a course |
| POST | `/api/courses/:id/uploads` | Owner trainer or admin | Multipart `file` upload for PDF notes; `X-Upload-Kind: video` returns `410` |
| GET | `/api/courses/:id/files/:fileId` | Public for approved courses; otherwise owner trainer or admin | Downloads a PDF attached to the course |

Course drafts accept `title`, `category`, optional `language` (main lesson/assessment language, 2–60 characters; defaults to `English`), `description`, `objectives`, up to 12 optional `skills` (each 2–80 characters and case-insensitively unique), optional `coverImage`, `lessons`, optional `assessment`, `level`, and `status`. The handbook-inspired topic choices are shared by registration interests, trainer authoring, and Explore filters. The Explore screen uses the language label to filter published courses; the label does not translate course content. Trainers should aim for short, practical lessons of about five minutes. Course skills are copied to the learner’s certificate when they pass the assessment after completing all lessons. A lesson contains a `title`, `type` (`Video` or `Reading`), `duration`, and an optional uploaded `file` record. Video lessons accept MP4 and MOV uploads directly to a private Cloudflare R2 bucket; the backend verifies the completed object before saving metadata. Reading lessons accept PDF notes up to 25 MB stored using the existing API-local file path. See [CLOUDFLARE_R2_SETUP.md](./CLOUDFLARE_R2_SETUP.md) for backend environment configuration. Cover images are optional base64 JPG/PNG data URIs up to 3 MB; the JSON request limit is 4 MB.

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

Only MP4/MOV extensions with matching MIME types are accepted; the server additionally verifies the ISO-BMFF `ftyp` signature after upload. The default maximum is 2 GiB, multipart threshold 100 MiB, and part size 16 MiB. Configure limits with `R2_MAX_VIDEO_BYTES`, `R2_MULTIPART_THRESHOLD_BYTES`, and `R2_MULTIPART_PART_SIZE_BYTES`. R2 credentials are backend-only and presigned URLs are never stored. Learners can play only videos attached to lessons in approved courses where they have an enrollment record. The API currently uses the JSON file store; a Prisma schema and initial migration exist but have not been applied, and PostgreSQL/Neon persistence is not yet integrated.

Public registration roles are limited to `learner`, `employer`, and `trainer`; administrator accounts must be provisioned outside public registration. Employers retain learner access to opportunities, applications, assessments, and their own certificates. Learners can only view their own applications, employers can view their own applications and applications to their jobs, and administrators can view all applications. Trainers cannot access application records. Invalid input returns `400`, duplicate accounts return `409`, missing or expired authentication returns `401`, and forbidden roles return `403`.
