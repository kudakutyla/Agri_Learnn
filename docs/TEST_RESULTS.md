# AgriLearn Test Results

## Cloudflare R2 Video Storage Integration

| Check | Result | Evidence |
|---|---|---|
| Backend build | Passed | `server` `npm run build` |
| Backend tests | Passed | `server` `npm test`: 26/26 passed |
| Local R2 environment loading | Passed | Backend loads `server/.env` via `dotenv/config`; verified against the empty-placeholder `.env.example` |
| Mobile typecheck | Passed | `mobile` `npx tsc --noEmit` |
| Mobile lint | Passed | `mobile` `npx expo lint` |
| Expo Doctor | Passed | `mobile` `npx expo-doctor`: 20/20 checks |
| Live R2 upload and playback | Not run | No R2 credentials were configured in the process environment or `server/.env`; see [VIDEO_UPLOAD_TESTS.md](./VIDEO_UPLOAD_TESTS.md) for the real-R2 acceptance checklist |

## 2026-11-10 — Trainer Module and Video Upload Attempt

| Check | Result | Evidence |
|---|---|---|
| Trainer registration | Passed | Registered a trainer through the app and reached the trainer dashboard |
| Module creation | Passed | Saved a new draft module through the trainer workflow |
| Lesson video upload | Blocked | Selected the existing local MP4; the app received HTTP 503 with “Cloud video storage is not configured.” No video record or R2 object was created |
| Learner enrollment and playback | Not run | The video-less draft is not published; R2 configuration and the normal review/publication flow are prerequisites |

## 2026-11-06 — Logout Landing Page

| Check | Result | Evidence |
|---|---|---|
| Profile and admin logout | Passed | Both flows clear saved authentication state and replace the route with `/`, the welcome landing screen |
| Mobile checks | Passed | TypeScript typecheck and lint passed |

## 2026-11-06 — Post-Login Home Routing

| Check | Result | Evidence |
|---|---|---|
| Learner/employer login | Implemented | Successful login now routes learner and employer roles to `/home`; trainer/admin role destinations are preserved |
| Learner/employer registration | Implemented | New learner/employer registrations route to `/home` as well, matching login behavior |
| Validation | Passed | Mobile TypeScript typecheck and lint passed |

## 2026-11-06 — Creator Content Filters

| Check | Result | Evidence |
|---|---|---|
| Remove Needs changes filter | Passed | Content screen now offers All, Drafts, In review, and Published; returned courses remain available under All and retain their review feedback |
| Browser check | Passed | Reloaded creator content page and confirmed the Needs changes chip is gone |
| Mobile checks | Passed | TypeScript typecheck and lint passed |

## 2026-11-06 — Admin Pages Authentication Recovery

| Check | Result | Evidence |
|---|---|---|
| Admin login credentials | Passed | `admin@agrilearn.local` successfully authenticated against the running API and returned the admin role |
| Missing-session handling | Passed | Navigating to `/admin-users` without a session caused the protected API 401 handler to clear saved auth and redirect to `/login?reason=authentication-required`; login displayed the sign-in explanation |
| Expired-session handling | Implemented | A protected API 401 with a saved token clears saved auth and redirects with `reason=session-expired`; the login screen displays a distinct expiry message |
| Signed-in admin pages | Not tested | No authenticated browser session was available for checking the admin overview and data-bearing pages after login |
| Mobile checks | Passed | TypeScript typecheck, lint, and Expo web export passed |

## 2026-11-06 — Approval Action Navigation

| Check | Result | Evidence |
|---|---|---|
| Successful approval leaves review page | Implemented | A successful approval returns to the Reviewed list; failed requests remain on the course detail page with an error |
| Mobile checks | Passed | TypeScript typecheck, lint, Expo Doctor, and web export passed |
| Browser approval action | Not tested | Current approvals have no pending submissions, so a fresh approval could not be exercised without changing test data |

## 2026-11-06 — Course Approval Detail Page

| Check | Result | Evidence |
|---|---|---|
| Course list navigation | Implemented | Selecting an approval list item opens a dedicated course review route instead of a popup |
| Course information | Implemented | Detail page shows description, objectives, learner skills, lessons, assessment questions and correct answers, return feedback, and review history |
| Uploaded course media | Implemented | Lesson attachments and course uploads appear on the detail page; video playback sends the admin session, and PDFs are authenticated then previewed in-browser or in the native file viewer |
| Admin media authorization | Passed | Upload integration test verifies an authenticated administrator can retrieve uploaded video and PDF files from a draft course before approval |
| Review actions | Implemented | Pending submissions retain approve and return actions; approval/return navigates to the matching Reviewed/Returned list after success |
| Browser route | Passed | Admin detail route displays an Uploaded materials section; current reviewed course has no uploaded files, so media playback could not be exercised with real course assets |
| Automated checks | Passed | Backend tests 20/20; mobile TypeScript typecheck and lint passed |

## 2026-11-06 — Administrator Settings

| Check | Result | Evidence |
|---|---|---|
| Admin profile | Implemented | Settings loads the current authenticated profile and displays initials, name, and administrator role |
| Personal information | Implemented | Edit profile opens the existing account editor and returns to Settings after save |
| Account/security guidance | Implemented | Privacy, language, notification, and support rows explain the actual available behavior rather than presenting unimplemented controls |
| Role access and sign-out | Implemented | Settings does not expose a client-side role switch; sign-out is confirmed and clears the local session before routing to login |
| Navigation and authorization | Implemented | Settings bottom tab opens `/admin-settings`; non-admin profile is routed away from this screen |
| Browser route | Passed | `/admin-settings` renders the profile, account rows, administrator-access notice, sign-out action, and selected Settings navigation; without a signed-in admin session it displays the authentication error |
| Automated checks | Passed | Mobile typecheck, lint, and Expo web export passed |

## 2026-11-06 — Administrator Reports

| Check | Result | Evidence |
|---|---|---|
| Monthly active learners | Passed | Admin API counts unique learner accounts with progress or assessment activity during the trailing 30 days |
| Learning performance | Passed | Seven-day graph data counts unique learners per UTC calendar day from persisted progress updates and assessment attempts |
| Course completion | Passed | Average lesson completion is calculated from persisted learner/course progress; zero eligible enrolments are reported as no data |
| Platform totals | Passed | Certificates count persisted credentials and active opportunities count jobs with open status |
| Authorization | Passed | Isolated tests verify unauthenticated access returns 401 and learner access is forbidden |
| Dashboard navigation | Passed | Reports tab opens `/admin-reports`; report page includes refresh, loading, error, and unavailable states |
| Browser route | Passed | `/admin-reports` renders the performance header, activity chart area, metrics, and selected Reports navigation; unauthenticated requests show unavailable values and an authentication error |
| Automated checks | Passed | Backend tests 20/20 and TypeScript build passed; mobile typecheck, lint, and Expo web export passed |

## 2026-11-06 — Administrator Content Approvals

| Check | Result | Evidence |
|---|---|---|
| Approval queue | Passed | Admin-only endpoint lists submitted, approved, and returned courses with trainer names and stored review history; drafts are excluded |
| Course review details | Passed | Dedicated review page loads description, objectives, learner skills, lessons, assessment questions/options, and answer keys for the administrator |
| Pending approval dashboard shortcut | Passed | Signed-in admin clicked the overview card; it navigated to `/admin-approvals?tab=Pending` with the Pending tab selected |
| Approve and return | Passed | Approving publishes a submitted course; returning requires at least 5 characters of trainer feedback; stale/draft and duplicate reviews are rejected |
| Review history | Passed | Each decision records administrator ID, decision, note, and timestamp; the queue returns that history for review |
| Trainer feedback visibility | Passed | Owner-only trainer course endpoint returns review feedback for their content; learner access is forbidden and public course records omit review notes |
| Tabs and navigation | Passed | Pending, Reviewed, and Returned tabs reflect persisted course states; bottom Approvals tab opens the screen |
| Authorization | Passed | Isolated backend tests verify unauthenticated access returns 401 and learner access is forbidden |
| Browser route | Passed | `/admin-approvals` renders all three tabs and the admin navigation; without a signed-in admin session it displays the authentication error rather than showing a fake empty approval queue |
| Automated checks | Passed | Backend tests 18/18 and TypeScript build passed; mobile typecheck, lint, and final Expo web export passed |

## 2026-11-06 — Administrator User Directory

| Check | Result | Evidence |
|---|---|---|
| User listing | Passed | Admin Users screen loads the existing protected directory and displays registered users with initials and available profile details |
| Search | Passed | Search filters by name, email, user ID, category, primary interest, and province |
| Role filters | Passed | All, Learners, Trainers, and SMMEs filters; administrator accounts can be included or hidden from All |
| Navigation | Passed | The Users bottom tab opens the new screen and Dashboard returns to the overview; unfinished tabs remain disabled |
| Data handling | Passed | User list exposes existing public profile data only; the role API test confirms password hashes are not included |
| Browser route | Passed | `/admin-users` renders the management header, search input, role filters, and shared admin navigation; unauthenticated API access shows a clear authentication error and does not present an empty-user count |
| Automated checks | Passed | Backend tests 16/16 and TypeScript build passed; mobile typecheck, lint, and Expo web export passed |

## 2026-11-06 — Administrator Dashboard Overview

| Check | Result | Evidence |
|---|---|---|
| Persisted overview metrics | Passed | Admin API summary reports registered learners, published modules, issued certificates, employer accounts, and submitted-course approvals from the local data store |
| Learner growth and activity | Passed | Overview returns six monthly learner-registration counts and recent module submissions, learner registrations, and vacancy posts |
| Authorization | Passed | Isolated backend tests verify an admin receives the overview, while an unauthenticated request receives 401 and a learner receives 403 |
| Admin navigation | Passed | Successful admin login routes to `/admin`; trainer login/registration continue to route to `/manage-courses` |
| Dashboard layout | Passed | Browser rendered the mobile-oriented overview, metrics, approval notice, registration chart, activity list, and bottom navigation; with no admin browser session, it displayed an authentication error and unavailable values rather than fabricated zeros |
| Automated checks | Passed | Backend tests 16/16 and TypeScript build passed; mobile typecheck, lint, and Expo web export passed |
| Remaining admin functions | Incomplete | Users, Approvals, Reports, and Settings bottom items are visual only; no management screens or report workflows were added |

## 2026-11-06 — Role Requirements Usual-Path Sweep

| Role / flow | Result | Evidence |
|---|---|---|
| Learner registration | Passed | Registered a test learner through the in-app role/category and profile steps; the app created a learner session and routed to Profile |
| Course discovery to certificate | Passed | In the learner app, opened Explore, selected the approved Water-Smart course, viewed its details and skill, enrolled, completed its lesson, passed the 70% assessment at 100%, and received a certificate |
| Learner records | Passed | Skills Passport showed the issued certificate and Soil moisture monitoring skill; My Learning Completed showed the same certificate-backed course |
| Learner job application | Passed | The learner opened Opportunities from My Learning and submitted an application; the app displayed Application submitted |
| Trainer authoring | Passed | Registered a test content creator, created a course with a skill, added a lesson and assessment, submitted it, and confirmed My Content showed UNDER REVIEW |
| Administrator review | Blocked in app | `/admin` displayed User and role management, Content approvals, Categories, and Reports as static labels with zero interactive buttons; the trainer course cannot be approved through the normal admin path |
| Employer vacancy workflow | Unavailable in app | API tests cover publishing jobs and listing applications, but the app has no employer workspace or job create/manage screen |
| Invitations, learner consent, role/user administration, category editing, reports | Not available to verify | No complete app workflow exists; invitation listing/response and sharing permissions are also absent or untested in the backend |
| Learner-specific in-progress list | Incomplete | My Learning Completed is certificate-backed, but In progress and its summary metrics still come from sample course data, not the signed-in learner’s persisted progress |
| Automated checks | Passed | Backend tests 14/14 and server build passed; mobile typecheck, lint, Expo web export, and Expo Doctor 20/20 passed |
| Test data | Note | The local JSON store now contains a test learner with a course progress record, certificate, and job application, plus a test trainer and submitted “Usual Path Test: Sustainable Soil Care” course. No existing records were deleted or edited |

## 2026-11-06 — Published Course Discovery and In-App Enrolment

| Check | Result | Evidence |
|---|---|---|
| Explore catalogue | Passed | Explore combines its sample catalogue with approved API courses and searchable course skills; unpublished courses are excluded |
| Published course details | Passed | API course details show stored description, lesson list, skills, level, and duration |
| Learner app flow | Passed | Browser opened Explore, selected the published “Water-Smart Crop Irrigation E2E Course,” viewed its real details and skill, selected “Enrol for free,” and arrived at its lesson screen |
| Learner enrolment | Passed | Enrol action persists learner/course progress with enrollment timestamp and opens the course lesson screen |
| Duplicate and authorization handling | Passed | Re-enrolment is idempotent; drafts are unavailable to learners and trainer enrol attempts are forbidden |
| Mobile and server checks | Passed | Mobile typecheck, lint, Expo web export, and Expo Doctor (20/20) pass; server tests (14/14) and build pass |

## 2026-11-06 — Completed Courses Match Certificates

| Check | Result | Evidence |
|---|---|---|
| Completion source | Passed | My Learning Completed tab now uses the authenticated learner’s certificate records instead of the static sample course progress values, and refreshes records when the tab is opened |
| Certificate course card | Passed | Each earned certificate appears as a completed course card with its course title, certificate status, earned skills when present, and a Passport link |
| Loading and error states | Passed | Completed tab displays loading, retryable API error, and empty states rather than implying no completed courses while data is loading |
| Mobile checks | Passed | `npm run typecheck`, `npm run lint`, and Expo web export completed successfully |

## 2026-11-06 — Course Skills on My Learning Cards

| Check | Result | Evidence |
|---|---|---|
| Course skill data | Passed | Course catalogue entries include skill labels associated with their learning outcomes |
| My Learning cards | Passed | Each visible course card renders its skills as readable tags alongside course progress details |
| Card text sizing | Passed | Increased the status, course title, next lesson, skill tags, progress, and Continue action text sizes |
| Mobile checks | Passed | `npm run typecheck`, `npm run lint`, and Expo web export completed successfully |

## 2026-11-06 — Opportunities Shortcut in My Learning

| Check | Result | Evidence |
|---|---|---|
| Bottom navigation | Passed | Removed Opportunities as a standalone tab; the remaining five destinations are visible |
| Explore placement | Passed | Removed the Opportunities icon from Explore; the course sort control remains available |
| My Learning shortcut | Passed | My Learning displays an accessible Opportunities icon button; browser activation navigated to `/opportunities` |
| Active navigation state | Passed | Opportunities route keeps Learning selected in the bottom navigation |
| Mobile checks | Passed | `npm run typecheck`, `npm run lint`, and Expo web export completed successfully |

## 2026-11-06 — Home Skills Passport Summary Consistency

| Check | Result | Evidence |
|---|---|---|
| Shared passport calculations | Passed | Home card and Passport screen use the same earned-skill and certificate-points helpers |
| Live authenticated credentials | Passed | Browser Home card showed 1 skill, 1 certificate, and 0 points for the E2E learner; the Passport screen showed the same counts |
| Earned skill preview | Passed | Home card displayed the learner’s actual “Soil moisture monitoring” initials rather than placeholder skills; Passport listed that earned skill |
| Mobile checks | Passed | `npm run typecheck` and `npm run lint` completed successfully; Expo web export completed successfully |
## 2026-11-06 — New Course to Learner Certificate End-to-End

| Check | Result | Evidence |
|---|---|---|
| Trainer registration and course authoring | Passed | Registered a trainer; created “Water-Smart Crop Irrigation E2E Course” with one reading lesson, a 70% assessment, and the skill “Soil moisture monitoring” |
| Course submission and approval | Passed | Trainer submitted the course; a temporary administrator authorized for this test approved it through the protected API; the temporary admin account was removed afterward |
| Learner registration and course access | Passed | Registered a learner and opened the published course’s content route; course content loaded from the API |
| Lesson completion and test | Passed | Learner completed the lesson, started the course-specific assessment, selected the correct answer, and received a 100% passing result |
| Certificate and earned skill | Passed | API returned one certificate for the learner and course; the Skills Passport displayed “Soil moisture monitoring” as earned from this course |
| Persistent records and cleanup | Passed | Course is approved, learner progress and one certificate are persisted, and no temporary administrator remains |
| Navigation limitation | Superseded | The first test opened course content by ID; the later Role Requirements Usual-Path Sweep verified discovery and enrollment through Explore and course details |

## 2026-11-06 — Stale Session Recovery

| Check | Result | Evidence |
|---|---|---|
| Invalid saved account session | Passed | Reproduced the Passport’s `401 Session is invalid` using the browser’s saved token against `/api/me` |
| Automatic recovery | Passed | Protected API `401` clears saved authentication and routes to sign-in; login screen explains that the session is no longer valid |
| Browser verification | Passed | Opening Passport with the invalid saved token navigated to `/login?reason=session-expired` and displayed the sign-in explanation |
| Mobile checks | Passed | `npm run typecheck`, `npm run lint`, and Expo web export completed successfully |

## 2026-11-06 — Course Skills and Skills Passport

| Check | Result | Evidence |
|---|---|---|
| Course authoring | Passed | Trainer form provides add/remove skill entry, preloads saved draft skills, and shows skills in the course preview |
| Course skill validation | Passed | API trims skill names, allows up to 12, and rejects case-insensitive duplicates and invalid entries |
| Draft update persistence | Passed | Automated workflow confirms unrelated lesson/assessment edits preserve course skills |
| Skills awarded on completion | Passed | Passing learner certificate returns course skills; failed attempts return no certificate |
| Skills Passport data | Passed | Passport derives distinct earned skills from the authenticated learner’s certificate records and identifies the source course |
| Backend tests and build | Passed | `npm test` passed all 13 tests; `npm run build` completed without errors |
| Mobile checks | Passed | `npm run typecheck`, `npm run lint`, Expo web export, and `npx expo-doctor` completed successfully (20/20 checks) |

## 2026-11-06 — Learner Assessment Start and Completion

| Check | Result | Evidence |
|---|---|---|
| Lesson completion | Passed | Browser completed the ordered lessons; API persisted learner/course progress and reported completion |
| Completion eligibility | Passed | Automated tests reject unpublished-course lesson completion and assessment attempts, reject out-of-order lessons and premature assessment access, and allow repeated completion safely |
| Start test navigation | Passed | Course-complete action opened the course-specific assessment route |
| Learner assessment API | Passed | Published course questions loaded without correct-answer indexes; invalid and incomplete answer sets were rejected |
| Assessment submission | Passed | Browser learner submitted the correct answer and saw 100%; automated tests also verified a failed attempt does not issue a credential |
| Certificate on pass | Passed | Credential is tied to learner/course, includes issue date and unique ID, appears in the Skills Passport, and repeated passing attempts do not duplicate it |
| Backend tests and build | Passed | `npm test` passed all 13 tests; `npm run build` completed without errors |
| Mobile checks | Passed | `npm run typecheck`, `npm run lint`, Expo web export, and `npx expo-doctor` completed successfully (20/20 checks) |

## 2026-11-06 — Initial Module-to-Certificate Baseline (Superseded)

| Check | Result | Evidence |
|---|---|---|
| Trainer module creation | Passed (API) | Isolated test created a course draft with an authenticated trainer |
| Lesson and assessment authoring | Passed (API) | Saved one lesson and one authored assessment question |
| Content review | Passed (API) | Submitted the course as trainer and approved it as administrator |
| Learner assessment | Passed (API only) | Learner submitted the correct answer and received a persisted passing attempt (100%) |
| Certificate issuance | Blocked at baseline | The initial test run found that passing did not issue a credential; addressed in the Learner Assessment Start and Completion flow below |
| Learner app flow | Blocked at baseline | The initial browser run found Start test unavailable; addressed in the Learner Assessment Start and Completion flow below |
| Test data isolation | Passed | Initial API scenario used a temporary JSON data file and removed it after the run |

## 2026-11-06 — Job Skills Requirements

| Check | Result | Evidence |
|---|---|---|
| Job skills API persistence | Passed | Opportunity test verifies required skills are stored and returned by the public jobs endpoint; invalid skill entries return HTTP 400 |
| Applicant-facing skills | Passed | Browser verified the posted Seasonal Crop Production Assistant card shows Crop monitoring, Irrigation scheduling, Farm record keeping, and Field preparation before the submitted application state |
| Backend tests and build | Passed | `npm test` passed all 13 tests; `npm run build` completed without errors |
| Mobile typecheck and lint | Passed | `npm run typecheck` and `npm run lint` completed without errors |

## 2026-11-06 — Role Capabilities Audit Validation

| Check | Result | Evidence |
|---|---|---|
| Backend tests | Passed | `npm test` passed all 13 tests |
| Backend TypeScript build | Passed | `npm run build` completed without errors |
| Mobile TypeScript | Passed | `npm run typecheck` completed without errors |
| Mobile lint | Passed | `npm run lint` completed without findings |
| Expo Doctor | Passed | `npx expo-doctor`: 20/20 checks passed |
| Role capability coverage | Incomplete | See [ROLE_CAPABILITIES_AUDIT.md](./ROLE_CAPABILITIES_AUDIT.md); passing checks cover existing behavior, not missing workflows |

## 2026-11-03 — Mobile Foundation

| Check | Result | Evidence |
|---|---|---|
| Expo configuration | Passed | `npx expo-doctor`: 20/20 checks passed |
| TypeScript | Passed | `npm run typecheck` completed with no errors |
| ESLint | Passed | `npx eslint .` completed with no errors |
| Expo Router entry | Passed | Metro reports `Using src/app as the root directory for Expo Router` |
| Metro server | Passed | `http://localhost:8083` returned HTTP 200 |
| NativeWind configuration | Present | Metro configuration uses NativeWind and Tailwind presets; visual bundle verification remains to be performed in a device/simulator |

## Re-run Commands

From the repository root:

```powershell
cd mobile
npm run typecheck
npx eslint .
npx expo-doctor
npx expo start --clear
```

Mark implementation requirements as verified only after the listed manual or automated evidence has been completed.

## 2026-11-03 — Application Foundation and Authentication API

| Check | Result | Evidence |
|---|---|---|
| Mobile TypeScript | Passed | `npm run typecheck` completed with no errors |
| Backend TypeScript | Passed | `npm run build` completed with no errors |
| API health | Passed | `GET /api/health` returned service status |
| API registration | Passed | Registration returned a public user and JWT without persisting a password |
| Password hashing | Passed | Stored user records use bcrypt hashes |
| Persistent API data | Passed | Registered user was written to the configured JSON data store |
| Native UI foundation | Implemented | Welcome, registration, login, home, explore, learning, and passport screens added |

## 2026-11-03 — Role Workspaces and Resource APIs

| Check | Result | Evidence |
|---|---|---|
| Backend build | Passed | TypeScript compilation completed with no errors |
| Mobile type check | Passed | TypeScript compilation completed with no errors |
| Mobile lint | Passed | Expo ESLint completed with no findings |
| Expo web export | Passed | All learner and role workspace routes were bundled |
| API health | Passed | Health endpoint returned the AgriLearn service status |
| Authenticated session | Passed | Registration token resolved the correct learner through `/api/me` |
| Role authorization | Passed | Learner access to the admin user endpoint returned HTTP 403 |
| Persistent resources | Implemented | Courses, jobs, applications, invitations, categories, assessments, attempts, and certificates are supported by the JSON store |

## 2026-11-03 — Creator Module Flow and Content

| Check | Result | Evidence |
|---|---|---|
| Mobile lint | Passed | `npm run lint` completed without findings |
| Mobile TypeScript | Passed | `npm run typecheck` completed without errors |
| Backend build | Passed | `npm run build` completed without errors |
| Creator module wizard | Passed | Browser flow completed module details, lesson creation, preview, and submission status |
| Course persistence | Passed | Authenticated API create, lesson/assessment update, submission, and cleanup succeeded |
| Cover image field | Passed | Course API accepted and persisted a valid optional JPG/PNG data URI |
| Creator content filters | Passed | Browser verified All, Drafts, and Published filters and displayed the owned module before test cleanup |
| Content screen design | Passed | Compared the responsive mobile screen against the supplied ZIP content-page reference |

## 2026-11-03 — Lesson Video and PDF Uploads

| Check | Result | Evidence |
|---|---|---|
| Expo compatibility | Passed | `npx expo-doctor`: 20/20 checks passed |
| Mobile TypeScript and lint | Passed | `npm run typecheck` and `npm run lint` completed without findings |
| Backend build | Passed | `npm run build` completed without errors |
| Upload API | Passed | `npm test` verified MP4 and PDF persistence, approved-course downloads, private draft access, invalid types, unauthenticated access, cross-trainer access, and PDF size limits |
| Creator upload UI | Passed | Browser selected and uploaded an MP4 and PDF, then displayed each filename on its saved lesson |

## 2026-11-05 — Authentication Flow Repair

| Check | Result | Evidence |
|---|---|---|
| Mobile TypeScript | Passed | `npm run typecheck` completed with no errors |
| Mobile lint | Passed | `npm run lint` completed without findings |
| Backend tests | Passed | `npm test` passed 2/2 upload API tests |
| Invalid sign-in feedback | Passed | Browser showed the API's rejected-credentials message inline after HTTP 401 |
| Registration flow | Passed | Isolated browser registration created an account and navigated to `/dashboard` |
| Sign-in flow | Passed | The isolated account signed in and navigated to `/dashboard` |

## 2026-11-05 — Home and Profile Screens

| Check | Result | Evidence |
|---|---|---|
| Home content and layout | Passed | Home route continues to render the existing learner dashboard |
| Profile layout | Passed | Added profile identity, account settings list, role prototype selector, and sign-out action |
| Bottom navigation state | Passed | Profile route continues to highlight the Profile tab |
| Sign out | Passed | Confirmation clears local authentication and profile storage, then routes to sign-in |
| Mobile TypeScript | Passed | `npm run typecheck` completed with no errors |
| Mobile lint | Passed | `npm run lint` completed without findings |
| Expo web export | Passed | `npx expo export --platform web` bundled the Home and distinct Profile routes |

## 2026-11-05 — Profile Actions

| Check | Result | Evidence |
|---|---|---|
| Profile update API | Passed | `npm test` verifies registration profile fields update and persist, duplicate emails and invalid requests are rejected, and password updates require the current password |
| Profile editing screen | Passed | Mobile type check, lint, and web export validate editable registration fields, province/category pickers, password form, save state, and errors |
| Profile actions | Passed | Browser verified Notification preferences navigation, the Privacy & security dialog, and sign-out confirmation/cancel; all bottom-navigation buttons expose button semantics and selected state |
| Registration details | Passed | Mobile registration sends the selected category, province, mobile number, and primary interest to the API; backend profile tests verify the saved fields are editable and returned without exposing password hashes |

## 2026-11-05 — Home Recommended Courses Carousel

| Check | Result | Evidence |
|---|---|---|
| Auto-advance and manual navigation | Passed | Browser confirmed the carousel advances after five seconds and the previous/next controls scroll between course cards |
| Mobile swipe behavior | Passed | Horizontal ScrollView supports swipe gestures and snaps to each course card |
| Mobile TypeScript and lint | Passed | `npm run typecheck` and `npm run lint` completed without errors |
| Expo web export | Passed | `npx expo export --platform web` bundled the updated Home and Profile routes |

## 2026-11-05 — Home Notification and Theme Controls

| Check | Result | Evidence |
|---|---|---|
| Notification icon | Passed | Home header displays an accessible bell button that opens Notifications |
| Theme toggle | Passed | Home header provides an accessible light/dark toggle; browser confirmed the Home palette changes and the selected mode is restored after reload |
| Main tab dark palette | Passed | Home, Explore, Learning, Passport, Profile, profile editing, Notifications, and bottom navigation include dark-mode styles |
| Mobile TypeScript and lint | Passed | `npm run typecheck` and `npm run lint` completed without errors |
| Expo web export | Passed | Web export emitted the updated application routes |

## 2026-11-05 — Learner Workflow Walkthrough

| Step | Result | Observed behavior |
|---|---|---|
| 1. Open AgriLearn | Passed | Welcome screen loaded at `/`. |
| 2. Register or log in | Passed | Registered a local test learner and arrived at the authenticated app. |
| 3. Access learner dashboard | Partial | Registration redirected to `/dashboard` (Profile); Home is accessible from the Home tab at `/home`. |
| 4. Explore courses and lessons | Passed | Explore lists four sample courses and their lesson details. |
| 5. Select a course | Passed | Climate-Smart Crop Production opened its course information. |
| 6. Enrol in the course | Partial | “Enrol for free” opens lesson content, but no enrollment record is created or persisted. |
| 7. Complete lessons | Partial | Four lesson pages can be advanced through; the selected course has no video asset and its reading lesson has no PDF. Lesson progress is not persisted to the learner account. |
| 8. Complete assessments | Blocked | Course notice shows assessment details, but no questions are configured and “Start test” gave no visible feedback in the web client. |
| 9. View learning progress | Partial | My Learning renders a sample 2-course summary (52%, 4.1h); values are not account-specific and did not update from the walkthrough. |
| 10. Earn a certificate | Blocked | Assessment cannot be completed, so no certificate is issued. |
| 11. Access certificate in Skills Passport | Partial | Passport screen opens for the signed-in learner, but shows zero credentials and zero points. |
| 12. Explore agricultural opportunities | Partial | `/opportunities` displays two sample listings, but is not linked from learner navigation and the listing cards have no action. |

The walkthrough exposed end-to-end enrollment, progress persistence, assessment, certificate issuance, and learner opportunity navigation as unfinished flows. Do not treat the sample course, progress, or opportunity content as learner-specific production data.

## 2026-11-05 — Explore Course Discovery Screen

| Check | Result | Evidence |
|---|---|---|
| Explore layout | Passed | Browser verified the reference-inspired header, search, topic chips, featured course, popular list, and bottom navigation |
| Search and topic filters | Passed | Course results update for search text and selected topic |
| Sort control | Passed | Sort menu provides recommended, alphabetical, and shortest-first ordering |
| Mobile TypeScript | Passed | `npm run typecheck` completed with no errors |
| Mobile lint | Passed | `npm run lint` completed without findings |

## 2026-11-05 — Explore Course Information

| Check | Result | Evidence |
|---|---|---|
| Course navigation | Passed | Featured and popular course cards navigate to the shared course information route with the selected course ID |
| Course detail content | Passed | Detail route displays course description, duration, lesson count, level, instructor, learning outcomes, and lesson titles from the selected catalogue item |
| Invalid course route | Passed | Unknown course IDs show a clear not-found state with a back action |
| Course content navigation | Passed | “Enrol for free” routes to the selected course lesson screen |
| Video player integration | Implemented | Published lessons with uploaded video files render Expo Video native playback controls; this catalogue has no uploaded video asset for playback testing |
| Empty navigation history | Passed | Course and lesson back actions check navigation history and route to Explore or course details when opened directly |
| Mobile TypeScript | Passed | `npm run typecheck` completed with no errors |
| Mobile lint | Passed | `npm run lint` completed without findings |
| Expo web export | Passed | `npx expo export --platform web` emitted the Explore, course details, and course content route bundles |
| Expo Doctor | Warning | 19/20 checks passed; existing SDK version mismatches remain for Expo, Expo Constants, Expo Linking, Expo Router, and React Native Safe Area Context |

## 2026-11-05 — My Learning Layout

| Check | Result | Evidence |
|---|---|---|
| Learning screen layout | Passed | Added status tabs, course progress summary, image-led course cards, next lesson text, and Continue action |
| Learning tabs | Passed | In progress and Completed filter course progress; Saved presents an empty state without claiming unsupported saved data |
| Continue action | Passed | Each active course navigates to its course lesson screen |
| Mobile TypeScript | Passed | `npm run typecheck` completed with no errors |
| Mobile lint | Passed | `npm run lint` completed without findings |
| Expo web export | Passed | `npx expo export --platform web` emitted the Learning screen bundle |

## 2026-11-05 — Skills Passport Layout

| Check | Result | Evidence |
|---|---|---|
| Passport layout | Passed | Added branded profile header, credential summary, account notice, and Skills/Credentials/History tabs |
| Credential data | Passed | Passport loads the authenticated learner's certificates from `/api/certificates`; skill categories and points are derived only from returned certificate records |
| Empty and error states | Passed | Missing records show truthful empty states; API failures are displayed rather than replaced with fake credentials |
| Mobile TypeScript | Passed | `npm run typecheck` completed with no errors |
| Mobile lint | Passed | `npm run lint` completed without findings |
| Expo web export | Passed | `npx expo export --platform web` emitted the Passport screen bundle |

## 2026-11-05 — Focused Course Lesson Layout

| Check | Result | Evidence |
|---|---|---|
| Lesson screen layout | Passed | Added course progress bar, branded header with Save & exit, lesson index/duration/title, media area, lesson description, reminder, and Previous/Next controls |
| Lesson navigation | Passed | Previous/Next changes the selected lesson; Save & exit returns to the previous screen |
| Media behavior | Passed | Uploaded videos use native playback controls; missing videos are labeled and do not imply that placeholder imagery is playable |
| Mobile TypeScript | Passed | `npm run typecheck` completed with no errors |
| Mobile lint | Passed | `npm run lint` completed without findings |
| Expo web export | Passed | `npx expo export --platform web` emitted the focused course lesson route bundle |

## 2026-11-05 — Course Completion Test Notice

| Check | Result | Evidence |
|---|---|---|
| Final lesson action | Passed | Final lesson button is labeled “Complete course” and opens the course-specific assessment notice |
| Test notice | Passed | Notice displays course title, configured question count, pass mark, and a Start test action |
| Start test feedback | Passed | Explains that questions must be configured before a test can start; no placeholder assessment is presented as real |
| Mobile TypeScript | Passed | `npm run typecheck` completed with no errors |
| Mobile lint | Passed | `npm run lint` completed without findings |
| Expo web export | Passed | `npx expo export --platform web` emitted the course-complete route bundle |

## 2026-11-05 — Learner PDF Lesson Access

| Check | Result | Evidence |
|---|---|---|
| PDF lesson action | Passed | Reading lesson with an attached PDF shows its filename and opens the file through the device/browser PDF handler |
| Missing PDF state | Passed | Reading lessons without an attached PDF state clearly that notes have not been added |
| PDF response behavior | Passed | Course file route serves PDFs inline with their PDF MIME type; approved-course lesson-file checks remain in place |
| Learner access | Passed | Upload integration test retrieves approved lesson files with a learner session |
| Upload API regression tests | Passed | `npm test` passed 2/2 upload API tests |
| Backend TypeScript | Passed | `npm run build` completed with no errors |
| Mobile TypeScript and lint | Passed | `npm run typecheck` and `npm run lint` completed without findings |
| Expo web export | Passed | `npx expo export --platform web` emitted the updated course content route |

## 2026-11-05 — Offline Course Videos

| Check | Result | Evidence |
|---|---|---|
| Video offline download | Implemented | Added per-video download action, native persistent document storage, and progress feedback |
| Offline playback | Implemented | Lesson screen prefers the local saved file and caches approved course metadata for reopening offline |
| Browser download | Passed | Web lesson offers a browser download action; backend upload tests verify attachment disposition for `?download=1` |
| Learner video access | Passed | `npm test` passed 2/2 upload API tests, including authenticated learner video download and response headers |
| Backend TypeScript | Passed | `npm run build` completed without errors |
| Mobile TypeScript | Passed | `npm run typecheck` completed without errors |
| Mobile lint | Passed | `npm run lint` completed without findings |
| Expo web export | Passed | `npx expo export --platform web` bundled the course content route |
| Airplane-mode device verification | Not run | Native device testing is still needed to verify download, app restart, and playback with network disabled |

## 2026-11-05 — Opportunities Discovery and Application

| Check | Result | Evidence |
|---|---|---|
| Opportunity screen layout | Implemented | Uses the app's shared content spacing, typography, card surfaces, light/dark palette, and persistent bottom navigation |
| Opportunity data | Implemented | Replaced static sample cards with open jobs loaded from the backend API |
| Search and refresh | Implemented | Role, location, type, and description search; pull-to-refresh reloads jobs and the learner's applications |
| Application action | Implemented | Learners submit applications through the authenticated API; submitted applications are shown and cannot be submitted again from the screen |
| Loading, error, and empty states | Implemented | Loading, retry, no published jobs, no search matches, and API error states are visible |
| Backend application flow | Passed | `npm test` verifies employer job publishing, public job listing, learner application persistence, duplicate rejection, and authentication/role enforcement |
| Mobile TypeScript and lint | Passed | `npm run typecheck` and `npm run lint` completed without errors |
| Expo web export | Passed | `npx expo export --platform web` emitted the updated Opportunities route |
| Browser verification | Partial | Confirmed the real-data empty state, Explore courses action, and persistent Opportunities tab; application card flow needs a published job and authenticated learner |

## Trainer Workflow 8.3 Walkthrough

| Step/Check | Result | Observed behavior |
|---|---|---|
| 1-2. Sign in and open trainer dashboard | Passed | Signed in with a local trainer account; dashboard profile and course counts came from the API instead of fixed demo metrics. |
| 3. Create a course | Passed | Blank-title validation showed an inline message; valid course details were saved as a draft. |
| 4. Add lessons and resources | Passed | Added a reading lesson and PDF resource; reopening the rejected course restored its saved lesson and resource. |
| 5. Create an assessment | Passed | Added a multiple-choice question, choices, correct answer, and passing score; the persisted assessment was restored on edit. |
| 6. Save as draft | Passed | Draft confirmation appeared after saving course and assessment content. |
| 7-8. Submit and review status | Passed | Previewed and submitted the complete course; the UI showed “UNDER REVIEW”. An admin API action moved the local test course to rejected, and the content list showed that status. |
| 9. Update content | Passed | Reopened the rejected course, edited its title, and saved; it returned to draft. This edited version was not resubmitted during the walkthrough. |
| Assessment and workflow API tests | Passed | `server/test/trainer-workflow.test.ts` verifies invalid assessment rejection, ownership and role guards, question persistence/scoring, complete-draft submission, edit locking, trainer self-approval denial, and admin approval. |
| Backend build and test suite | Passed | `npm run build` completed and `npm test` passed 10/10 tests. |
| Mobile TypeScript | Passed | `npm run typecheck` completed after the optional cover rendering change. |
| Mobile lint and Expo web export | Pending | Final commands were still running at the last status check. |
| Browser runtime check after final UI change | Not verified | The browser became blank after reload while investigating a React Native Web “Unexpected text node” warning; the final optional-cover change has not been confirmed in a fresh browser session. |

## 2026-11-06 — Role-Based End-to-End Validation and Fixes

| Role/check | Result | Evidence |
|---|---|---|
| Learner registration and opportunity flow | Passed | API integration tests verify learner registration, published opportunity browsing, one application per job, and learner-only application results. |
| Agricultural SMME / employer registration | Passed | Browser registered an Agricultural SMME, reached `/dashboard`, displayed the employer account label, and authenticated API login returned role `employer`. |
| Employer learner capabilities | Passed | Role integration tests verify employers can apply to opportunities and submit assessments, and can only see their own certificates. |
| Employer application privacy | Passed | Integration tests verify employers see their own applications and applications to their jobs, but not another employer's applicants. |
| Trainer course and assessment flow | Passed | Existing trainer workflow tests cover owned drafts, assessment validation, submission locks, upload access, and administrator review. |
| Administrator authorization and review | Passed | Role integration tests verify administrator user listing and course approval; public registration with `role: admin` is rejected. Test administrators are provisioned directly in isolated test data. |
| Mobile registration role mapping | Passed | Browser selected Agricultural SMME and the resulting account was persisted as `employer`. |
| Backend tests and build | Passed | `npm test` passed 13/13 tests; `npm run build` completed without errors. |
| Mobile typecheck and lint | Passed | `npm run typecheck` and `npm run lint` completed without errors. |
| Expo compatibility and web export | Passed | `npx expo-doctor` passed 20/20 checks; `npx expo export --platform web` completed successfully. |
| Running app and API | Passed | Expo returned HTTP 200 at `http://localhost:8081/register`; API health returned HTTP 200 at `http://localhost:4000/api/health`. |
| Remaining end-to-end gaps | Incomplete | Course enrollment/progress/credential issuance, employer business/job/application management UI and status transitions, invitation lifecycle, and administrator user/category/report/issue management are not fully implemented. These remain incomplete in `docs/REQUIREMENTS.md`. |

### Fixes made during validation

- Public registration no longer permits self-assignment of the administrator role.
- Agricultural SMME registration creates an employer account.
- Application reads are role-scoped; employers can still use learner application and assessment endpoints.
- Learner and employer certificate reads are limited to the authenticated user's own records.
- Expo packages were aligned with the installed SDK; Expo Doctor now passes all checks.
