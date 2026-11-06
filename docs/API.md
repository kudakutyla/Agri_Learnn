# AgriLearn API

The API runs on port `4000` by default.

## Public endpoints

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/health` | - | Service health |
| POST | `/api/auth/register` | `name`, `email`, `password`, optional `role` | Public user and JWT |
| POST | `/api/auth/login` | `email`, `password` | Public user and JWT |

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
| POST | `/api/courses/:id/uploads` | Owner trainer or admin | Multipart `file` upload; set `X-Upload-Kind` to `video` or `pdf` |
| GET | `/api/courses/:id/files/:fileId` | Public for approved courses; otherwise owner trainer or admin | Downloads a file attached to the course |

Course drafts accept `title`, `category`, `description`, `objectives`, up to 12 optional `skills` (each 2–80 characters and case-insensitively unique), optional `coverImage`, `lessons`, optional `assessment`, `level`, and `status`. Course skills are copied to the learner’s certificate when they pass the assessment after completing all lessons. A lesson contains a `title`, `type` (`Video` or `Reading`), `duration`, and an optional uploaded `file` record. Video lessons accept MP4, MOV, M4V, or WebM files up to 200 MB; reading lessons accept PDF notes up to 25 MB. Uploads are stored on the API server's local disk under `data/uploads` (or `UPLOADS_DIR`) and are removed when the course is deleted. Cover images are optional base64 JPG/PNG data URIs up to 3 MB; the JSON request limit is 4 MB.

Public registration roles are limited to `learner`, `employer`, and `trainer`; administrator accounts must be provisioned outside public registration. Employers retain learner access to opportunities, applications, assessments, and their own certificates. Learners can only view their own applications, employers can view their own applications and applications to their jobs, and administrators can view all applications. Trainers cannot access application records. Invalid input returns `400`, duplicate accounts return `409`, missing or expired authentication returns `401`, and forbidden roles return `403`.
