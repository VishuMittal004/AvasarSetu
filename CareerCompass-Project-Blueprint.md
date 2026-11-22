# CareerCompass (working title) — Full Project Blueprint
### An AI-powered Progressive Web App for Personalized Career, Education & Government Benefit Discovery

> Version 0.1 — Living document. Update as decisions are finalized.

---

## Table of Contents

1. [Vision & Philosophy](#1-vision--philosophy)
2. [What This Is NOT](#2-what-this-is-not)
3. [User Personas](#3-user-personas)
4. [Complete Feature List](#4-complete-feature-list)
5. [Detailed Use Cases](#5-detailed-use-cases)
6. [System Architecture](#6-system-architecture)
7. [Tech Stack (100% Free Tier)](#7-tech-stack-100-free-tier)
8. [Data Pipeline & Sources](#8-data-pipeline--sources)
9. [The Eligibility Inference Engine](#9-the-eligibility-inference-engine)
10. [Database Schema (Draft)](#10-database-schema-draft)
11. [API Design](#11-api-design)
12. [AI / LLM Layer Design](#12-ai--llm-layer-design)
13. [PWA-Specific Engineering](#13-pwa-specific-engineering)
14. [Security & Privacy](#14-security--privacy)
15. [Legal & Trust Layer](#15-legal--trust-layer)
16. [Development Roadmap (Phased)](#16-development-roadmap-phased)
17. [Deployment Plan (Free Hosting)](#17-deployment-plan-free-hosting)
18. [Monitoring, Testing & CI/CD](#18-monitoring-testing--cicd)
19. [Team Workflow & Project Management](#19-team-workflow--project-management)
20. [Risks & Open Questions](#20-risks--open-questions)
21. [Future Scope (Post-MVP)](#21-future-scope-post-mvp)

---

## 1. Vision & Philosophy

The core idea: most people in India (and similar economies) are eligible for dozens of jobs, scholarships, government schemes, subsidies, and benefits they never find out about — because the information is scattered across hundreds of government portals, PDFs, notifications, and private job boards, each with different eligibility rules, deadlines, and jargon.

**CareerCompass** is a personalized research agent, not a chatbot. The user builds a profile once (education, income, category, location, skills, work status), and then asks natural-language questions or lets the app proactively surface everything they qualify for — jobs (private + govt), colleges, scholarships, pensions, subsidies, loans, and civic services — with:

- Direct, verified source links (never hallucinated).
- Exact eligibility clause matched against their profile.
- Application/registration links.
- Deadlines and document checklists.

The product principle: **research + match + cite**, not "chat for chat's sake." Every answer should feel like it came from a very well-informed, unbiased human researcher who did the legwork for you and only cites official/trustworthy sources.

---

## 2. What This Is NOT

- **Not a general chatbot.** No small talk, no open-ended creative writing. Every interaction should resolve to a structured, sourced, actionable answer.
- **Not a form-filling/auto-apply agent** (at least not in MVP) — we link out to official portals rather than submitting on the user's behalf. This sidesteps huge legal liability and CAPTCHA/anti-bot issues.
- **Not a scraper that shows raw scraped text.** Everything is normalized into structured, matchable data.
- **Not a database of unverified crowd-sourced info.** Only whitelisted, official, or clearly reputable sources are used, each timestamped with "last verified."

---

## 3. User Personas

1. **The Fresh Graduate** — B.Tech/B.A./B.Com student, unsure whether to go for govt exams, private jobs, or higher studies. Wants a consolidated view of everything they're eligible for right now.
2. **The Competitive-Exam Aspirant** — preparing for UPSC/SSC/State PSC, needs age-relaxation-aware eligibility (category, PwD, ex-servicemen), deadline tracking, and syllabus digestion.
3. **The Low-Income Household Member** — wants to know every scholarship, subsidy, and welfare scheme their family income/category qualifies them for, but doesn't know where to look or how to read government notification PDFs.
4. **The Working Professional Switching Domains** — wants a resume-friendly rundown of open roles matching a *different* skill profile than their current job.
5. **The Senior Citizen / Pensioner** — wants pension schemes, health insurance, and travel concessions explained in plain language.
6. **The Small Business Owner / Aspiring Entrepreneur** — wants MSME/startup schemes, loan subsidies (PMEGP, MUDRA), and registration guidance.

---

## 4. Complete Feature List

### 4.1 Core Platform
- Natural language query bar (single entry point — "ask anything").
- Structured profile builder (progressive, not a giant form — asks only what's needed as user explores features).
- Eligibility inference engine (profile × requirement rules).
- Source-grounded, cited answers with "last verified" timestamps.
- Confidence scoring on freshness/reliability of each data point.
- Save/bookmark any result.
- Deadline calendar aggregating every tracked opportunity.
- Document vault / checklist (what to keep ready per application, not storage of actual sensitive docs by default).
- Notification center (deadlines, new matches, scheme changes).
- Explain-like-I'm-new mode (plain-language jargon buster for legal/government text).
- Multi-language support (starting Hindi + English, expandable).

### 4.2 Jobs Module
- Private job aggregation (LinkedIn public listings, Naukri, Indeed, AngelList/Wellfound, company career pages via RSS/API where available).
- Government job aggregation (UPSC, SSC, State PSCs, RRB, IBPS/banking, PSU recruitment — GAIL, ONGC, IOCL, NTPC, etc.).
- Auto eligibility match: degree, branch, CGPA/percentage, age (with category-based relaxation), experience.
- Application tracker with deadline reminders.
- Exam pattern & syllabus summarizer for govt exams.
- Previous-year cutoff trend viewer.
- Internship finder (govt + private, including PM Internship Scheme, stipendiary internships).
- Apprenticeship finder (NAPS/NATS).

### 4.3 Education Module
- College eligibility matcher (entrance score, cutoff trends, domicile/category quota).
- Scholarship finder (central, state, private trust — NSP portal, state scholarship portals).
- Study-abroad / exchange program listings (basic, non-exhaustive in MVP).
- Fellowship/research grant finder (JRF, NET, CSIR/UGC, PhD funding).
- Free/subsidized skill course finder (Skill India, NPTEL, PMKVY).

### 4.4 Government Schemes & Welfare Module
- Pension scheme eligibility (age/income/occupation based — EPFO, NPS, state old-age pension, Atal Pension Yojana).
- Subsidy & loan schemes (PMEGP, MUDRA, Stand-Up India, education loans with interest subsidy).
- Health insurance scheme eligibility (Ayushman Bharat, ESIC, state health schemes).
- Housing scheme eligibility (PMAY urban/rural, state housing boards).
- Utility subsidies (Ujjwala LPG, electricity subsidy, EV purchase incentives).
- Tax-bracket-based benefit finder (deductions/exemptions the user may be missing — informational, not filing).
- Category-specific modules:
  - Women-specific schemes (entrepreneurship, safety, maternity benefits, Mahila Samman schemes).
  - Senior citizen schemes (pension, travel concessions, tax benefits).
  - Farmer schemes (PM-KISAN, crop insurance/PMFBY, equipment subsidy).
  - Differently-abled schemes & job reservations.
  - MSME/startup registration + Udyam + related subsidies.

### 4.5 Civic Services Guidance (Guidance only — not a filing agent)
- Caste/income/domicile certificate process guide.
- Passport/visa application guidance and eligibility.
- Voter ID / Aadhaar / PAN update process guidance.
- RTI filing assistant (drafting help + correct authority to send to).
- Consumer complaint filing help (National Consumer Helpline, e-daakhil).

### 4.6 Finance Guidance
- Loan eligibility overviews (education, home — PMAY-linked, business).
- Credit score explainer.
- Investment/basic risk-profile suggestions (clearly labeled "educational, not financial advice").

### 4.7 Meta / Cross-Cutting Features
- "Life stage" mode — e.g., selecting "Just graduated" auto-triggers a relevant bundle of categories instead of one-by-one querying.
- Weekly digest — new matching openings/schemes since last visit.
- Profile-change-triggered alerts ("You're now eligible for X because you updated your income").
- Comparison view (e.g., compare 3 scholarships or 3 PSU jobs side by side).
- Resume/cover letter generator based on saved profile (optional AI-assisted).

### 4.8 PWA-Specific Features
- Installable on Android/iOS/desktop, works offline for saved/cached results.
- Push notifications for deadlines even when app is closed.
- Low-data mode for low-end devices/poor connectivity (a major real-world constraint for this exact user base).
- Background sync — queued queries run when connectivity returns.

---

## 5. Detailed Use Cases

Below are representative end-to-end user flows. These double as acceptance-test scenarios later.

### UC-1: First-time user, generic job query
1. User opens app, no profile yet.
2. Types: "Tell me about job openings at GAIL."
3. App detects missing profile fields needed to filter (education, branch) → asks 2-3 quick contextual questions inline (not a full form).
4. Returns: open GAIL postings, eligibility per posting, official registration link, deadline, source + verified date.
5. Prompts: "Want me to save your profile so future searches skip these questions?"

### UC-2: Returning user, broad eligibility query
1. User has full profile saved (income, category, state, education).
2. Types: "What government schemes am I eligible for?"
3. Engine runs profile against the full scheme rule-set.
4. Returns categorized results: Pension / Education / Health / Housing — each with a one-line eligibility reason ("Eligible because household income < ₹2.5L and you are in general category for Scheme X").
5. User taps a scheme → full detail page with source PDF/link, application steps, required documents.

### UC-3: Salary + scholarship/pension cross-check
1. User enters salary/income details.
2. Asks: "Am I eligible for any pension scheme or scholarship for my sibling?"
3. Engine separates: pension rules apply to user's own profile; scholarship rules can apply to a linked "dependent" sub-profile (a feature to support family members).
4. Returns full info with sources for both, clearly separated.

### UC-4: Competitive exam aspirant
1. User profile: age 24, OBC category, B.Sc graduate.
2. Query: "Which SSC/UPSC exams am I still eligible for this year?"
3. Engine applies age-relaxation rules per category, filters by qualification requirement, checks against current-year notification deadlines.
4. Returns exam list with syllabus summary, cutoff trend chart, and exact age-relaxation clause cited.

### UC-5: Deadline tracking
1. User bookmarks 3 opportunities (2 scholarships, 1 govt job).
2. App auto-populates the in-app deadline calendar.
3. Push notification 7 days and 1 day before each deadline.
4. Notification includes a document checklist reminder.

### UC-6: Offline/low-connectivity use
1. User in a low-network area opens the installed PWA.
2. Previously fetched results and profile are available offline (cached).
3. Any new query is queued; once connectivity returns, background sync fetches results and notifies the user.

### UC-7: Plain-language explanation
1. User pastes or is shown a dense government notification paragraph.
2. Taps "Explain this simply."
3. AI layer rewrites it in plain language, still keeping a link back to the original source (never replacing it).

---

## 6. System Architecture

```
                         ┌─────────────────────────────┐
                         │        PWA Frontend          │
                         │  (Next.js + Tailwind + PWA)  │
                         └───────────────┬──────────────┘
                                          │ HTTPS/REST/GraphQL
                         ┌───────────────▼──────────────┐
                         │        API Gateway Layer      │
                         │   (Next.js API routes / Node) │
                         └───────┬───────────────┬───────┘
                                 │               │
                 ┌───────────────▼───┐   ┌───────▼────────────┐
                 │  Query & AI Layer  │   │  Profile & Auth     │
                 │ (LLM orchestration,│   │ Service (Supabase   │
                 │  intent parsing,   │   │ Auth + Postgres)    │
                 │  eligibility calls)│   └─────────────────────┘
                 └───────┬────────────┘
                         │
         ┌───────────────▼────────────────┐
         │     Eligibility Engine (Rules)  │
         │  Profile × Structured Criteria  │
         └───────────────┬────────────────┘
                         │
         ┌───────────────▼────────────────┐
         │   Structured Data Store         │
         │ (Postgres: jobs, schemes,       │
         │  scholarships, colleges, rules) │
         └───────────────▲────────────────┘
                         │
         ┌───────────────┴────────────────┐
         │   Data Ingestion / Scraping     │
         │  Pipeline (scheduled jobs,      │
         │  Playwright/Scrapy + LLM        │
         │  extraction + human review      │
         │  queue for new sources)         │
         └───────────────┬────────────────┘
                         │
         ┌───────────────▼────────────────┐
         │  Whitelisted Source Registry    │
         │ (.gov.in, PSU sites, verified   │
         │  aggregators, official PDFs)    │
         └─────────────────────────────────┘
```

**Key architectural principle:** The LLM never invents eligibility rules. It only (a) parses user intent, (b) queries the structured rules database via the eligibility engine, and (c) formats the response with citations. This keeps hallucination risk low for a domain where wrong info has real consequences.

---

## 7. Tech Stack (100% Free Tier)

Every layer below has a genuinely free way to build and (initially) host this. Paid upgrades are noted only as "later if needed."

### 7.1 Frontend
| Layer | Choice | Why / Free tier |
|---|---|---|
| Framework | **Next.js** (React) | Free, open-source, best-in-class PWA + SSR support |
| Styling | **Tailwind CSS** | Free, fast to build clean UI |
| PWA tooling | **next-pwa** / **Workbox** | Free, handles service worker, offline caching |
| State mgmt | **Zustand** or React Context | Free, lightweight |
| Forms | **React Hook Form** + **Zod** (validation) | Free |
| Charts (cutoff trends etc.) | **Recharts** | Free |
| Icons | **Lucide** | Free |

### 7.2 Backend / API
| Layer | Choice | Why / Free tier |
|---|---|---|
| Runtime | **Node.js** via Next.js API routes, or standalone **Express/Fastify** | Free |
| ORM | **Prisma** | Free, works great with Postgres |
| Auth | **Supabase Auth** (or Clerk free tier) | Free tier covers early-stage user counts |
| Background jobs / cron | **GitHub Actions scheduled workflows** (free 2000 min/month) or **Render Cron Jobs free tier** | Free |
| Queue (for scraping/notifications) | **Upstash QStash** (free tier) or self-hosted **BullMQ + Redis (Upstash free Redis)** | Free tier limits, fine for MVP |

### 7.3 Database
| Layer | Choice | Why / Free tier |
|---|---|---|
| Primary DB | **Supabase Postgres** (free tier: 500MB, pauses after inactivity) or **Neon.tech** (free serverless Postgres, generous tier) | Free |
| Full-text/vector search | **pgvector** extension on Postgres (free, built into Supabase/Neon) | Avoids needing a separate paid vector DB |
| Caching | **Upstash Redis** (free tier) | Free |
| Search engine (for job/scheme browsing) | **Meilisearch** (self-hosted on a free Render/Fly.io instance) or **Typesense Cloud free trial → self-host later** | Free/self-hosted |

### 7.4 AI / LLM Layer
| Layer | Choice | Why / Free tier |
|---|---|---|
| Primary LLM (intent parsing, plain-language rewriting, structured extraction) | **Claude API** (Anthropic) via free/low-cost dev credits, or **Groq free tier** (Llama 3.1/3.3, Mixtral — extremely fast + free for moderate volume) | Groq's free tier is very generous for dev/early production |
| Local fallback (dev/testing, zero cost) | **Ollama** running Llama 3 / Mistral locally | 100% free, no API cost during development |
| Embeddings (for semantic search over schemes/jobs) | **Sentence-Transformers (open-source, self-hosted)** or free-tier embedding APIs | Free |
| Structured extraction from scraped PDFs/HTML | LLM-assisted parsing (prompt-based) + regex/rule fallback | Free (uses same LLM budget) |

### 7.5 Data Ingestion / Scraping
| Layer | Choice | Why / Free tier |
|---|---|---|
| Browser automation (for JS-heavy govt sites) | **Playwright** | Free, open-source |
| Simple HTML scraping | **BeautifulSoup** / **Cheerio** (Node) | Free |
| Scheduled scraping orchestration | **n8n** (self-hosted, free) or GitHub Actions cron | Free |
| PDF parsing (notifications, eligibility criteria) | **pdf-parse** (Node) / **PyMuPDF** (Python) | Free |
| Change detection | Hash-based diffing of scraped pages, stored in Postgres | Free (custom logic) |

### 7.6 Notifications
| Layer | Choice | Why / Free tier |
|---|---|---|
| Push notifications (PWA) | **Web Push API** (native browser standard) + **web-push** npm library | Completely free, no third-party needed |
| Email digests (optional) | **Resend** (free tier, 3000 emails/month) or **Supabase built-in email** | Free tier sufficient early on |

### 7.7 Hosting / Deployment
| Layer | Choice | Why / Free tier |
|---|---|---|
| Frontend + API (Next.js) | **Vercel** (free Hobby tier) | Free, best Next.js integration |
| Scraping workers / n8n | **Render.com free web service** or **Fly.io free allowance** | Free tier (may sleep on inactivity — acceptable for scheduled jobs) |
| Database | Supabase/Neon free tier (see above) | Free |
| Domain | Use free subdomain initially (`yourapp.vercel.app`), buy a real domain later (~$10/yr) only when ready to launch publicly | Effectively free at MVP stage |

### 7.8 Dev Tooling
| Layer | Choice |
|---|---|
| Version control | **GitHub** (free private repos) |
| CI/CD | **GitHub Actions** (free minutes for public/small private repos) |
| Error monitoring | **Sentry** (free tier — 5k events/month) |
| Analytics | **Plausible** (self-hosted free) or **Umami** (free, self-hosted, privacy-friendly) |
| Design/wireframing | **Figma** (free tier) |
| Project management | **GitHub Projects** (free) or **Trello free tier** |

**Bottom line:** the entire stack can be built and run at zero cost until real user traffic requires scaling past free tiers — at which point costs are usage-based and gradual, not a cliff.

---

## 8. Data Pipeline & Sources

### 8.1 Source Categories & Examples
- **Government job portals:** SSC (ssc.nic.in), UPSC (upsc.gov.in), state PSCs, RRB, IBPS, individual PSU career pages (GAIL, ONGC, IOCL, BHEL, NTPC, etc.), employment news portals.
- **Private job boards:** LinkedIn (public job search — respecting ToS/robots.txt; consider official API/partner routes where scraping isn't allowed), Naukri, Indeed, AngelList/Wellfound, Internshala (for internships).
- **Scholarships:** National Scholarship Portal (scholarships.gov.in), state scholarship portals, UGC/AICTE, private trust scholarship pages (Tata Trusts, etc.).
- **Schemes:** myscheme.gov.in (a government meta-aggregator — extremely valuable as a starting source), individual ministry portals (MoRD, MoHFW, MoHUA, etc.).
- **Colleges/exams:** NTA (for entrance exams), individual university admission portals, state counselling portals.

### 8.2 Ingestion Approach
1. **Source Registry** — a curated, manually vetted list of whitelisted domains/URLs (never scrape arbitrary search-engine results for facts that affect eligibility).
2. **Scheduled Crawlers** — Playwright/BeautifulSoup jobs run on a cron schedule (daily for high-churn sources like job boards, weekly for slower-changing scheme pages).
3. **LLM-Assisted Structured Extraction** — raw HTML/PDF text is passed to the LLM with a strict extraction prompt (schema-constrained JSON output) to pull: title, eligibility criteria, deadline, required documents, application link, issuing authority.
4. **Rule Normalization** — extracted eligibility text is converted into structured, machine-checkable rules (age ranges, income ceilings, category flags, education requirements) — this is the hardest and most valuable part of the whole system.
5. **Human Review Queue (early stage)** — until the extraction pipeline is proven reliable, every *new* source type or ambiguous rule goes into a review queue before going live, to avoid ever showing wrong eligibility info.
6. **Change Detection** — periodic re-crawl + diffing to catch when a scheme's rules or a job's deadline change; flags stale data with a "please re-verify" indicator if a source hasn't been successfully re-crawled recently.

### 8.3 Data Freshness Policy
- Every record stores `last_verified_at`.
- UI always shows this date next to any eligibility claim.
- Records not re-verified within a source-specific staleness window (e.g., 30 days for jobs, 90 days for schemes) are visually flagged as "may be outdated — check official source."

---

## 9. The Eligibility Inference Engine

This is the intellectual core of the product. Two design options, roughly in order of MVP suitability:

### Option A — Rule-Based Engine (Recommended for MVP)
- Every job/scheme/scholarship has a structured `eligibility_rules` JSON object, e.g.:
```json
{
  "min_age": 21,
  "max_age": 30,
  "age_relaxation": { "OBC": 3, "SC": 5, "ST": 5, "PwD": 10 },
  "education_min": "Bachelors",
  "allowed_branches": ["CSE", "IT", "ECE"],
  "max_income": 800000,
  "domicile_states": ["UP", "any"],
  "gender": "any"
}
```
- The engine evaluates this JSON against the user's profile with plain deterministic logic (no LLM needed at match time → fast, cheap, reliable, explainable).
- Every eligibility decision returns a **reason string** built from the exact rule that matched/failed, so the user sees *why*.

### Option B — Hybrid (Phase 2+)
- Use rule-based matching for anything expressible as structured rules (90%+ of cases).
- Fall back to LLM-assisted reasoning only for edge cases with genuinely ambiguous natural-language criteria (e.g., "preference given to candidates from backward regions" with no formal list) — and always show this as "AI-interpreted, please verify" rather than a hard yes/no.

### 9.1 Why Rule-Based First
LLMs are excellent at *extracting* structured rules from messy text (one-time or periodic job) but are the wrong tool for *evaluating* those rules at query time — deterministic code is faster, cheaper, fully explainable, and doesn't hallucinate a "yes you're eligible" when it's wrong. This split (LLM for extraction, code for evaluation) is the single most important architectural decision in this project.

---

## 10. Database Schema (Draft)

Core tables (Postgres, via Prisma):

```
users
 ├─ id, email, phone, created_at, auth_provider

profiles
 ├─ id, user_id (FK), dob, gender, category (Gen/OBC/SC/ST/EWS),
 │  education_level, degree, branch, cgpa_or_percentage,
 │  annual_income, state, district, disability_status,
 │  employment_status, skills[], updated_at

dependents            -- optional linked family member sub-profiles
 ├─ id, profile_id (FK), relation, dob, education_level, income

opportunities          -- unified table for jobs/scholarships/schemes/colleges
 ├─ id, type (job|scholarship|scheme|college|pension|subsidy),
 │  title, issuing_authority, description,
 │  eligibility_rules (JSONB), application_link, source_url,
 │  deadline, last_verified_at, confidence_score, region_scope,
 │  created_at, updated_at

sources
 ├─ id, domain, category, trust_level, last_crawled_at

crawl_logs
 ├─ id, source_id (FK), status, records_found, records_changed, run_at

user_saved_opportunities
 ├─ id, user_id (FK), opportunity_id (FK), status (saved|applied|expired),
 │  reminder_set, notes

notifications
 ├─ id, user_id (FK), type, payload, sent_at, read_at
```

---

## 11. API Design

RESTful (or tRPC if staying full-TypeScript for end-to-end type safety — recommended for solo/small-team dev speed).

Representative endpoints:
```
POST   /api/profile                 - create/update user profile
GET    /api/profile/:userId         - fetch profile

POST   /api/query                   - main NL query endpoint
                                       { text: string } →
                                       { intent, matched_opportunities[], explanation }

GET    /api/opportunities           - filtered/paginated browse
                                       (?type=job&state=UP&category=OBC)
GET    /api/opportunities/:id       - full detail + source + eligibility reasoning

POST   /api/saved                   - save/bookmark an opportunity
GET    /api/saved/:userId           - user's saved list + deadlines

GET    /api/calendar/:userId        - aggregated deadline calendar

POST   /api/explain                 - plain-language rewrite of a given text/source
```

`tRPC` alternative keeps this fully type-safe between Next.js frontend and backend with near-zero boilerplate — worth strongly considering since the whole stack is already TypeScript.

---

## 12. AI / LLM Layer Design

### 12.1 Responsibilities of the LLM (and only these)
1. **Intent parsing** — turn free text into structured query parameters (type, location, category filters).
2. **Extraction (offline/batch)** — turn scraped HTML/PDF into structured `eligibility_rules` JSON during ingestion.
3. **Explanation generation** — turn a matched rule + user profile into a natural, friendly explanation sentence.
4. **Plain-language rewriting** — jargon-to-simple-language conversion of official notifications.
5. **Semantic search assist** — when the user's query doesn't map cleanly to filters, use embeddings to find the closest matching opportunities.

### 12.2 What the LLM Must Never Do
- Invent an eligibility rule that isn't in the structured database.
- State an opportunity is currently open without a `last_verified_at` check.
- Fabricate a source link.

### 12.3 Prompting Strategy
- Use strict system prompts with JSON schema constraints for extraction tasks.
- Use retrieval-augmented generation (RAG): the LLM only ever answers using retrieved structured records + their source metadata, never from its own training knowledge about "what schemes exist" (training data will be stale/wrong for this domain).

---

## 13. PWA-Specific Engineering

- **Service Worker (Workbox via next-pwa):** cache-first for static assets, network-first with cache fallback for API data (so saved results are viewable offline).
- **Web App Manifest:** installable icon, splash screen, theme color.
- **IndexedDB** (via `idb` library) for storing the user's profile and saved opportunities locally, syncing with backend when online.
- **Web Push API:** native browser push notifications, no third-party SDK required — fully free.
- **Background Sync API:** queue failed/offline requests (e.g., a query typed with no connectivity) and auto-retry when back online.
- **Performance budget:** target <200KB initial JS bundle where possible, aggressive code-splitting, since target users may be on low-end Android devices with patchy 4G.

---

## 14. Security & Privacy

- **Minimal sensitive data collection.** Never require Aadhaar/PAN numbers to use core features — only ask for them if a specific future feature (e.g., pre-filling a real government form) truly needs it, and even then, store encrypted or don't store at all (pass-through only).
- **Income/category data** is sensitive — encrypt at rest (Postgres column-level encryption or app-level encryption before storage), and never expose it in logs/analytics.
- **Auth:** rely on Supabase Auth/Clerk (battle-tested, free tier) rather than rolling custom auth.
- **Rate limiting** on the query API to prevent abuse of the LLM budget.
- **HTTPS everywhere** (default on Vercel/Render).
- **Data deletion:** user can delete their profile and all associated data at any time (simple compliance-friendly default).

---

## 15. Legal & Trust Layer

- Clear, persistent disclaimer: *"CareerCompass helps you discover opportunities and understand eligibility criteria based on publicly available information. We are not a government entity and do not process applications on your behalf. Always verify details on the official source before applying."*
- Every result links out to the **official** application/registration page — the app never claims to submit anything for the user in MVP.
- Terms of Service + Privacy Policy pages (can start from a free template like Termly's free generator, then customize).
- Explicit "not financial/legal/medical advice" labeling wherever finance/health-adjacent content appears.

---

## 16. Development Roadmap (Phased)

### Phase 0 — Foundations (Week 1-2)
- Finalize name/branding, repo setup, CI/CD skeleton.
- Set up Next.js + Tailwind + PWA boilerplate.
- Set up Supabase/Neon Postgres + Prisma schema (from Section 10).
- Set up auth.

### Phase 1 — MVP Data + One Vertical (Week 3-6)
- Pick **one** vertical to prove the concept end-to-end: recommend **government jobs + PSU jobs** (matches your own current context at GAIL, easiest structured data via portals like SSC/UPSC/PSU sites, and a very motivated first-user base among students).
- Build the source registry + first 5-10 scrapers for this vertical.
- Build the rule-based eligibility engine for jobs (age, category, education, experience).
- Build basic profile builder (job-relevant fields only).
- Build query bar + results UI + detail page with source citation.

### Phase 2 — Expand Verticals (Week 7-10)
- Add scholarships + one or two government schemes categories (start with something well-aggregated like myscheme.gov.in as a base source).
- Add save/bookmark + deadline calendar.
- Add push notifications.

### Phase 3 — AI Layer Maturity (Week 11-13)
- Add NL query parsing via LLM (replacing simple keyword filters).
- Add plain-language explanation feature.
- Add semantic search fallback via embeddings.

### Phase 4 — Polish, PWA Hardening, Beta (Week 14-16)
- Offline support, background sync, push notification polish.
- Performance optimization for low-end devices.
- Closed beta with a small real user group (e.g., fellow students) for feedback.

### Phase 5 — Scale Verticals + Public Launch
- Add remaining categories (civic services, finance guidance, category-specific modules).
- Add multi-language support.
- Public launch, monitor via analytics, iterate.

---

## 17. Deployment Plan (Free Hosting)

1. **Frontend + API:** Deploy Next.js app to **Vercel** (free Hobby plan) — connects directly to GitHub, auto-deploys on push.
2. **Database:** **Neon.tech** or **Supabase** free Postgres instance — connection string in Vercel environment variables.
3. **Scraping workers:** Run as **GitHub Actions scheduled workflows** (simplest, zero infra to manage, free minutes) — each workflow triggers a script that scrapes + writes to Postgres. For heavier/longer scrapes, use **Render.com free background worker** instead.
4. **Redis/cache/queue:** **Upstash Redis** free tier (serverless, pay-per-request pricing with a generous free allotment).
5. **Notifications:** Web Push (free, self-managed via `web-push` npm library + VAPID keys).
6. **Domain:** start on the free `*.vercel.app` subdomain; buy a proper domain (~$8-12/year) only once ready for public launch.

This entire pipeline can run at **$0/month** through the MVP and early beta stages.

---

## 18. Monitoring, Testing & CI/CD

- **CI:** GitHub Actions — lint, type-check, run tests on every PR.
- **Testing:** 
  - Unit tests for the eligibility engine (this is the most critical piece to test thoroughly — wrong eligibility logic is the biggest trust risk).
  - Integration tests for scrapers (detect when a source's HTML structure changes and breaks extraction).
  - E2E tests (Playwright) for core user flows (profile creation → query → result → save).
- **Error monitoring:** Sentry free tier — catch frontend and backend errors in real time.
- **Analytics:** self-hosted **Umami** or **Plausible** (free, privacy-respecting, doesn't require cookie consent banners in most jurisdictions) to track feature usage without invasive tracking.
- **Uptime monitoring:** **UptimeRobot** free tier (pings your API/frontend, alerts on downtime).

---

## 19. Team Workflow & Project Management

- **Repo structure:** monorepo (Next.js app + scraper scripts + shared types) using a tool like **Turborepo** (free, open-source) if the project grows multiple packages.
- **Branching:** simple `main` + feature branches, PR review before merge.
- **Task tracking:** GitHub Projects (Kanban board, free, integrates directly with issues/PRs).
- **Documentation:** this MD file (and its children, e.g., `/docs/eligibility-rules.md`, `/docs/data-sources.md`) lives in the repo and is updated as decisions are made — treat it as the single source of truth.

---

## 20. Risks & Open Questions

- **Scraping legality/ToS:** some job boards (e.g., LinkedIn) restrict scraping in their ToS — need to evaluate official APIs/partner programs vs. only scraping sources that explicitly allow it (most .gov.in sites have no such restriction; private job boards need care).
- **Data accuracy liability:** even with citations, showing "you are eligible" carries responsibility — mitigate via clear disclaimers + always linking to the authoritative source + conservative "maybe eligible, please verify" states for ambiguous rules.
- **Source fragmentation:** every state has different scheme portals with different structures — this will always be the long tail of ingestion effort; prioritize central/high-impact sources first.
- **LLM cost at scale:** free tiers (Groq, etc.) are generous but not infinite — as usage grows, budget for a small ongoing API cost; architecture should make this a "later" problem, not a launch blocker.
- **Keeping data fresh without a large team:** change-detection + staleness flags are the practical mitigation; full real-time freshness across hundreds of sources isn't realistic for a small team at MVP stage — be transparent about this to users instead of pretending otherwise.

---

## 21. Future Scope (Post-MVP)

- Auto-fill (not auto-submit) of official application forms using saved profile data, to save user typing time while keeping final submission fully in the user's control and on the official site.
- Resume/cover letter builder + ATS-friendliness checker.
- Community layer — verified user reports of application experiences (clearly separated from official data).
- Voice-based query input (accessibility, especially for less tech-literate or visually impaired users).
- SMS-based lite version for users without smartphones/reliable internet (a genuinely high-impact extension given the target demographic).
- Partnerships with official portals/NGOs for verified data feeds instead of scraping.
- Mobile native wrapper (Capacitor) if app store presence becomes valuable beyond the PWA.

---

*End of blueprint v0.1. Next step: pick the Phase 1 vertical (recommended: Government + PSU jobs) and start scaffolding the repo.*
