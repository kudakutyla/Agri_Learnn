# AgriLearn Implementation Plan

## Phase 1 — Foundation

1. Convert the Expo app from JavaScript to TypeScript.
2. Configure Expo Router.
3. Install and configure NativeWind for the installed Expo SDK.
4. Add application structure for routes, components, hooks, services, constants, and types.
5. Establish environment variable loading and API configuration.
6. Create the backend TypeScript/Express foundation.
7. Configure PostgreSQL/Neon and Prisma when database credentials are available.
8. Verify the Expo app, backend startup, lint, TypeScript, and tests.

Exit criteria:

- Mobile and backend run from documented commands.
- TypeScript checks pass.
- NativeWind styles render on Android, iOS, and web.
- Core routes and navigation compile.
- Environment requirements are documented.

## Phase 2 — Authentication and Roles

Implement registration, login, logout, refresh/session persistence, password recovery contract, profiles, protected routes, and backend role authorization.

Exit criteria:

- Learner, employer, trainer, and admin roles are enforced.
- Sensitive routes reject unauthenticated or unauthorized requests.
- Password and token handling use secure server-side rules.

## Phase 3 — Learner Experience

Implement the home dashboard, explore screen, categories, course catalogue, course detail, enrolment, learning content, My Learning, progress, notifications, and profile.

## Phase 4 — Assessments and Credentials

Implement assessments, server-calculated results, completion rules, certificate records, verification data, and Skills Passport views.

## Phase 5 — Employer Features

Implement employer profiles, jobs, applications, applicant management, learner discovery, and project/job invitation workflows with privacy controls.

## Phase 6 — Trainer Features

Implement trainer dashboard, course and lesson management, resources, assessments, submissions, and approval workflows.

## Phase 7 — Administration

Implement user and role management, content approvals, categories, reports, settings, and platform oversight.

## Phase 8 — Quality Assurance

Run unit, integration, API, navigation, permission, mobile layout, and build checks. Fix findings and update requirements/test results.

## Phase 9 — Deployment Preparation

Document and verify production environment variables, API URLs, database configuration, authentication settings, signing/build configuration, security checks, and deployment procedures without claiming deployment until it is executed.
