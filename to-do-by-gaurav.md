# CareerCompass — To-Do by Gaurav

> **Purpose:** This is the final owner-side handoff and completion checklist for the current CareerCompass project. It lists the remaining manual setup, review, UI refinement, verification, and launch actions.
>
> **Scope is frozen. Do not add product features.** Keep the existing feature set and behavior as-is. The only planned product-facing change is a visual redesign of the existing UI (glassmorphism, modern, rich, and minimal) without changing what the features do. Other work in this checklist is configuration, data/source review, quality assurance, and deployment of functionality already present in the repository.

This checklist is intentionally written for the project owner to complete step by step. A checkbox means the owner has personally completed and verified that item in the intended environment; code existing in the repository does not count as a deployed or tested result.

---

## Contents

- [1. Ground rules and completion definition](#1-ground-rules-and-completion-definition)
- [2. What is already implemented](#2-what-is-already-implemented)
- [3. Before starting: make a safe project copy](#3-before-starting-make-a-safe-project-copy)
- [4. Configure Supabase](#4-configure-supabase)
- [5. Configure local environment variables](#5-configure-local-environment-variables)
- [6. Install, run, and inspect locally](#6-install-run-and-inspect-locally)
- [7. Run and review the live ingestion pipeline](#7-run-and-review-the-live-ingestion-pipeline)
- [8. Enable and verify semantic search](#8-enable-and-verify-semantic-search)
- [9. Review source data and trust](#9-review-source-data-and-trust)
- [10. Refresh the existing UI](#10-refresh-the-existing-ui)
- [11. Verify every existing feature](#11-verify-every-existing-feature)
- [12. Security and privacy review](#12-security-and-privacy-review)
- [13. Configure production hosting](#13-configure-production-hosting)
- [14. Configure scheduled jobs, alerts, and push](#14-configure-scheduled-jobs-alerts-and-push)
- [15. Verify production after deployment](#15-verify-production-after-deployment)
- [16. Final release checklist](#16-final-release-checklist)
- [17. Evidence and sign-off log](#17-evidence-and-sign-off-log)
- [18. Existing references](#18-existing-references)

---

## 1. Ground rules and completion definition

### 1.1 Scope freeze

- [ ] Keep the existing product scope. Do not add new user-facing features or new product modules.
- [ ] Do not begin blueprint expansion such as Hindi/localization, family/dependent profiles, new civic/finance/health modules, or broader benefits datasets as part of this handoff.
- [ ] Preserve current flows and API behavior during visual refinement. Fix a defect only when a verification step proves an existing feature does not work as intended.
- [ ] The one planned product UI task is to update the appearance of existing pages using a modern, rich, minimal design with restrained glassmorphism.
- [ ] Keep the source link, freshness, and advisory eligibility wording clear in the redesigned UI.
- [ ] Do not represent a successful build, a demo-data response, or an old smoke-run as proof that production integrations work.

### 1.2 What “complete” means

The project is ready for a controlled launch only when all of these are true:

- [ ] The correct Supabase schema and migrations are applied to the intended project.
- [ ] The application starts locally with the intended configuration.
- [ ] Live ingestion has completed and its data has been inspected.
- [ ] Explore has been confirmed to search live data, with the actual search path understood.
- [ ] The existing UI has been visually refined without changing product scope.
- [ ] Each existing user journey and integration has been tested using a written record of results.
- [ ] Production secrets, authentication redirects, database policies, scheduled jobs, and selected optional integrations are configured correctly.
- [ ] A deployment has been checked in the actual deployed environment.
- [ ] Any failed or skipped check is recorded honestly with its reason and owner.

### 1.3 Safety rules for manual work

- [ ] Start with a non-production Supabase project while learning and validating the setup.
- [ ] Before any SQL, ingestion, account deletion, or deployment action, confirm the target project and environment.
- [ ] Review SQL migrations before running them. Some migrations can consolidate or remove duplicate rows.
- [ ] Keep API keys, service-role credentials, cron secrets, and VAPID private keys out of browser code, screenshots, issue trackers, and public chats.
- [ ] Never use real user documents or sensitive personal data for testing.
- [ ] Use disposable test accounts for destructive account-flow checks.
- [ ] Record timestamps, environment, result, and evidence for each completed verification section.

---

## 2. What is already implemented

These are repository capabilities, not a claim that each is configured or passing in the owner's live environment.

### 2.1 Application screens and flows

- [x] Landing, onboarding, login, guest/demo experience, dashboard, Explore, opportunity details.
- [x] Saved opportunities, calendar, comparison, profile, document checklist, notifications, settings.
- [x] Privacy, terms, offline fallback, account callback, password reset pages.
- [x] Supabase email/password account flow and guest/demo mode.
- [x] Local state persistence for selected user preferences and guest data.
- [x] Supported profile data migration consent flow.

### 2.2 Data and search

- [x] Opportunity ingestion adapters for jobs, internships, scholarships, selected schemes, and government listings.
- [x] Source URL validation and stable record identity.
- [x] Gemini extraction for selected source HTML and Gemini 768-dimensional embeddings.
- [x] pgvector semantic search, PostgreSQL full-text search, and text/demo fallbacks.
- [x] Deterministic eligibility comparisons and visible reason data.
- [x] Opportunity freshness information and source links.
- [x] Crawl run and per-source log tables/code paths.

### 2.3 Account tools and PWA

- [x] User-scoped profile, saved item, notification, and push subscription API paths.
- [x] Daily deadline reminder route and optional web push sender.
- [x] Service worker caches bounded public opportunity responses and does not cache account-specific API results.
- [x] Offline shell and query retry behavior.
- [x] Read-only Playwright snapshot worker for selected JavaScript-heavy pages.

### 2.4 Existing verification evidence that must not be mistaken for final sign-off

The companion roadmap records previous typecheck, lint, service-worker syntax, and production build checks. It also records an earlier manual ingestion/search smoke run. Those results are useful history, but they do **not** prove that:

- the current Supabase project has the migrations applied;
- the present provider keys work;
- scheduled jobs are executing in production;
- every browser interaction works;
- every source record is correct;
- the current deployment is healthy.

The tasks below are still required for owner-side confirmation.

---

## 3. Before starting: make a safe project copy

### 3.1 Confirm the working project

- [ ] Open the project folder `C:\Users\HELLO_VISHU\Downloads\Major 1\project-share`.
- [ ] Confirm that `README.md`, this file, `TODO-Roadmap.md`, `package.json`, `supabase/`, and `scripts/live-scraper/` are present.
- [ ] Read [`README.md`](./README.md) once for the project architecture and terminology.
- [ ] Read [`TODO-Roadmap.md`](./TODO-Roadmap.md) for the prior implementation status and remaining known limitations.
- [ ] Confirm whether this folder is connected to the intended Git repository. The previous workspace review reported no Git metadata in the working folder, so verify rather than assume.

### 3.2 Create a recoverable checkpoint

- [ ] Initialize or connect the project to the correct private Git repository if that has not already been done.
- [ ] Add and review the files to be tracked. Confirm `.env.local`, build output, local snapshots, and secrets are ignored.
- [ ] Confirm `.env.example` is included and contains placeholders only.
- [ ] Commit a clean baseline before making the visual changes.
- [ ] Record the baseline commit identifier here: `________________________________`.
- [ ] If Git cannot be used, create a dated backup copy in a safe location before changing files.

### 3.3 Confirm current dependencies and prerequisites

- [ ] Install/use Node.js 22 or later.
- [ ] Confirm npm is available in PowerShell.
- [ ] If using the optional Playwright renderer, follow `scraper/README.md` to install its Python and Playwright dependencies separately.
- [ ] Do not start the Playwright setup unless rendered-page review is needed; it is not required to run the web app.

---

## 4. Configure Supabase

> Do this first against a development/test Supabase project. Apply database changes to production only after reviewing and confirming the target.

### 4.1 Collect the project credentials

- [ ] Open the intended Supabase project.
- [ ] Open **Project Settings → API**.
- [ ] Copy the project URL.
- [ ] Copy the browser-safe anon/publishable key.
- [ ] Copy the service-role key into a secure password manager or deployment secret store. Do not put it in a frontend setting or share it.
- [ ] Record only the project reference/name (not keys) here: `________________________________`.

### 4.2 Apply schema and migrations

- [ ] Confirm whether the database is new or already contains project data.
- [ ] For a new database, open and review `supabase/schema.sql` before running it.
- [ ] Run the base schema once against the intended project.
- [ ] Check the Supabase migration history or current schema to see which incremental migrations are already applied.
- [ ] Review `supabase/migrations/20261115000000_search_vector.sql` before executing it.
- [ ] Apply that migration if it is not already applied.
- [ ] Review `supabase/migrations/20261115000002_ingestion_push.sql` before executing it. Pay special attention to duplicate consolidation and cleanup statements.
- [ ] Apply that migration if it is not already applied.
- [ ] Do not blindly rerun migrations to clear an error. Determine the current schema state first.
- [ ] Record migration dates/results: `________________________________`.

### 4.3 Confirm tables, functions, and indexes

In Supabase Table Editor / Database tools, verify the expected objects:

- [ ] `sources`
- [ ] `crawl_runs`
- [ ] `crawl_source_runs`
- [ ] `opportunities`
- [ ] `eligibility_rules`
- [ ] `required_documents`
- [ ] `application_steps`
- [ ] `opportunity_embeddings`
- [ ] `profiles`
- [ ] `saved_opportunities`
- [ ] `notifications`
- [ ] `push_subscriptions`
- [ ] `user_documents` (checklist metadata schema only; this is not a file-storage setup)
- [ ] `match_opportunities` function with the expected 768-dimension input.
- [ ] `handle_new_user` function and auth-user profile trigger.
- [ ] Full-text generated `search_vector` column and GIN index after the migration.
- [ ] Unique source URL index and notification dedupe constraint after the migrations.

### 4.4 Verify Row Level Security

- [ ] Confirm RLS is enabled on user-owned tables.
- [ ] Confirm public read policies exist only for intended public catalogue/source records.
- [ ] Confirm crawl log access is restricted to the service role.
- [ ] Confirm profile access is scoped to the authenticated profile ID.
- [ ] Confirm saved rows, notifications, push subscriptions, and checklist rows are scoped to their owner.
- [ ] Use two disposable accounts, User A and User B, to verify that A cannot view, update, or delete B's records.
- [ ] Confirm anonymous access cannot write catalogue or user-owned records.
- [ ] Record any policy gap and resolve it before production launch.

### 4.5 Configure Supabase Auth URLs

- [ ] Open **Authentication → URL Configuration**.
- [ ] Set the local development site URL if needed.
- [ ] Add the exact local callback/reset redirect URLs used by this app.
- [ ] Add the production HTTPS origin and callback/reset URLs after the production host is known.
- [ ] Remove wildcard or obsolete redirects that are not needed.
- [ ] Verify email/password sign-in is enabled if the app will offer account login.
- [ ] If email confirmation is enabled, test the complete confirmation link in the target environment.

---

## 5. Configure local environment variables

### 5.1 Create the local environment file

- [ ] In the repository root, copy `.env.example` to `.env.local` if `.env.local` does not already exist.
- [ ] Confirm `.env.local` is excluded by `.gitignore`.
- [ ] Do not paste real values into this markdown file or commit them.

### 5.2 Fill the local Supabase and model settings

- [ ] Set `NEXT_PUBLIC_SUPABASE_URL` to the development Supabase project URL.
- [ ] Set `NEXT_PUBLIC_SUPABASE_ANON_KEY` to its anon/publishable key.
- [ ] Set `SUPABASE_SERVICE_ROLE_KEY` to that project's service-role key. This is server-only.
- [ ] Create/check a Google AI Studio API key and set `GEMINI_API_KEY`.
- [ ] If using optional natural-language query parsing and generated explanations, set `GROQ_API_KEY`.
- [ ] Set `NEXT_PUBLIC_APP_URL=http://localhost:3000` for local development.
- [ ] Leave production `CRON_SECRET` out of local development unless testing the protected route intentionally.
- [ ] Leave VAPID values blank until push testing is planned.
- [ ] Check for accidental spaces, quotes, stale project URLs, or placeholder values.
- [ ] Restart the development server after changing environment values.

### 5.3 Confirm the selected model IDs

- [ ] Confirm the repository uses `gemini-3.6-flash` for supported extraction calls.
- [ ] Confirm embeddings use `gemini-embedding-001` at 768 dimensions for both stored content and search queries.
- [ ] Confirm Groq calls use `openai/gpt-oss-20b` where the optional Groq integration is used.
- [ ] If a provider reports a retired/unavailable model, consult the official provider deprecation/model docs before editing the identifier.
- [ ] After any model change, verify extraction, embedding, and query response formats in a safe environment.

---

## 6. Install, run, and inspect locally

### 6.1 Install dependencies and start the server

- [ ] Open PowerShell in the project folder.
- [ ] Run `npm ci` and wait for it to complete.
- [ ] Run `npm run dev`.
- [ ] Open `http://localhost:3000` in a browser.
- [ ] Check the terminal and browser console for startup/runtime errors.
- [ ] Confirm the landing page loads and internal navigation does not produce a 404.
- [ ] Confirm the page works if optional model credentials are absent (demo/fallback mode).

### 6.2 Run existing repository checks

Run these after code or visual changes and save the output:

- [ ] Run `npm run typecheck`.
- [ ] Run `npm run lint`.
- [ ] Run `node --check public/sw.js`.
- [ ] Run `npm run build`.
- [ ] If the Windows sandbox reports an `EPERM` creating Next.js generated files, record the full error and rerun in an approved local environment; do not silently mark the build as passed.
- [ ] Resolve actual type, lint, syntax, or build failures before proceeding.
- [ ] Record date, Node/npm versions, command, and result in [the evidence log](#17-evidence-and-sign-off-log).

### 6.3 Run the app as guest/demo

- [ ] Use the guest/demo entry from login.
- [ ] Confirm guest navigation reaches the dashboard.
- [ ] Confirm the user can open Explore and view demo or live catalogue results.
- [ ] Confirm a detail route loads when a result is opened.
- [ ] Confirm the product clearly distinguishes demo fallback from live catalogue results wherever applicable.

---

## 7. Run and review the live ingestion pipeline

> Ingestion writes database rows and embeddings. Start against a test project, check its URL twice, and only then decide whether a production run is appropriate.

### 7.1 Pre-run checks

- [ ] Confirm the local `.env.local` points to the intended development/test project.
- [ ] Confirm `SUPABASE_SERVICE_ROLE_KEY` belongs to the same project URL.
- [ ] Confirm required schema and migrations are applied.
- [ ] Confirm `GEMINI_API_KEY` is valid and provider quota is available.
- [ ] Check the current source websites/feeds are reachable and that collection is appropriate under their current terms and usage policies.
- [ ] Note current active opportunity counts so additions/updates/deactivations can be understood.

### 7.2 Run the manual ingestion command

- [ ] From the repository root, run:

  ```bash
  npx tsx scripts/live-scraper/run.ts
  ```

- [ ] Wait for the process to finish; do not close the terminal during the run.
- [ ] Save the final summary without saving or sharing secret values.
- [ ] Record fetched count, deduplicated count, inserted, updated, skipped, embedding count, errors, deactivated count, and duration.

### 7.3 Inspect every source group

The current TypeScript orchestrator runs five grouped adapters:

- [ ] MyScheme.
- [ ] Internshala.
- [ ] Government sources (RSS and selected HTML portals).
- [ ] Scholarship sources (NSP and Buddy4Study adapters).
- [ ] Private jobs (currently shared with the Internshala/private-jobs adapter).

For each group:

- [ ] Inspect status: succeeded, empty, partial, or failed.
- [ ] Inspect record count and any source error message.
- [ ] If empty, distinguish a genuine empty response from a changed endpoint, blocked request, parser failure, timeout, or extraction problem.
- [ ] If partial/failed, do not treat the whole run as a clean refresh.
- [ ] Check Supabase `crawl_runs` and `crawl_source_runs` for the recorded run.
- [ ] Confirm stale records were not deactivated after a partial/failed source run or sync failure.

### 7.4 Review representative records

Sample records from each source group and compare each field with its source page:

- [ ] Title and issuing authority.
- [ ] Opportunity type.
- [ ] Description and location.
- [ ] Deadline or explicit absence of a known deadline.
- [ ] Application link and source URL.
- [ ] Eligibility text/rules, degree, category, state, income, experience, and skills where present.
- [ ] Salary/amount and vacancy count where present.
- [ ] Tags and trust status.
- [ ] `last_verified_at`, active status, and extraction confidence.
- [ ] Check for duplicates, malformed URLs, obvious invented details, or stale/closed listings.
- [ ] Correct/remove bad records before inviting users.

### 7.5 Playwright snapshots (optional manual review)

- [ ] Decide whether JavaScript-heavy sources need manual rendered-page inspection.
- [ ] If yes, install the documented Python/Playwright requirements from `scraper/README.md`.
- [ ] Run only the sources intended for review, for example `python scraper/render_worker.py --sources ncs ssc`.
- [ ] Inspect the snapshots manually.
- [ ] Remember snapshots are not automatically imported into Supabase; do not assume they changed catalogue data.
- [ ] Keep local snapshots private if they contain unexpected personal or sensitive page content.

---

## 8. Enable and verify semantic search

### 8.1 Confirm embeddings

- [ ] Count rows in `opportunity_embeddings` in the intended Supabase project.
- [ ] Confirm the expected records have non-null embeddings.
- [ ] Confirm embeddings have 768 dimensions.
- [ ] Confirm stored vectors were generated with `gemini-embedding-001`.
- [ ] Confirm query embedding calls use that same model and dimension.
- [ ] Check that embedding row IDs correctly reference active opportunities.

### 8.2 Enable the vector index

- [ ] Wait until there are at least approximately 100 usable embedding rows before applying the provided IVFFlat recommendation.
- [ ] Open and review `supabase/enable-vector-index.sql`.
- [ ] Confirm its operator class is cosine distance (`vector_cosine_ops`) and its table/column names match the current schema.
- [ ] Run the SQL in the intended Supabase project.
- [ ] Run/analyze as directed by the SQL script and confirm the index exists.
- [ ] Do not change index parameters without recording and testing the reason.

### 8.3 Verify live search paths

- [ ] Run `npx tsx scripts/live-scraper/verify-search.ts`.
- [ ] Open the app's Explore page and search `fullstack`.
- [ ] Search `banking`.
- [ ] Search `railway`.
- [ ] Record returned titles, result count, and source marker (`vector`, `fulltext`, or `demo`).
- [ ] Confirm live semantic result behavior is used when vectors, Gemini, Supabase, and the match RPC are all available.
- [ ] Confirm full-text search still works for a relevant exact phrase.
- [ ] Confirm text fallback works when full-text results are not available.
- [ ] In a safe test setup, verify the demo path remains usable when live services are not configured.
- [ ] Open search results and verify source, deadline, freshness, and opportunity detail data.
- [ ] Do not label a demo response as proof of live search.

---

## 9. Review source data and trust

### 9.1 Source authorization and stability

- [ ] Review the current terms/robots/access rules for every configured source before a production crawl.
- [ ] Confirm permitted request rates and attribution requirements.
- [ ] Confirm there is no attempt to bypass login, paywall, CAPTCHA, or another technical restriction.
- [ ] Confirm each application URL resolves over HTTPS and points to the intended source or authorized destination.
- [ ] Review redirects and external hosts for unexpected changes.
- [ ] Keep a dated source review record and the reviewer name.

### 9.2 Trust and freshness labels

- [ ] Verify that `.gov.in`, `.nic.in`, or `.ac.in` domain handling is not described as a blanket accuracy guarantee.
- [ ] Keep aggregator listings clearly unverified unless a person has checked the authority and underlying notice.
- [ ] Check relative freshness labels and stale-data warnings in Explore, detail, saved, and compare views.
- [ ] Confirm a fresh scrape is described as “last checked/updated,” not “guaranteed current.”
- [ ] Ensure the source page is reachable from every listing detail page.

### 9.3 Eligibility and deadline quality

- [ ] Compare each normalized deadline against the authoritative source notice.
- [ ] Check date format, year, time zone, and any extension/corrigendum.
- [ ] Leave deadline unknown when the source does not provide a reliable date; do not fill one by guess.
- [ ] Compare normalized age/income/category/education/state/experience requirements to the notice.
- [ ] Check whether relaxation, domicile, gender, disability, or document conditions are omitted by the current schema.
- [ ] Keep eligibility copy advisory and direct the user to the official notice.
- [ ] Record incorrect/missing data and remove or correct affected records before launch.

---

## 10. Refresh the existing UI

> This is the only planned visual/product-facing refinement. Keep the existing screens, content, routes, and capabilities. Do not add new features as part of this redesign.

### 10.1 Define a small visual system before editing pages

- [ ] Review all current screens and record their existing layout and key interactions before changing styles.
- [ ] Select a restrained color palette with strong contrast and clear status colors.
- [ ] Define a consistent type scale, font weights, line height, and heading hierarchy.
- [ ] Define consistent spacing, content widths, responsive breakpoints, border radii, and elevation/shadow tokens.
- [ ] Define consistent button, input, select, filter chip, card, modal, toast, and navigation patterns using the components already present where possible.
- [ ] Use glassmorphism selectively: translucent panels, subtle background blur, delicate borders, and modest shadows.
- [ ] Keep text and controls legible over every background; do not sacrifice accessibility for translucency.
- [ ] Prefer a rich but minimal visual result: clear hierarchy, generous whitespace, restrained accent colors, and no unnecessary decoration.
- [ ] Check `prefers-reduced-motion`; transitions must be subtle and must not be required to understand the interface.
- [ ] Ensure disabled, loading, empty, error, hover, focus, selected, and success states are visually distinct.
- [ ] Keep dark/light theme behavior consistent with the existing settings/provider behavior.

### 10.2 Redesign existing screens (appearance only)

- [ ] Landing page: improve visual hierarchy, hero, navigation, call-to-action, and existing feature explanation without changing claims or adding features.
- [ ] Onboarding: make the existing steps, field labels, validation, and progress easier to scan.
- [ ] Login: distinguish the existing guest and account actions clearly; preserve existing auth behavior.
- [ ] Dashboard: refine existing summary/recommendation cards and spacing; do not invent new dashboard widgets.
- [ ] Explore: improve search/filter controls, result cards, empty/loading/error states, freshness badge, and responsive layout.
- [ ] Opportunity detail: establish clear hierarchy for title, authority, eligibility reasons, deadline, source, documents, steps, and existing actions.
- [ ] Saved: improve list readability and status presentation while preserving save/remove/status behavior.
- [ ] Calendar: make existing dates and deadline states readable at mobile and desktop widths.
- [ ] Compare: align fields consistently and preserve the existing comparison content.
- [ ] Profile: improve form grouping and field readability without adding profile fields.
- [ ] Documents: clearly present this as an existing checklist, not uploaded file storage.
- [ ] Notifications: distinguish unread/read, deadline reminders, and empty state visually.
- [ ] Settings: clarify existing controls and destructive actions while keeping the current settings set.
- [ ] Privacy, terms, offline, loading, and error screens: align typography, spacing, and shared shell styling.
- [ ] Shared navigation and shell: make active route, account/guest state, and mobile navigation obvious.

### 10.3 Responsive, accessibility, and content quality

- [ ] Inspect widths around 320–375 px, 768 px, 1024 px, and desktop widescreen.
- [ ] Verify no horizontal overflow on Explore, detail, compare, calendar, and forms.
- [ ] Confirm keyboard navigation and visible focus indicator for all interactive controls.
- [ ] Confirm labels are associated with inputs and icons have accessible names or decorative semantics.
- [ ] Check text contrast, especially on translucent surfaces and muted helper text.
- [ ] Ensure important information is not conveyed by color alone.
- [ ] Check zoom at 200% without losing controls or content.
- [ ] Check reduced-motion mode and high-contrast/forced-colors behavior where available.
- [ ] Preserve wording that explains source freshness, demo/live state, and advisory match status.
- [ ] Remove no existing capability or action as a side effect of style work.

### 10.4 Review the visual redesign

- [ ] Capture before/after screenshots for the same screens and viewport sizes.
- [ ] Ask at least one reviewer to inspect the refreshed design on a phone and desktop.
- [ ] Check that the visual treatment is consistent across all routes, not only the landing page.
- [ ] Check that glass effects do not cause unreadable card content or poor performance on lower-powered devices.
- [ ] Fix UI regressions before deployment.
- [ ] Run typecheck, lint, and build after the visual work.

---

## 11. Verify every existing feature

> Complete this section with a development/test account and environment first, then repeat the applicable checks in production. Record pass/fail/blocked plus evidence for each case. A feature is not verified just because its page renders.

### 11.1 Landing, navigation, onboarding, and guest flow

- [ ] Load `/` directly and through a refresh.
- [ ] Follow every landing navigation link.
- [ ] Start onboarding and complete each existing step with valid values.
- [ ] Try invalid, missing, boundary, and corrected form values.
- [ ] Confirm the data shown on the next screen matches what was entered.
- [ ] Open login and choose guest/demo.
- [ ] Confirm guest mode reaches the dashboard without a redirect loop.
- [ ] Refresh on an application route and use browser back/forward.
- [ ] Confirm loading, not-found, and error states do not break navigation.

### 11.2 Authentication and account lifecycle

Use a disposable email account and the configured test Supabase project:

- [ ] Create a new account.
- [ ] If confirmation is enabled, open the email link and verify the callback route.
- [ ] Confirm a profile row is created for the new account.
- [ ] Sign out, then sign in with the correct password.
- [ ] Try an incorrect password and verify the error is understandable without revealing sensitive account state.
- [ ] Request a password reset.
- [ ] Open the reset email link and set a new password.
- [ ] Sign in with the new password.
- [ ] Sign out and confirm account-only screens/APIs no longer use the prior session.
- [ ] Test account deletion only on the disposable account.
- [ ] Confirm the account and dependent user data are removed or handled as intended.
- [ ] Confirm deletion errors are visible and do not falsely report success.

### 11.3 Profile and consent flow

- [ ] Edit supported profile fields while in guest mode.
- [ ] Refresh and confirm intended local persistence.
- [ ] Sign in with a fresh test account.
- [ ] Confirm profile migration consent appears when applicable.
- [ ] Decline consent and confirm local profile data is not uploaded.
- [ ] Approve consent in a separate disposable test and confirm only supported/allowlisted fields sync.
- [ ] Update a field and confirm the account profile reflects it.
- [ ] Clear or sign out and verify account data is not accidentally exposed to another session.
- [ ] Confirm sensitive fields are not sent to a model API without an explicit product reason.

### 11.4 Dashboard and recommendations

- [ ] Load dashboard in guest mode.
- [ ] Load dashboard with a test profile and live catalogue.
- [ ] Confirm displayed recommendations link to valid detail routes.
- [ ] Confirm deadline totals and saved-item counts use the expected records.
- [ ] Confirm empty, loading, no-profile, no-data, and expired-deadline states render clearly.
- [ ] Confirm recommendations do not label a score as a probability or official approval.

### 11.5 Explore, search, and filters

- [ ] Search for `fullstack`, `banking`, and `railway` against live data.
- [ ] Record whether each used `vector`, `fulltext`, or `demo`.
- [ ] Search a phrase that should return a literal full-text result.
- [ ] Search a semantically related phrase that does not repeat the exact title wording.
- [ ] Try a one-character query, empty query, 200-character query, and >200-character query.
- [ ] Confirm validation and rate-limit behavior are reasonable.
- [ ] Exercise each existing filter individually and in combination: type, category, education, location, degree, and deadline-related UI options where present.
- [ ] Clear filters and confirm results return to the unfiltered state.
- [ ] Confirm no-results, API-error, live-data, demo-data, and offline states are distinct.
- [ ] Confirm low-data mode reduces returned content/count as implemented.
- [ ] Confirm pagination/limits do not exceed the endpoint cap.
- [ ] Check keyboard use of the search box, clear controls, filter menus, and result cards.

### 11.6 Opportunity detail and explanation

- [ ] Open a live opportunity by clicking a result.
- [ ] Open a demo opportunity by direct route if demo data is intended to support it.
- [ ] Check title, type, authority, description, date, location, amount, vacancy, and tags against the catalogue record.
- [ ] Confirm required documents and steps are ordered and readable when available.
- [ ] Confirm eligibility reasons distinguish matched, failed, and missing information.
- [ ] Confirm freshness/stale warning is visible and understandable.
- [ ] Open the source and application links; confirm HTTPS and expected destination.
- [ ] Test share sheet on a supported device/browser; test copy-link fallback where applicable.
- [ ] Request the plain-language explanation with Groq configured.
- [ ] Repeat with Groq absent/unavailable and confirm factual fallback works.
- [ ] Ensure explanation includes the source link and does not make up requirements.
- [ ] Confirm unknown dates are not rendered as invented deadlines.

### 11.7 Eligibility and ranking

Use test-only profiles/listings or reviewed sample records:

- [ ] Test age below, within, and above a defined age range.
- [ ] Test missing date of birth.
- [ ] Test income below, equal to, and above the cap; test missing/zero income behavior.
- [ ] Test category allowed, not allowed, and missing.
- [ ] Test education exact match, non-match, and missing.
- [ ] Test degree and branch substring match and non-match.
- [ ] Test experience below, within, above, and missing.
- [ ] Test state match, mismatch, missing state, and Pan-India rule.
- [ ] Test required skills exact match, no match, and missing skills.
- [ ] Confirm the eligible/partial/no-match state and reason list agree with the current rules implementation.
- [ ] Confirm score is presented as an indicator, not a percentage probability.
- [ ] Check an education hierarchy search filter separately from exact eligibility logic.
- [ ] Confirm all user-facing copy says to verify the official notice.

### 11.8 Saved opportunities, compare, and calendar

- [ ] Save a live opportunity as guest; refresh and confirm local behavior.
- [ ] Remove a saved opportunity.
- [ ] Save the same item twice and confirm there is no duplicate.
- [ ] Save as an authenticated user and confirm Supabase synchronization.
- [ ] Change a saved status if the UI supports it and confirm it persists.
- [ ] Sign in/out and confirm guest data/account data behavior is intentional.
- [ ] Add/remove items from comparison and verify fields align correctly.
- [ ] Add a saved deadline to calendar and verify displayed date/time.
- [ ] Check expired, no-deadline, empty, and many-item states.
- [ ] Confirm source/freshness warnings remain visible in saved and comparison views.

### 11.9 Documents checklist

- [ ] Add/check/uncheck the existing local checklist entries.
- [ ] Refresh and confirm the intended local persistence.
- [ ] Sign in/out and observe whether checklist data is local or account-synced; document actual behavior.
- [ ] Confirm the screen does not imply that files have been uploaded or securely stored.
- [ ] Do not test with real identity documents because no file vault is implemented.

### 11.10 Notifications and Web Push

- [ ] Load notifications with no records.
- [ ] Load notifications with a test account and records.
- [ ] Mark a notification read and confirm the state persists.
- [ ] Verify an account cannot read another account's notifications.
- [ ] With VAPID configured, grant notification permission and register a test subscription.
- [ ] Confirm a subscription is stored for the authenticated user.
- [ ] Send/test a push using the existing reminder path, not a new feature.
- [ ] Click the push and confirm the app opens/focuses the relevant route.
- [ ] Disable/remove the subscription and confirm the row is removed.
- [ ] Test a revoked/invalid subscription and confirm the app handles it without crashing.
- [ ] With VAPID unavailable or permission denied, confirm in-app notifications still behave as expected and the UI explains that push is unavailable.

### 11.11 Settings, privacy, terms, errors

- [ ] Test every existing setting and confirm the displayed value matches its effect.
- [ ] Change theme if supported and check all routes for contrast and persistence.
- [ ] Toggle low-data mode and check the effect on catalogue/search behavior.
- [ ] Open privacy and terms from their links and by direct URL.
- [ ] Check error and loading pages using a safe invalid route or simulated failure.
- [ ] Confirm destructive actions require clear user intent and report completion truthfully.

### 11.12 Offline and low-connectivity behavior

Use browser developer tools or a test device; do not infer offline behavior from online use:

- [ ] Open the app online once so the service worker can install and cache the shell.
- [ ] Confirm service worker registration succeeds in browser developer tools.
- [ ] Visit opportunity list/detail routes online to populate public response caches.
- [ ] Switch to offline mode and open the app shell.
- [ ] Open a cached public opportunity list/detail and note that it may be stale.
- [ ] Open an uncached route and confirm the offline page/fallback is useful.
- [ ] Try a search offline and confirm it queues only the public query, not the user profile.
- [ ] Reconnect and confirm queued searches retry without breaking the page.
- [ ] Inspect Cache Storage and confirm profile, saved, notification, and other account API responses are not cached.
- [ ] Verify low-data mode separately from offline mode; they are different settings/conditions.

### 11.13 API, health, and rate-limit checks

- [ ] Request `/api/health` and record status and reported checks.
- [ ] Confirm `/api/opportunities` returns bounded/paginated active catalogue data.
- [ ] Confirm `/api/opportunities/[id]` returns a valid record and a sensible not-found response for a missing ID.
- [ ] Send malformed JSON to the search/explain API in a safe test environment and confirm a controlled 400 response.
- [ ] Send invalid query/ID values and confirm validation rejects them.
- [ ] Exercise rate limiting enough to confirm it returns 429, without conducting a load test against a third-party provider.
- [ ] Confirm server logs do not print provider keys, service-role credentials, or private profile contents.

---

## 12. Security and privacy review

- [ ] Confirm `.env.local` is not tracked by Git.
- [ ] Confirm `.env.example` contains only placeholders.
- [ ] Search the source tree and Git history for accidental secrets before publication; rotate any exposed key immediately.
- [ ] Confirm service-role, Gemini, Groq, VAPID private, and cron secrets are server-side only.
- [ ] Confirm anon/publishable credentials are protected by RLS and cannot perform privileged writes.
- [ ] Re-run the two-user RLS checks from Section 4.4 after the final schema is applied.
- [ ] Confirm account routes use the current authenticated identity, not a user ID trusted from request JSON.
- [ ] Confirm profile fields accepted by the API are allowlisted and validated.
- [ ] Confirm API errors do not expose stack traces or internal secrets to the browser.
- [ ] Confirm third-party provider calls receive only the data needed for the requested function.
- [ ] Confirm source/application links are HTTPS and host-validated as implemented.
- [ ] Confirm arbitrary user-supplied URLs are not fetched by server routes.
- [ ] Confirm push subscription endpoints remain host-validated.
- [ ] Confirm account deletion behavior and database cascades in a disposable account.
- [ ] Confirm privacy and terms copy matches actual data handling, especially profile sync, notifications, logs, and offline caching.
- [ ] Do not claim document upload or encrypted document storage; that feature does not exist.

---

## 13. Configure production hosting

### 13.1 Repository and CI

- [ ] Connect the project to the intended private GitHub repository.
- [ ] Review the complete diff before pushing.
- [ ] Confirm `.github/workflows/ci.yml` is present and does not need secrets for its basic checks.
- [ ] Push to the intended branch.
- [ ] Open the GitHub Actions run and wait for install, typecheck, lint, and build jobs to finish.
- [ ] Fix failures and rerun; record the successful commit SHA.

### 13.2 Host configuration

- [ ] Create/import the project in the selected Next.js hosting provider.
- [ ] Confirm the correct repository and production branch.
- [ ] Confirm build/install commands match the repository (`npm ci` and `npm run build`, unless the host detects them correctly).
- [ ] Add production environment values from the secure checklist below.
- [ ] Set `NEXT_PUBLIC_APP_URL` to the exact production HTTPS origin.
- [ ] Configure the domain and HTTPS certificate.
- [ ] Add production origin/callback URLs to Supabase Auth before testing sign-in.
- [ ] Deploy a preview environment first.
- [ ] Run guest, sign-in, search, save, profile, and detail-page checks against preview.
- [ ] Promote/deploy production only after preview passes.

### 13.3 Production secret checklist

Set the following in the hosting provider's encrypted environment variable settings. Do not add these to GitHub source files.

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- [ ] `GEMINI_API_KEY`
- [ ] `GROQ_API_KEY` if the optional Groq flows will be enabled
- [ ] `CRON_SECRET`
- [ ] `NEXT_PUBLIC_APP_URL`
- [ ] `NEXT_PUBLIC_VAPID_PUBLIC_KEY` if Web Push will be enabled
- [ ] `VAPID_PRIVATE_KEY` if Web Push will be enabled; server-only
- [ ] `VAPID_EMAIL` if Web Push will be enabled
- [ ] `CRAWL_ALERT_WEBHOOK_URL` if repeated-source alerts will be enabled
- [ ] Confirm production and preview environments do not accidentally share a test service-role key or test webhook.
- [ ] Redeploy after changing provider environment variables if required by the host.

---

## 14. Configure scheduled jobs, alerts, and push

### 14.1 Choose a supported scraper schedule

- [ ] Review the current host's cron frequency and execution-time limits at the time of deployment.
- [ ] Note that the repository currently declares the scraper schedule `0 */6 * * *` and notifications schedule `30 3 * * *`.
- [ ] If using Vercel Hobby, do not deploy the six-hour schedule unchanged: Hobby cron supports at most once per day.
- [ ] Choose one: a plan that supports six-hour cron, a daily schedule, or an external scheduler.
- [ ] Record the chosen cadence and the reason here: `________________________________`.
- [ ] Confirm the selected runtime can safely finish the scraper. The handler requests up to 300 seconds; an earlier run was about 220 seconds, which is historical and not a runtime guarantee.
- [ ] If it cannot finish safely, do not rely on the schedule until the existing ingestion job is run on a suitable worker/runtime.

### 14.2 Protect and test the cron endpoints

- [ ] Generate a long random `CRON_SECRET` using a password manager or secure generator.
- [ ] Add the same secret to the host environment.
- [ ] Confirm cron calls use `Authorization: Bearer <CRON_SECRET>`.
- [ ] Send an unauthorized test request and confirm the route rejects it.
- [ ] Run a controlled authorized scrape request and inspect the response and crawl log.
- [ ] Run a controlled authorized notification request and inspect created deduplicated records.
- [ ] Confirm the actual scheduler shows successful invocations and failures.
- [ ] Configure alerting/monitoring for failed or timed-out jobs; do not assume automatic retries.

### 14.3 Optional crawl webhook alerts

- [ ] Decide whether the owner wants repeated crawl issue alerts.
- [ ] Create an HTTPS incoming webhook in the chosen Slack/Discord-compatible service.
- [ ] Store it only in `CRAWL_ALERT_WEBHOOK_URL` server-side.
- [ ] Confirm the webhook is for the intended channel and does not expose sensitive user data.
- [ ] Trigger or simulate a safe repeated source issue in a non-production environment.
- [ ] Confirm a repeated unhealthy source can send an alert and a one-time issue does not create unexpected noise.
- [ ] Confirm webhook delivery failure does not fail the ingest operation.

### 14.4 Optional Web Push setup

- [ ] Decide whether browser push is part of this launch; it is optional.
- [ ] Run `npx web-push generate-vapid-keys` in a safe terminal if new keys are needed.
- [ ] Store the public key as `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.
- [ ] Store the private key as `VAPID_PRIVATE_KEY` only in local/host server secrets.
- [ ] Set `VAPID_EMAIL` to a valid contact URI.
- [ ] Confirm all three values are from the same VAPID pair.
- [ ] Test subscription, delivery, click-through, disable/removal, and invalid endpoint cleanup with a disposable user/browser.
- [ ] If push will not be configured, verify the app still works and in-app reminders remain understandable.

---

## 15. Verify production after deployment

### 15.1 Production smoke pass

- [ ] Open the HTTPS production domain on desktop and phone.
- [ ] Confirm certificate/security indicator and canonical app URL.
- [ ] Open `/api/health` and record the response.
- [ ] Load the landing page and enter guest mode.
- [ ] Sign in with a disposable production test account.
- [ ] Confirm auth callback and profile load.
- [ ] Search live opportunities and confirm the source is not `demo` when live integration is expected.
- [ ] Open a result and verify source link, details, deadline, freshness, and match explanation.
- [ ] Save the item, sign out/in, and confirm expected sync.
- [ ] Test notification/reminder behavior and push only if it is configured.
- [ ] Test offline shell and a previously cached public opportunity.
- [ ] Check production server logs for errors and secret leakage.

### 15.2 Production data verification

- [ ] Confirm current `crawl_runs` rows are being written by the production runtime.
- [ ] Confirm each configured source reports a meaningful status.
- [ ] Confirm embedding count is increasing/maintained as expected.
- [ ] Confirm new records have stable IDs, source URLs, and timestamps.
- [ ] Confirm stale-record deactivation did not deactivate records after a partial or failed source run.
- [ ] Compare a sample of live records to original source pages after deployment.

### 15.3 Account isolation and privacy verification

- [ ] Use two disposable production accounts if permitted by the privacy policy.
- [ ] Verify neither account can retrieve the other's profile, saved records, notifications, or push subscription.
- [ ] Verify unauthenticated API requests cannot mutate account data.
- [ ] Verify service-role credentials are absent from all browser bundles and network responses.
- [ ] Verify browser Cache Storage contains no account-specific API responses.
- [ ] Delete disposable test accounts and confirm deletion behavior.

### 15.4 Confirm operational limits

- [ ] Observe at least one scheduled scrape run and one scheduled notification run.
- [ ] Confirm scrape completes before the runtime limit.
- [ ] Confirm selected cron cadence is accepted by the plan.
- [ ] Confirm failures are visible to the owner and have a response procedure.
- [ ] Confirm source issue alerts go to the intended channel if enabled.
- [ ] Confirm model/provider quotas and billing limits are understood.

---

## 16. Final release checklist

Do not call the project finalized until every applicable line is checked or explicitly marked not applicable with a reason.

### Product and scope

- [ ] Scope remained frozen; no unrequested feature expansion was added.
- [ ] Existing UI was refreshed consistently across all routes.
- [ ] Glassmorphism is restrained and does not reduce readability, performance, or accessibility.
- [ ] No existing interaction was removed or changed accidentally.
- [ ] Demo/live data is distinguishable.
- [ ] Eligibility remains advisory and source-linked.
- [ ] The Documents screen is described as a checklist, not a file vault.

### Engineering quality

- [ ] `npm run typecheck` passes.
- [ ] `npm run lint` passes.
- [ ] `node --check public/sw.js` passes.
- [ ] `npm run build` passes in the chosen build environment.
- [ ] GitHub Actions passes on the final release commit.
- [ ] Every manual feature test is recorded as pass, fail, or blocked.
- [ ] Known issues and limitations are written down; no failures are hidden.

### Data and services

- [ ] Supabase migrations and RLS policies are checked in the correct project.
- [ ] Current ingestion source results have been inspected.
- [ ] Live vector search and fallback search have been checked.
- [ ] Vector index configuration has been reviewed/applied where appropriate.
- [ ] Source links, deadlines, freshness, and eligibility data have been sampled.
- [ ] Provider secrets and model IDs are configured and verified.
- [ ] Cron frequency/duration is supported and at least one run has been observed.
- [ ] Push/webhook settings have been tested if enabled.

### Launch communication

- [ ] Privacy and terms pages reflect the deployed behavior.
- [ ] The public description accurately states the current MVP scope.
- [ ] Users are told to verify deadlines and rules with the original source.
- [ ] No claim says the app guarantees eligibility or makes applications.
- [ ] Owner knows how to monitor scheduled jobs and respond to a failed ingestion.

---

## 17. Evidence and sign-off log

Use this table to record what was actually checked. Link to private evidence only if it does not contain credentials or personal data.

| Date/time | Environment | Task/check | Result (Pass / Fail / Blocked / N/A) | Evidence or issue reference | Owner initials |
|---|---|---|---|---|---|
|  |  | Supabase schema and migrations |  |  |  |
|  |  | RLS with two test users |  |  |  |
|  |  | Local install and app startup |  |  |  |
|  |  | Typecheck / lint / build |  |  |  |
|  |  | Live ingestion and source logs |  |  |  |
|  |  | Data/source review |  |  |  |
|  |  | Vector and fallback search |  |  |  |
|  |  | UI redesign review |  |  |  |
|  |  | Guest/demo flow |  |  |  |
|  |  | Authentication and password reset |  |  |  |
|  |  | Profile consent/sync |  |  |  |
|  |  | Saved/compare/calendar |  |  |  |
|  |  | Eligibility and explanation |  |  |  |
|  |  | Notifications and push (if enabled) |  |  |  |
|  |  | Offline and low-data behavior |  |  |  |
|  |  | Production deployment smoke pass |  |  |  |
|  |  | Cron/scheduler run |  |  |  |
|  |  | Final privacy and release review |  |  |  |

### Release decision

- [ ] Ready for controlled launch.
- [ ] Not ready; outstanding blockers are listed below.

**Outstanding blockers / known issues:**

```text


```

**Final review date:** `____________________`  
**Reviewed by:** `__________________________`  
**Release commit/deployment:** `_____________`

---

## 18. Existing references

- [`README.md`](./README.md) — full technical and viva handbook.
- [`TODO-Roadmap.md`](./TODO-Roadmap.md) — current implementation status and prior repository review.
- [`CareerCompass-Project-Blueprint.md`](./CareerCompass-Project-Blueprint.md) — original full product vision; future concepts in that file are outside this frozen-scope checklist unless they already exist in the current app.
- [`supabase/schema.sql`](./supabase/schema.sql) — base schema, policies, trigger, and vector function.
- [`supabase/migrations/`](./supabase/migrations/) — incremental database changes.
- [`supabase/enable-vector-index.sql`](./supabase/enable-vector-index.sql) — optional vector index script.
- [`scripts/live-scraper/`](./scripts/live-scraper/) — ingestion and search verification scripts.
- [`scraper/README.md`](./scraper/README.md) — optional Playwright renderer setup.

---

## Final note

This file is a manual owner checklist, not proof that the listed work has already been done. Work through it in order, document the real result, and only mark an item complete after verifying it in the intended environment. Keep the feature scope unchanged; finish configuration, visual consistency, data review, and verification of the application that already exists.
