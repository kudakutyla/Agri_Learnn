# AgriLearn Requirements and Test Checklist

Use this document to validate AgriLearn during development and acceptance testing. Requirement statuses are `Not started`, `In progress`, `Implemented`, and `Verified`.

## Release Scope

### Mobile Foundation

| ID | Requirement | Test/Acceptance Criteria | Status |
|---|---|---|---|
| MOB-001 | The mobile app runs with `npx expo start` in `mobile/`. | Metro starts without configuration errors and the app loads in Expo Go or a development build. | Verified |
| MOB-002 | The application uses Expo and React Native TypeScript. | Project uses a TypeScript entry/component structure and `tsc --noEmit` succeeds. | Verified |
| MOB-003 | NativeWind is configured for the installed Expo SDK. | NativeWind utilities render through `className` on supported platforms. | Implemented |
| MOB-004 | Expo Router provides application navigation. | Routes render under `src/app/`, navigation history works, and protected routes redirect correctly. | Implemented |
| MOB-005 | The mobile interface follows the supplied design visually. | Welcome, onboarding, authentication, learner, employer, trainer, and admin flows use agreed AgriLearn colours, typography, spacing, and native components. | In progress |
| MOB-006 | Core screens are responsive. | The primary screens have no overlap or clipped controls at tested phone sizes and orientations. | Implemented |
| MOB-007 | Home and Profile provide their distinct screenshot-referenced layouts. | Home renders the learner dashboard with recommended courses that auto-advance and can be changed by swipe, arrows, or course indicators; its Skills Passport summary uses the same authenticated credential and earned-skill data as the Passport page; Home has a bell notification button and persistent light/dark theme toggle; Profile lets users edit registration name, email, mobile number, province, category, primary interest, and password while preserving server-controlled roles; account navigation/actions and sign-out work, and the selected bottom-navigation tab matches the active route. | Verified |
| MOB-008 | Explore follows the supplied course-discovery layout. | Explore shows a searchable course catalogue of sample and API-published courses, selectable topic chips, a featured course, a popular-course list, clear loading/error states, and a working sort control. | Verified |
| MOB-009 | Selecting a course in Explore opens its module information. | Featured, sample, and API-published course cards open details with accurate descriptions, skills, learning outcomes, lesson list, and course metadata. | Verified |
| MOB-010 | The course information action opens course learning content. | Selecting “Enrol for free” on an approved course records an authenticated, idempotent learner enrolment and opens that course’s lessons; uploaded lesson videos can be played, and unavailable videos are identified clearly. | Verified |
| MOB-011 | My Learning follows the supplied course-progress layout. | Screen shows In progress, Completed, and Saved tabs; summary metrics; course cover cards with status, next lesson, course skills, progress, and a Continue action; and an accessible shortcut to agricultural opportunities. Empty tabs show a clear message and Explore action. | Verified |
| MOB-012 | Skills Passport follows the supplied credential layout. | Passport shows learner identity, credential-derived summary metrics, Skills/Credentials/History tabs, and truthful empty states when records are absent. | Implemented |
| MOB-013 | Course content opens a focused lesson page. | Lesson view follows the supplied design with progress, lesson number/title/duration, video or unavailable-media state, lesson information, reminder, and functioning Previous/Next navigation. | Implemented |
| MOB-014 | Completing the final lesson leads to a test notice. | Final lesson completion is persisted, then a course-specific notice shows assessment expectations and Start test opens the real quiz. When quiz questions are not configured, the limitation is explained instead of launching a fake test. | Verified |
| MOB-015 | Learners can access lesson PDF notes. | Approved course reading lessons show an Open PDF notes action; the course-file endpoint returns the PDF inline for the browser/device viewer and continues to enforce course publication and lesson-file checks. | Verified |
| MOB-016 | Learners can download course videos for offline access. | Uploaded course videos can be saved to persistent device storage, downloaded status is shown, and saved videos play locally after reopening course content without a network connection. | In progress |

### Authentication

| ID | Requirement | Test/Acceptance Criteria | Status |
|---|---|---|---|
| AUTH-001 | Users can register with valid details. | Registration creates one persistent user and reports duplicate/invalid input clearly. | Implemented |
| AUTH-002 | Users can log in with valid credentials. | Valid credentials return an authenticated session; learners and employers land on Home, trainers on their course dashboard, and admins on the admin overview. | Implemented |
| AUTH-003 | Invalid credentials are rejected. | Invalid login does not create a session and displays a safe error. | Implemented |
| AUTH-004 | Users can log out. | Logout removes locally stored authentication state and protected API access, then returns users to the landing page. | Implemented |
| AUTH-005 | Authentication persists across app restarts. | A valid active session restores the correct authenticated state until expiry/logout. | Implemented |
| AUTH-006 | Users can reset forgotten passwords by email. | Recovery sends a single-use, one-hour reset link without revealing whether an email is registered; the reset form requires matching new passwords, and the new password is accepted at login. | Implemented |
| AUTH-007 | Backend role authorization is enforced. | An authenticated user cannot call endpoints permitted only to another role. | Verified |
| AUTH-008 | Protected screens recover cleanly when no valid session exists. | A protected API 401 clears saved session data, redirects to login, and explains that sign-in is required; expired sessions show a distinct message. | Implemented |

### Learner Experience

| ID | Requirement | Test/Acceptance Criteria | Status |
|---|---|---|---|
| LRN-001 | Learner dashboard displays persisted course and progress data. | Dashboard values match backend records for the signed-in learner. | In progress |
| LRN-002 | Users can browse and search courses/categories. | Explore includes approved courses from the API; search includes course title, category, level, description, and skills; category filters and empty/error/loading states work. | Verified |
| LRN-003 | Users can view course details. | API-published course information, skills, lessons, requirements, and metadata match the approved course record. | Verified |
| LRN-004 | Users can enrol in a course. | An authenticated learner can enrol in an approved course from its details page; the server creates one progress/enrolment record and prevents duplicate enrolment. Draft courses and unauthorized roles are rejected. | Verified |
| LRN-005 | Learners can complete lessons. | Completing approved lessons records learner-specific progress in order; unavailable/unpublished lessons cannot be marked complete. | Verified |
| LRN-006 | My Learning shows current and completed courses. | In-progress courses reflect the signed-in learner’s persisted enrolment and lesson progress; the Completed tab uses issued certificates, including course title and earned skills. Certificate loading and error states are explicit. | In progress |
| LRN-007 | Course progress is calculated server-side or from persisted lesson state. | Lesson completion is persisted per learner/course, and assessment access checks that every lesson is complete. | Verified |
| LRN-008 | Learners can discover and apply to agricultural opportunities. | The Opportunities screen lists published open roles from the API, supports search and refresh, exposes clear loading/error/empty states, and submits each learner’s application once with visible confirmation. | Verified |

### Assessments and Credentials

| ID | Requirement | Test/Acceptance Criteria | Status |
|---|---|---|---|
| ASM-001 | Learners can submit assessments. | After completing all published course lessons, learners can retrieve questions without correct answers, submit one choice per question, and see a persisted attempt associated with their account. | Verified |
| ASM-002 | Assessment results are calculated correctly. | Server scoring matches authored correct choices and passing score; incomplete or out-of-range answers are rejected. | Verified |
| ASM-003 | Certificate eligibility follows completion rules. | Only learners with every lesson completed can attempt the published course assessment; passing issues one certificate per learner/course, while failing or unpublished-course attempts do not. | Verified |
| ASM-004 | Certificates contain verifiable learner/course records. | Certificate screen/API returns the correct learner, course, issue date, and unique identifier. | Verified |
| ASM-005 | Skills Passport displays earned credentials and course skills. | Skills from a course appear in the authenticated learner’s Passport only after a passing assessment issues their certificate; incomplete courses award no skills. | Verified |

### Employer Experience

| ID | Requirement | Test/Acceptance Criteria | Status |
|---|---|---|---|
| EMP-001 | Employers can maintain a business profile. | Profile updates persist and appear only to permitted audiences. | Not started |
| EMP-002 | Employers can publish opportunities. | Valid jobs/projects and optional required skills are persisted; required skills are shown to applicants before applying; invalid fields are rejected. | In progress |
| EMP-003 | Applications are processed. | Applications are associated with the correct applicant/opportunity and states update correctly. | In progress |
| EMP-004 | Invitations can be sent and managed. | Invitations support pending/accepted/declined states and prevent duplicate active invitations. | Not started |
| EMP-005 | Learner discovery respects privacy controls. | Private learners do not appear in employer discovery or receive unwanted invitations. | Not started |

### Trainer Experience

| ID | Requirement | Test/Acceptance Criteria | Status |
|---|---|---|---|
| TRN-001 | Trainers can create and edit courses. | Authorized trainers can manage their own drafts and rejected courses, cannot edit another trainer’s work, and cannot change submitted content while it is under review. | Verified |
| TRN-002 | Trainers can manage lessons and resources. | Lesson/resource changes persist and are included in saved course content and are restored when an editable course is reopened. | Verified |
| TRN-003 | Trainers can create assessments. | Multiple-choice questions, unique answer choices, correct answers, and passing score are validated and stored separately from public course details. | Verified |
| TRN-004 | Submitted content follows approval workflow. | Trainers submit complete drafts, submitted content is locked until review, trainers cannot self-approve, and administrators can approve submissions. | Verified |
| TRN-005 | Trainers create modules through the ZIP four-step flow. | Create opens module details; valid details, optional cover image, lessons/resources, authored assessment questions, draft saving, preview, and submission status are handled in sequence and saved to the API. | Verified |
| TRN-006 | Trainers can browse their content. | The content tab lists only the signed-in trainer's saved modules; filters include all, drafts, in-review, and published, while returned courses remain accessible in All for editing. | Verified |
| TRN-007 | Trainers can attach lesson videos and PDF notes. | Video lessons accept MP4, MOV, M4V, or WebM files up to 200 MB; reading lessons accept PDFs up to 25 MB; authorized uploads persist and can be retrieved by the course owner or for approved courses. | Verified |
| TRN-008 | Trainers can specify skills learners gain from a course. | Course authoring lets trainers add and remove up to 12 unique skills; the list persists with drafts and published courses and is awarded to learners only upon passing completion. | Verified |

### Administration

| ID | Requirement | Test/Acceptance Criteria | Status |
|---|---|---|---|
| ADM-001 | Administrators can manage users and roles. | Authorized admins can perform role changes while protected roles/account rules remain enforced. | Not started |
| ADM-002 | Administrators can review and approve submitted content. | Selecting a course opens a dedicated review page with course details, assessment, review history, and uploaded lesson files; administrators can play uploaded videos and preview PDFs before review. Approval publishes the course and returns to Reviewed; returning requires trainer feedback, and each decision records reviewer, outcome, note, and timestamp. | Implemented |
| ADM-003 | Categories can be managed without duplicate slugs. | Create/edit operations validate names and enforce unique identifiers. | Not started |
| ADM-004 | Platform reports use persisted data. | Admin reports calculate 30-day unique active learners, seven daily activity counts, average lesson completion across persisted enrolments, issued certificates, and open opportunities from stored records; no-data metrics are explicit and non-admin access is forbidden. | Implemented |
| ADM-005 | Administrators see a platform overview. | The admin dashboard loads persisted learner, published module, certificate, employer, and pending approval counts, six months of learner registrations, and recent platform activity; the pending approvals card opens the Pending approvals tab; non-admin access is forbidden. | Implemented |
| ADM-006 | Administrators can browse registered users. | Admin-only user directory supports search by name, email, ID, category, interest, or province and filters by learner, trainer, employer, or administrator; password hashes are never returned. | Implemented |
| ADM-007 | Administrators manage their account settings. | Settings show the authenticated administrator profile, allow editing account details, explain unavailable notification/language features without implying they are enabled, do not allow client-side role switching, and support confirmed sign-out. | Implemented |

### Backend, Security, and Quality

| ID | Requirement | Test/Acceptance Criteria | Status |
|---|---|---|---|
| API-001 | Backend exposes documented REST APIs. | Routes are grouped by resource and documented under `docs/`; successful and error responses are consistent. | Implemented |
| API-002 | API input is validated. | Invalid JSON, missing fields, wrong types, and oversized values receive safe 4xx responses. | Implemented |
| API-003 | Authentication tokens are validated. | Expired, malformed, revoked, and missing tokens receive appropriate responses. | Implemented |
| API-004 | Passwords are stored using secure hashing. | Database does not contain plain-text passwords and password verification succeeds. | Implemented |
| API-005 | Secrets are not committed. | No credentials, private keys, or production database URLs exist in source control. | Implemented |
| API-006 | Database relationships and migrations preserve integrity. | Prisma schema and migrations describe required relations; constrained operations do not produce orphan records. | Not started |
| API-007 | File handling validates type and size. | Uploaded files are size/type restricted and stored under controlled paths or object storage. | Verified |
| QUA-001 | Automated checks pass. | Mobile lint/typecheck and relevant backend tests pass. | Verified |
| QUA-002 | The app starts without runtime configuration errors. | Expo and backend can start with documented local environment values. | Verified |
| QUA-003 | Errors are handled visibly and logged safely. | User-facing errors do not expose stack traces or secrets; server errors are logged. | Not started |

### Cloud Video Storage

| ID | Requirement | Test/Acceptance Criteria | Status |
|---|---|---|---|
| VID-001 | Authorized trainers upload MP4/MOV lesson videos to private Cloudflare R2. | Backend checks role, ownership, extension, MIME, size, and MP4/MOV container signature; bytes upload directly to R2 using short-lived signed URLs. | Implemented |
| VID-002 | Large video uploads use multipart transfer with progress. | Files at or above the configured threshold use signed part uploads, part completion verification, and visible mobile progress; upload failures do not mark a video ready. | Implemented |
| VID-003 | Video metadata persists separately from the video binary. | JSON metadata stores a generated object key, course/lesson association, uploader, MIME type, size, optional duration, status, and timestamps; no permanent signed URL or binary is stored. The current JSON-database limitation is documented. | Implemented |
| VID-004 | Learners play only videos for lessons they may access. | Fresh five-minute signed playback URLs are issued only for videos still attached to lessons in approved courses; learners must be enrolled. Missing/deleted objects and unauthorized access are reported safely. | Implemented |
| VID-005 | Trainers and administrators manage lesson videos. | Trainers list, preview, replace, and delete permitted course videos; administrators list status and association and can remove/clean up records. | Implemented |
| VID-006 | Mobile playback supports native controls and resume. | Expo Video provides native play/pause and seeking, visible loading/buffering and playback errors, duration when present, and the next incomplete lesson is loaded from saved progress. | Implemented |
| VID-007 | Real R2 integration is verified with development credentials. | Complete a real single PUT, multipart transfer, authorized preview/learner streaming, replacement, deletion, and unauthorized access test on configured R2 and supported mobile devices. | Not started |

## Manual Validation Procedure

1. Set up the documented mobile and backend environment.
2. Run mobile lint, TypeScript checks, Expo Doctor, backend tests, and migrations.
3. Exercise each requirement in order from the relevant role account.
4. Record evidence in `docs/TEST_RESULTS.md`.
5. Test Android and iOS layouts when available; at minimum cover the tested phone size.
6. Test authorization with accounts that are unauthenticated, wrong-role, or resource-owner/non-owner.
7. Mark a requirement `Verified` only after automated/API/manual evidence exists.
