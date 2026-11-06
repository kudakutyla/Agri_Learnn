# AgriLearn Project Audit

**Audit date:** 2026-11-06  
**Scope:** Current mobile application, backend, documentation, and role capabilities

## Executive Summary

The project has progressed beyond its initial scaffold. The mobile app uses Expo Router, React Native, TypeScript, and NativeWind. The Express/TypeScript backend implements authentication, profile updates, trainer course authoring and uploads, basic job applications, invitations, assessments, and certificate listing. Backend tests and mobile lint/type checks pass.

However, the four role experiences are not complete end-to-end. Learner enrolment, API-backed course discovery and learning lists, employer operations, and a functional administrator workspace remain major gaps. Lesson completion, assessment, certificate issuance, and awarding course skills on the Skills Passport are wired into the learner course flow. The backend uses a local JSON file store rather than PostgreSQL/Neon. See the [Role Capabilities Audit](./ROLE_CAPABILITIES_AUDIT.md) for role-by-role findings and implementation priorities.

## Repository Structure

| Location | Current state |
|---|---|
| `mobile/` | Expo Router, TypeScript, NativeWind screens and API client; some learner screens still use sample data |
| `server/` | Express/TypeScript API with a JSON file store and workflow tests |
| `docs/` | Requirements, test results, API/deployment notes, audit, implementation plan, and Figma design reference |
| Root `AGENTS.md` | Project-specific development instructions |
| Root `agents.md.txt` | Legacy placeholder; not project instructions |

## Mobile Application

### Working

- Expo Router routes under `mobile/src/app/`, TypeScript, and NativeWind are configured.
- Authentication and profile flows use the API.
- Trainer content authoring, uploads, and review submission are implemented.
- Opportunities browsing/application has a connected API workflow.

### Missing or incomplete

- API-backed learner course discovery, enrolment, and learning lists. Lesson completion, assessment participation, and certificate issuance are implemented for the lesson-to-test path but are not yet reflected in My Learning.
- Employer management/discovery screens and complete vacancy/application workflows.
- Functional administrator screens for user/role management, course review, categories, and reports.
- PostgreSQL/Neon persistence and relational migrations.
- Automated mobile workflow tests.

## Backend

The Express/TypeScript backend and API routes are present. It uses a JSON file store in `server/data/agrilearn.json`; no PostgreSQL/Neon schema or migrations are present. Thirteen backend tests currently cover selected authentication/profile, role, opportunity, trainer workflow, and upload behaviors.

## Database

No database configuration or schema exists. PostgreSQL/Neon cannot yet be verified.

## Supplied Design Reference

The archive contains a React 19/Vite/Tailwind web prototype with representative flows for:

- Welcome, onboarding, login, registration, and category selection.
- Learner home and course discovery.
- Course details, enrolment, learning, assessments, results, and certificates.
- Skills Passport.
- Profile and notifications.
- Employer, trainer, and administrator role experiences.

The prototype contains interactive role demos, but those interactions must not be treated as backend functionality. Web-specific components and layout CSS must be translated to native React Native and Expo Router patterns.

## Risk and Blocker Register

| Item | Status | Impact |
|---|---|---|
| Root project instructions missing initially | Resolved by creating root `AGENTS.md` | Prevented consistent project governance |
| Learner course lifecycle incomplete | Blocker for learning outcomes | No enrolment, persisted lesson progress, learner assessment flow, or certificate issuance |
| Employer workflow incomplete | Blocker for employer outcomes | Job management, application decisions, candidate discovery, and invitation screens are missing |
| Admin workspace incomplete | Blocker for platform operations | Admin screen is static; review queue and account/category/report operations are absent |
| JSON file persistence | Production blocker | PostgreSQL/Neon persistence, relational integrity, and migrations are not implemented |
| Mobile automated workflow tests absent | Quality gap | Type checking/linting pass but do not verify navigation and end-to-end role flows |

## Next Phase

Prioritize an in-app administrator review queue to unblock publication of trainer content, then complete the API-backed learner course lifecycle. Follow with employer operations and the remaining administration features. The detailed sequence and acceptance gaps are recorded in [ROLE_CAPABILITIES_AUDIT.md](./ROLE_CAPABILITIES_AUDIT.md).
