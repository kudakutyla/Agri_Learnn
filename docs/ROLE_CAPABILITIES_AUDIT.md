# AgriLearn Role Capabilities Audit

**Audit date:** 2026-11-06  
**Scope:** Compare the supplied Learner, Agricultural SMME / Employer, Content Author / Trainer, and Administrator responsibilities with the mobile app, backend routes, persistence model, tests, and current documentation.

## Executive Summary

AgriLearn has a working Expo/React Native TypeScript foundation, authentication and profile APIs, an API-backed published course discovery and learner enrollment/completion/certificate flow, a trainer course-authoring workflow, and a learner-facing opportunities/application flow. These are meaningful foundations, but the four role descriptions are not yet implemented end-to-end.

The largest gaps are learner-specific in-progress course lists and progress metrics, employer-facing management/discovery screens, and an administrator workspace that can perform the actions represented by its labels. Lesson completion, assessment, certificate issuance, and earned course skills are implemented for the lesson-to-certificate path. The backend currently persists JSON files rather than using the required PostgreSQL/Neon database. Passing builds and tests establish that existing code works; they do not establish completion of these missing workflows.

## Role-by-Role Findings

### 1. Learner — Partial

**Present**

- Registration and profile updates use the backend. Public registration supports learner, employer, and trainer roles; administrator registration is blocked.
- The Opportunities screen reads open jobs from the API, supports search and refresh, submits applications, and displays application errors. Browser testing verified an application from the signed-in learner app; backend tests verify duplicate prevention and role-scoped application reads. See [opportunities.tsx](../mobile/src/app/opportunities.tsx), [api.ts](../mobile/src/services/api.ts), and [opportunities.test.ts](../server/test/opportunities.test.ts).
- Explore combines its sample catalogue with published API courses. Learners can open an approved course, enrol through its details page, complete lessons, take the assessment, and earn a certificate through the normal app routes.
- My Learning displays issued certificates and awarded skills in Completed.
- The Skills Passport reads certificate records from the API and presents credentials and course skills when records exist. Course skills appear only on a learner's earned certificate. See [passport.tsx](../mobile/src/app/passport.tsx).
- Learners can retrieve published-course assessment questions without answer keys and submit answers for server-side scoring. Attempts require all lessons to have been marked complete.
- A passing assessment after all lesson completions issues one certificate per learner/course, including skills defined by the trainer; the credential and its earned skills appear in the Skills Passport and My Learning Completed tab.

**Gaps**

- In-progress courses and progress metrics in My Learning still use fixed sample data in [data.ts](../mobile/src/data.ts), rather than the signed-in learner's enrolled courses and server progress.
- Invitation response exists as an API operation, but learners have no invitation list or accept/decline interface.
- There is no learner-controlled permission or consent workflow for sharing profile skills or credentials.

### 2. Agricultural SMME / Employer — Partial, mostly backend-only

**Present**

- Employers can register and update the general account profile.
- Backend tests verify employers can create open jobs, retrieve applications related to their own jobs, and submit applications as applicants; learners can apply to published jobs. Job skills are persisted and displayed before the application action. See [index.ts](../server/src/index.ts), [roles.test.ts](../server/test/roles.test.ts), and [opportunities.test.ts](../server/test/opportunities.test.ts).

**Gaps**

- There is no business-profile model or business-profile screen.
- No employer workspace is connected to the app. Employers have no UI to create, edit, publish, close, or manage vacancies.
- Employers can read applications through the API but cannot change application status, shortlist candidates, or accept/reject applications; these actions also lack backend routes.
- No candidate discovery or permission-aware viewing of learner skills/certificates exists.
- Invitation records have no listing endpoint or employer/learner management screens. The API does not enforce a learner sharing preference before an invitation is sent; invitation workflows lack test coverage.
- The app routes employers to the general learner dashboard, whose course and progress data are sample data rather than persisted learner data.

### 3. Content Author / Trainer — Substantial authoring foundation; learner analytics missing

**Present**

- Trainers can create and edit owned course drafts, add lessons and resources, author assessments, submit content for review, and view their content/statuses.
- Video and PDF uploads are supported with file type and size checks. Server tests cover trainer ownership, assessment validation, submission, and file handling. See [create-module.tsx](../mobile/src/app/create-module.tsx), [content.tsx](../mobile/src/app/content.tsx), [trainer-workflow.test.ts](../server/test/trainer-workflow.test.ts), and [uploads.test.ts](../server/test/uploads.test.ts).
- Browser testing verified the trainer app can create a course with skills, lesson, and assessment and submit it to review; it appears under My Content as Under Review.

**Gaps**

- Learner progress and assessment attempts are not available as trainer analytics. The trainer dashboard explicitly says analytics will appear once activity tracking exists.
- There is no learner monitoring authorization/consent workflow.

### 4. Administrator — Dashboard overview; management workflows incomplete

**Present**

- Administrator accounts cannot be created through public registration.
- The backend exposes a user-directory endpoint and permits administrators to change course status through the course update route. Admin role authorization and course review behavior have test coverage. See [index.ts](../server/src/index.ts) and [roles.test.ts](../server/test/roles.test.ts).
- Administrators can create categories, with duplicate slugs rejected.
- The admin dashboard displays persisted learner, published module, certificate, employer, and pending approval counts, six months of learner registrations, and recent activity. Its summary endpoint is restricted to administrators; admin login routes to the dashboard. See [admin.tsx](../mobile/src/app/admin.tsx) and [admin-overview.test.ts](../server/test/admin-overview.test.ts).
- The Users screen retrieves the protected user directory, supports name/email/ID/profile search and role filters, and shows registered profile information without implying untracked account statuses. See [admin-users.tsx](../mobile/src/app/admin-users.tsx) and [AdminBottomNav.tsx](../mobile/src/components/AdminBottomNav.tsx).
- Administrators can review submitted courses in the app, inspect lessons, skills, assessment questions and answers, approve courses, or return them with feedback. Decisions persist an admin, timestamp, outcome, and note in review history. See [admin-approvals.tsx](../mobile/src/app/admin-approvals.tsx), [index.ts](../server/src/index.ts), and [admin-approvals.test.ts](../server/test/admin-approvals.test.ts).
- The Reports screen presents persisted 30-day active learners, seven daily activity counts, average lesson completion across enrolments, issued certificates, and open opportunities through an admin-only API. See [admin-reports.tsx](../mobile/src/app/admin-reports.tsx) and [admin-reports.test.ts](../server/test/admin-reports.test.ts).
- The Settings screen loads the authenticated admin profile, links to profile editing, provides confirmed sign-out, and explains settings that are not supported. Client-side role switching is intentionally not offered. See [admin-settings.tsx](../mobile/src/app/admin-settings.tsx).
- Trainers can retrieve their own courses with return feedback for revisions; review notes remain in review records and are not exposed through the public course list.

**Gaps**

- Notification preferences, alternate languages, and administrator role switching are not implemented.
- Administrators cannot update user roles or manage accounts beyond reading the user directory.
- The legacy general course update route remains available to administrators; the review queue uses the dedicated endpoint that persists a review record and feedback.
- Category create/list APIs exist, but there are no update/delete operations or category-management screens.
- No issue-report workflow or broader platform-record management exists; report metrics are limited to currently available user, progress, attempt, certificate, course, and job records.
- Login sends administrators to the trainer course dashboard rather than to the admin screen.

## Cross-Cutting Gaps

1. **Persistence:** [store.ts](../server/src/store.ts) reads and writes a local JSON file. PostgreSQL/Neon and Prisma are not implemented, so relational integrity and production database behavior are not verified.
2. **Course publication visibility:** Explore requests only approved courses from the API and merges them with the sample course catalogue. Trainers and administrators continue to use the unfiltered course list for management.
3. **Role-specific navigation:** Learner, employer, trainer, and administrator capabilities do not yet map to complete, distinct workspaces. The admin has Dashboard, Users, Approvals, Reports, and Settings screens; role management, categories, and settings such as notifications still need implementation.
4. **Documentation drift:** Existing requirement status labels should be reconciled with this audit as implementation proceeds; current status labels do not consistently reflect the wired role workflows.
5. **Automated UI coverage:** Backend workflow tests exist, but the project has no mobile route/workflow test suite identified in this audit. Manual browser checks in prior test notes do not cover the missing role workflows.

## Recommended Implementation Order

1. **Complete course review governance:** Restrict course-status changes to the dedicated review workflow and add immutable audit protections before production deployment.
2. **Complete the learner learning record:** Replace sample catalogue data with approved API courses; add enrolment, persisted lesson completion/progress, learner assessment retrieval/submission, server-side eligibility checks, and certificate issuance. Add explicit learner controls for sharing credentials.
3. **Build employer operations:** Add business profiles, job lifecycle management, application review/status actions, candidate discovery governed by learner consent, and complete invitation listing/response flows.
4. **Complete platform administration:** Add user/role management, category editing, reports, issue handling, and auditable content decisions.
5. **Move persistence to PostgreSQL/Neon:** Define relational constraints/migrations for users, courses, enrolments, progress, assessments, attempts, credentials, jobs, applications, invitations, sharing permissions, and review history before relying on these workflows in production.

## Validation Performed

- Backend: 14 tests passed; TypeScript build passed.
- Mobile: TypeScript check and lint passed; Expo web export passed; Expo Doctor passed 20/20 checks.
- Browser: learner registration, published course discovery, course details, enrollment, lesson completion, assessment pass, certificate, Skills Passport, Completed course card, and job application were exercised through app routes. Trainer registration, module creation with skill/lesson/assessment, submission, and My Content review status were exercised.
- Browser: the Admin route displayed its four section labels but zero interactive buttons; employer vacancy management and learner invitation/consent flows are unavailable in the app.
- These checks validate implemented workflows, not requirements without app surfaces, production database readiness, Android/iOS device behavior, video upload/native playback, or every profile/password/theme setting.
