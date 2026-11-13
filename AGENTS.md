# AgriLearn Project Instructions

These are workspace-wide instructions for work in this repository. Read the relevant existing code and documentation before changing behavior. More specific instructions in nested `AGENTS.md` files apply to their directories; in particular, read [mobile/AGENTS.md](mobile/AGENTS.md) before changing the Expo application.

## Project Overview

AgriLearn is a mobile-first agricultural learning and opportunities platform. Its main user roles are:

- **Learner:** discover and enrol in approved courses, complete lessons and assessments, earn certificates and skills, and discover/apply to opportunities.
- **Employer:** maintain an account, publish opportunities, and participate in applicant/invitation workflows as supported by the current implementation.
- **Trainer:** create courses, lessons, resources, skills and assessments; submit courses for review; manage permitted lesson media.
- **Administrator:** review courses, manage platform oversight, inspect reports/users/videos, and perform only the administrative operations currently implemented.

**Terminology:** “Course” and “module” are interchangeable names for the same learning resource in this project; they are not separate entities. Use `course` as the canonical API, data-model, and backend term, while retaining “module” in existing user-facing labels or flows where appropriate. Do not create duplicate module entities or APIs.

The project is a monorepo with two independently managed npm packages:

- `mobile/` — Expo, React Native, TypeScript, Expo Router, and NativeWind.
- `server/` — Node.js, Express, TypeScript REST API and API tests.
- `docs/` — requirements, API, architecture/audits, implementation and deployment guidance, validation records, and project trackers.

Preserve native mobile behavior. Do not turn a React Native screen into a web-only implementation to match a visual reference.
When using supplied Figma materials in `docs/design-reference/` or `.design-import/`, translate their intent into native React Native patterns rather than copying web-only layout or components.

## Project Scope

### In scope

- The Expo mobile application and its learner, employer, trainer, and administrator experiences.
- Authentication, profile management, role-based and resource-ownership authorization, and password recovery.
- Course discovery, trainer course/lesson/resource/assessment authoring, administrator course review, learner enrolment and progress, assessments, certificates, and earned skills.
- Agricultural opportunities, applications, and invitation workflows as specified by the current requirements.
- API-backed administration, platform reporting, and course video management.
- Private Cloudflare R2 lesson-video upload, playback, and lifecycle management, with backend-only credentials.
- Backend persistence toward the documented PostgreSQL/Neon target, including an approved migration from the current JSON store.
- Automated and manual verification, accessibility/responsive behavior, project documentation, and deployment preparation described in `docs/`.

The source of truth for feature acceptance is [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md). Requirements marked **In progress** or **Not started** are known delivery gaps, not automatically out of scope. Check current code and [docs/TEST_RESULTS.md](docs/TEST_RESULTS.md) before describing implementation status.

### Out of scope unless explicitly requested

- Product features or role capabilities not present in the approved requirements or otherwise confirmed by the user.
- Replacing the native mobile application with a web-only product or introducing a duplicate app/API implementation.
- Destructive database migrations, deletion or reset of user data, production deployment, or changes to live cloud buckets/services without explicit approval.
- Embedding, exposing, or handling real credentials in source code, mobile configuration, documentation, generated files, or logs.
- Treating prototypes, sample content, or planned behavior as production functionality, or silently expanding the requested task into unrelated work.

## Architecture and Important Current State

### Mobile

- Expo Router screens live in `mobile/src/app/`; layouts live in `_layout.tsx`.
- Reusable UI is in `mobile/src/components/`; API and media integrations are in `mobile/src/services/`.
- The app uses NativeWind `className` styling alongside native React Native components and Expo modules.
- Route screens should orchestrate UI and services, not duplicate reusable business logic.
- The installed Expo major version is defined in `mobile/package.json`. Expo and React Native APIs change between SDK releases; follow [mobile/AGENTS.md](mobile/AGENTS.md) for versioned documentation checks, compatible dependencies, and native build guidance.

### Backend

- Express routes and middleware are primarily in `server/src/index.ts`; shared persistence and domain types are in `server/src/store.ts` and `server/src/types.ts`.
- Email/password-reset behavior is in `server/src/email.ts`; Cloudflare R2 integration is in `server/src/r2.ts`.
- The target production data layer is PostgreSQL/Neon, with Prisma where appropriate. The current data store is a local JSON file, not PostgreSQL/Neon; there is no relational schema or migration system yet. Treat JSON storage as a known gap, not the target architecture. Any database move requires an explicit design, safe migration plan, and approval before destructive data changes.
- PDF lesson resources use the API's local upload storage. Lesson videos use private Cloudflare R2 object storage; video metadata remains in the JSON data store.
- Use the existing API and service patterns. Search for current route/schema/test coverage before adding endpoints, storage, state, or parallel implementations.

### Authentication and roles

- Backend JWT authentication and role/ownership authorization are authoritative. A mobile route guard or hidden button is not a substitute for backend checks.
- Public registration supports `learner`, `employer`, and `trainer`; administrator accounts must be provisioned through the approved non-public process.
- Preserve ownership boundaries for courses, applications, invitations, files, and videos. Return only data the requesting role is allowed to see.
- Never return password hashes, secrets, R2 object keys, multipart upload IDs, or permanent storage URLs to clients.
- Password reset uses single-use, time-limited tokens and must not reveal whether an email address belongs to an account.

## Development Rules

1. Audit the relevant routes, services, tests, and docs before structural changes. Preserve working behavior and reuse existing helpers.
2. Keep TypeScript types explicit; validate untrusted API inputs with established validation patterns and surface errors clearly.
3. Implement real persisted behavior for production features. Do not replace API-backed functionality with fixed/sample data. Clearly identify any sample data that remains and do not represent it as user-specific persisted data.
4. Keep secrets and environment values out of source control. Use `.env.example` placeholders and server-side environment configuration; never put backend credentials in `EXPO_PUBLIC_*` variables, mobile code, generated documents, or logs.
5. Apply authorization on the backend, including both role checks and resource ownership checks where appropriate.
6. Do not run destructive database, file, bucket, or production operations without explicit approval.
7. Prefer the existing npm lockfiles and package scripts. Add dependencies only when required; mobile native dependencies must be Expo-compatible.
8. Avoid unrelated fixes and preserve unrelated worktree changes. Never revert changes you did not make.

## API and Storage Conventions

- The API uses the `/api` prefix and runs on port `4000` by default. Local mobile configuration uses `EXPO_PUBLIC_API_URL` for the API origin.
- Protected requests use `Authorization: Bearer <JWT>`. Keep token handling in the established mobile API/authentication services.
- Retain established HTTP semantics: `400` invalid input, `401` missing/invalid authentication, `403` forbidden role/ownership, `404` unavailable resource, `409` conflict, and explicit service errors such as `503` when required storage is unavailable.
- Course publishing and learner access follow the approval/enrolment workflow. Assessment scoring is server-side; correct answers must not be exposed in learner assessment responses. Certificates and earned skills follow the existing completion/pass rules.
- R2 credentials are backend-only. Keep the bucket private and use short-lived signed upload/playback URLs. Verify uploaded media before marking it ready. Never treat missing R2 configuration as a successful upload.
- Read [docs/API.md](docs/API.md) for endpoint contracts, [docs/CLOUDFLARE_R2_SETUP.md](docs/CLOUDFLARE_R2_SETUP.md) for storage configuration, and [docs/VIDEO_UPLOAD_TESTS.md](docs/VIDEO_UPLOAD_TESTS.md) for the real-R2 acceptance checklist.

## Testing and Verification

Run commands from the relevant package directory in PowerShell:

```powershell
Push-Location server
npm test
npm run build
Pop-Location
```

```powershell
Push-Location mobile
npm run typecheck
npm run lint
npx expo-doctor
Pop-Location
```

- Prefer the smallest test command that covers the change, then run broader checks when needed. Do not report a check as passed unless it was run and completed successfully.
- Backend tests use Node's test runner with `tsx`; add or update focused API tests for behavior, validation, authorization, and persistence changes.
- For UI or device-specific behavior, use the relevant browser/device/manual acceptance check as well as static checks. Backend tests do not prove live R2, production deployment, or native-device behavior.
- Record acceptance criteria and status in [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md). Update [docs/TEST_RESULTS.md](docs/TEST_RESULTS.md) with checks actually performed, observed results, and remaining blockers.
- Distinguish **Implemented** from **Verified**. Do not mark requirements Verified without the documented acceptance evidence.

## Documentation Map

Keep maintained project documentation under `docs/`:

- [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) — acceptance criteria and requirement statuses.
- [docs/TEST_RESULTS.md](docs/TEST_RESULTS.md) — dated validation evidence and known gaps.
- [docs/API.md](docs/API.md) — REST routes, payloads, roles, and behavior.
- [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) — project phases and exit criteria.
- [docs/PROJECT_AUDIT.md](docs/PROJECT_AUDIT.md) and [docs/ROLE_CAPABILITIES_AUDIT.md](docs/ROLE_CAPABILITIES_AUDIT.md) — architecture and role-gap audits; check their audit dates before relying on findings.
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — environment and deployment requirements.
- [docs/CLOUDFLARE_R2_SETUP.md](docs/CLOUDFLARE_R2_SETUP.md), [docs/VIDEO_STORAGE_ARCHITECTURE.md](docs/VIDEO_STORAGE_ARCHITECTURE.md), and [docs/VIDEO_UPLOAD_TESTS.md](docs/VIDEO_UPLOAD_TESTS.md) — private video storage and acceptance.
- [docs/PROJECT_TRACKER.html](docs/PROJECT_TRACKER.html) and its PDF — proposed 30-day sprint schedule; dates and owners must be agreed, not assumed.
- [docs/POSTMAN_API_TEST_CASES.html](docs/POSTMAN_API_TEST_CASES.html) and its PDF — manual Postman test guidance.

When creating or updating the project tracker, follow the user's supplied compact schedule format: project/status summary, sprint overview with sprint statuses, and a concise day-by-day tracker with sprint, task/deliverable, area, priority, and status columns (no Notes column). Use only **Completed**, **In Progress**, and **Not Started** for task and sprint statuses. Tasks awaiting prerequisites that have not begun are **Not Started**. Repeat table headers across pages and keep the PDF concise. Base statuses on current requirements and recorded evidence; label proposed dates/owners as TBD instead of inventing them.

When documentation conflicts, prefer current code and recent recorded test evidence for actual behavior, and use the requirements document for intended acceptance criteria. Flag contradictions rather than silently presenting planned or stale behavior as implemented.
