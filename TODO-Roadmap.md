# CareerCompass implementation roadmap

Updated 2026-11-15 after a repository review against `CareerCompass-Project-Blueprint.md`. The `Scrapeability-Audit.md` cited in the project handoff is not present in this workspace, so its source-by-source claims remain unverified.

## Implemented in the repository

### Application and accounts

- Next.js 16 app shell and responsive screens for onboarding, dashboard, Explore, opportunity details, saved items, calendar, compare, profile, document checklist, notifications, settings, privacy, and terms.
- Guest/demo mode and Supabase email/password sign-in, sign-up, callback, password-reset request, password reset page, sign-out, and self-service account deletion.
- Allowlisted profile API validation and user-scoped Supabase writes. Saved items now sync with Supabase when signed in while failed/demo records remain available locally.
- Guest profile data is not uploaded automatically. A signed-in user sees a consent prompt before supported local profile fields are sent to their account.
- The Documents area is a checklist, not a file vault. It does not upload or store sensitive application documents.
- In-app notifications sync with the signed-in user account. Push subscription registration/removal is authenticated and user-scoped.
- Opportunity explanations resolve live Supabase records as well as demo records; the generated explanation is bounded to stored facts and always appends the source listing. Detail-page share uses the native share sheet where available and copies the page URL otherwise. External application/source links are restricted to HTTPS before rendering.
- Dashboard deadline counts and Notifications now resolve each saved opportunity through the catalogue service, so live records work alongside demo records. Local deadline alerts are generated from those resolved records.

### Data, ingestion, and search

- Scrapers and normalization for government jobs, private jobs, scholarships, internships, and MyScheme.
- Read-only Playwright renderer for JavaScript-heavy NCS, SSC, UPSC, and myScheme pages; snapshots are saved locally for review and never written to the database automatically.
- Stable source URL identity, safe HTTPS/source URL validation, no invented deadlines, batched embeddings, and stale-record deactivation only for sources returning records in the run.
- Crawl run/source log persistence is implemented in the orchestrator and schema. HTTP, timeout, and extraction exceptions are reported; a successful response with an empty/malformed payload can still look like an empty source result.
- Hybrid vector and full-text search with ILIKE fallback, API rate limiting, bounded opportunity pagination, and Explore freshness display.
- Relative verification age and stale-data warnings appear in Explore, opportunity details, saved items, and comparison.
- Low-data mode is a local preference that reduces catalogue and semantic-search result counts and shortens listing summaries.
- Source scrapers report HTTP, timeout, and extraction failures into the crawl log. Partial/failed source runs and sync failures prevent stale-record deactivation.
- Optional crawl alerts post to a configured HTTPS Slack/Discord-style webhook when a source is failed, partial, or empty in two consecutive recorded runs. Delivery failures are logged and do not fail ingestion.
- Operational database migration files define search-vector support, duplicate consolidation, source URL uniqueness, crawl logs, notification deduplication, and push subscriptions.
- Opportunity list responses are capped and paginated; the main app client currently fetches up to 200 rows at a time.

### Reminders and PWA

- Daily deadline notification job creates deduplicated in-app reminders for saved items closing in 7 or 1 days and sends Web Push to registered devices when VAPID is configured.
- Expired push endpoints are removed. Push endpoints are restricted to recognized browser push services to avoid arbitrary server-side HTTPS requests.
- Service worker caches a bounded set of public opportunity list/detail responses only, retries queued search terms after reconnect, and avoids caching account-specific API responses.
- Local document checklist, profile, and saved-item stores support demo/offline usage.

### Verification performed

- `tsc --noEmit`: passed after the latest changes.
- ESLint: passed with 0 errors and 0 warnings after the latest changes.
- `node --check public/sw.js`: passed.
- `next build`: passed after the latest changes with elevated filesystem access. The sandboxed Windows run intermittently returns `EPERM` while creating generated route-output directories.
- The Playwright render worker is not run here; this environment has no Python launcher. Install the documented Python/Playwright dependencies before using it.
- Added GitHub Actions CI for dependency install, typecheck, lint, and production build. This workspace has no Git repository metadata, so the workflow cannot run until the project is initialized/pushed to GitHub.
- Earlier manual ingestion/search smoke run inserted 97 records, updated 3, generated 100 embeddings, and returned vector matches for `fullstack`, `banking`, and `railway`. This historical run was not repeated during this implementation pass.

## Remaining work before production launch

### You need to do in external accounts / deployed environment

1. Apply the Supabase migrations in order to the existing project: `20261115000000_search_vector.sql`, then `20261115000002_ingestion_push.sql`. For a brand-new database, use `supabase/schema.sql`, then apply the migrations if needed to bring it to the current version.
2. Configure Supabase and Gemini secrets in the local environment, then run `npx tsx scripts/live-scraper/run.ts` to ingest the live batch. Check the run summary and records in Supabase.
3. Verify live Explore search for `fullstack`, `banking`, and `railway`; confirm results are sourced from Supabase/vector search rather than the demo fallback.
4. In Supabase SQL Editor, review and run `supabase/enable-vector-index.sql` after confirming there are at least 100 embeddings.
5. Add Vercel environment variables for `CRON_SECRET`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_EMAIL`, alongside the existing Supabase and Gemini variables. Generate a matching VAPID key pair; never put the private key in a `NEXT_PUBLIC_` variable. Optionally configure `CRAWL_ALERT_WEBHOOK_URL` and run `python scraper/render_worker.py --sources ncs ssc` to review JavaScript-heavy portal snapshots.
6. Before deploying, choose a scheduler compatible with your plan. The current six-hour scrape expression is not allowed on Vercel Hobby (Hobby cron is once per day); use a plan that permits the cadence, change to daily, or use an external scheduler. Verify the selected function runtime supports 300 seconds; the historical scrape run took about 220 seconds. Then verify both `/api/cron/scrape` and `/api/cron/notifications` execute successfully.
7. After migrations and deployment, verify `/api/health`, signed-in search, a deadline reminder, push enable/disable, and account deletion against the live project.

### Product/data work still needed

- Review source terms, whitelisting, application links, reliability, extraction accuracy, and verification status with a human reviewer. Aggregator listings intentionally remain unverified; `.gov.in`, `.nic.in`, and `.ac.in` hosts are the only ones automatically marked verified.
- Configure `CRAWL_ALERT_WEBHOOK_URL` in the deployed environment if crawl alerts are desired; the code path is implemented but cannot notify until a webhook is supplied.
- Test profile opt-in, saved-item sync, and notification sync with the migrated Supabase schema. Dependent profiles and preferences are not yet account-synced.
- Add Hindi/localization, dependent/family profiles, source-clause citations for eligibility, and reviewed scheme/college/benefit datasets before claiming those blueprint modules are supported.
- Add automated unit/integration/e2e coverage, accessibility and responsive browser QA, error monitoring, and uptime monitoring. CI is configured but needs GitHub publication and a successful run; verification here covers typecheck, lint, service-worker syntax, and production build, not browser acceptance flows.
- Review app copy and freshness thresholds for each data vertical before public launch. This repository is an MVP focused on opportunities/jobs with limited scholarship/scheme ingestion, not the entire blueprint vision.

## Scope boundary

Do not describe eligibility output as an official decision. Always link users to the original source and ask them to confirm current rules and deadlines. Broader civic, financial, health, college, senior-citizen, farmer, disability, and business-benefit guidance needs reviewed source data and legal/product review before implementation can safely present it as production-ready.
