# AgriLearn Project Instructions

## Required Stack

- Mobile: React Native, Expo, TypeScript, NativeWind, and Expo Router.
- Backend: Node.js, Express, TypeScript, PostgreSQL or Neon, Prisma when appropriate, and JWT.
- Documentation: keep architecture, API, audit, implementation, requirements, and deployment information under `docs/`.

## Development Rules

1. Audit the existing project before making structural changes.
2. Preserve working functionality and do not create duplicate implementations.
3. Use Expo packages and Expo-compatible dependency versions.
4. Keep reusable code outside route files.
5. Implement real backend functionality; do not replace production features with fake data.
6. Keep authentication secrets and environment values out of source control.
7. Enforce role-based authorization on the backend.
8. Do not perform destructive database operations without approval.
9. Run linting, type checking, tests, and Expo Doctor before declaring a phase complete.
10. Update documentation after implementation changes and report incomplete work honestly.

## Mobile Structure

- Use `src/app/` for Expo Router screens.
- Keep components, hooks, services, constants, and utilities outside route files.
- Use NativeWind `className` styling as the primary mobile styling approach.
- Translate the supplied Figma Make design to native React Native patterns; do not recreate it as a web layout.

## Testing Requirements

Record acceptance criteria in `docs/REQUIREMENTS.md`. Verify each implemented requirement by code inspection and a relevant automated, API, or manual test. Update `docs/TEST_RESULTS.md` as validation is performed.
