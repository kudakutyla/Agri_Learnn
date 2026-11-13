# PostgreSQL / Neon Migration

## Status

The Prisma 6 schema, generated initial migration, and Prisma Client are in progress and have been validated locally. The API still reads and writes `server/data/agrilearn.json`; Prisma is not yet wired into request handling. No connection to the configured database, schema deployment, or data import has been performed.

The configured `DATABASE_URL` is supplied by the local `server/.env`. Keep that file private. Do not copy its value into documentation, logs, screenshots, shell history, or source control.

## Compatibility and inventory

- Prisma models cover users, courses, jobs, applications, invitations, categories, assessments, attempts, progress, certificates, reviews, password resets, and video metadata.
- Course/module is one entity; `Course` is the canonical model.
- Flexible lesson, assessment, answer, and file content remains JSONB. Skills remain PostgreSQL text arrays. Course progress has a separate nullable `lastLessonIndex` so a saved resume position is not confused with completed lessons.
- Courses include a primary content-language field defaulting to English; the additive migration preserves existing course rows.
- Prisma job enum values map to the API's `Full-time` and `Part-time` strings.
- Video file sizes use PostgreSQL `BIGINT`; API serialization must convert these values to JSON-safe numbers.
- Categories on courses and user profiles remain free text to preserve current data; category normalization is a separate follow-up.
- A local, read-only inventory of the current JSON snapshot found 24 users, 10 courses, 1 job, 3 applications, 4 assessments, 3 attempts, 2 progress records, 2 certificates, and 1 review. It found no malformed UUIDs, checked orphan references, normalized duplicate emails, or collisions for the modeled unique record pairs. This is a snapshot only; rerun preflight against the exact source immediately before any import.

## Non-destructive rollout sequence

1. Confirm with the project owner that the target database is an isolated development database and explicitly authorize changes to it. Never infer that a configured URL is safe to modify.
2. Take a database backup/snapshot and a separate, access-controlled copy of the JSON source. Record the source file hash, per-collection counts, and timestamp without exposing personal data.
3. Generate and review the schema/migration locally:

   ```powershell
   cd server
   npm run db:validate
   npm run db:generate
   npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
   ```

4. On the approved empty development database only, apply the reviewed initial schema with `npx prisma migrate deploy`. Do not use `db push` as a production migration strategy.
5. Implement an explicit JSON import that preserves IDs, hashes, timestamps, enum values, JSON structures, and nullable fields. Use bounded transactions and deterministic upserts. Convert `BigInt` video sizes safely at API boundaries.
6. Preflight every relation and uniqueness rule, including case-normalized emails, job/user applications, user/course progress, assessment/course ownership, certificates, and course reviews. Stop and report conflicts; do not silently discard or rewrite records.
7. Compare per-table record counts and stable, privacy-safe checksums after import. Verify foreign-key integrity and representative API workflows against the imported database.
8. Keep the JSON source unchanged and available for rollback until all acceptance checks pass. Roll back by restoring the database snapshot and switching the application back to the JSON store; do not delete the source during cutover.
9. After development acceptance, review a separate production plan, backup/restore test, downtime or dual-write strategy, and rollback window. Production execution requires explicit approval.

## Remaining implementation

- Implement and test a migration/import utility; this document is a plan, not an importer.
- Refactor synchronous store consumers to an asynchronous persistence interface while preserving API response shapes and authorization behavior.
- Add isolated database integration tests and validate read/write, rollback, and error handling.
- Reconcile deployment configuration and operational backup/restore procedures before production cutover.
