# Asset Pulse — Universal Implementation & Architecture Plan

> **Program:** Digital Infrastructure & Intelligence Programme (DIIP), DivyaSree Developers[cite: 1]  
> **Repository:** `github.com/agentdeepankar-del/diip-asset-survey` (Private)[cite: 1]  
> **Target Architecture:** Monorepo (Next.js API & Admin Web + Expo Mobile App + Drizzle ORM + Serverless Neon DB)  
> **Status:** Active Target Architecture — July 2026[cite: 1]  
> **Source Documents:** Developer Handover Document (July 2026)[cite: 1], TEX Suite Reference Architecture[cite: 1]

---

## 0. Executive Summary

**Asset Pulse** is an enterprise asset survey, enrichment, QR-tagging, and audit management platform covering **13 commercial properties** (7 in Bangalore, 6 in Hyderabad)[cite: 1]. Its primary goal is to build an authoritative, 100% accurate asset register that feeds downstream CAFM and BIM platforms while enabling seamless periodic field auditing via QR scanning[cite: 1].

### Core Mission & Lifecycle

1. **[DRAFT]** (Seeded Core) — Seeded from chairman's workbook (11,353 records imported)[cite: 1].
2. **[SURVEYED]** (Mobile Survey) — Visited physically by field surveyors; make, model, serial, high-accuracy GPS, and photos captured[cite: 1]. Auto-generates physical QR code labels[cite: 1].
3. **[ENRICHED]** (Admin Console) — Back-office admins add AMC details, operating parameters, and dynamic specifications[cite: 1].
4. **[REGISTER-READY]** (CAFM / BIM Sync) — Achieves 100% weighted completion score; ready for CAFM API dispatch[cite: 1].
5. **[AUDITED]** (Routine Scans) — Periodic physical verification scans on field devices to ensure operational compliance.

---

## 1. System Architecture & Modern Tech Stack

This architecture utilizes a end-to-end TypeScript monorepo setup:

- **Field Surveyors (iOS / Android Mobile App):** Built with **Expo (React Native)** for high-performance offline capabilities, native camera barcode scanning, Bluetooth printing, and silent GPS capture.
- **Back-Office Admins & API Engine:** Driven by **Next.js (App Router)**. Next.js hosts both the desktop enrichment web interface and serverless **Route Handlers** (`app/api/*`) for mobile consumption.
- **Data Layer:** **Drizzle ORM** communicating via WebSocket/HTTP drivers with **Neon DB** (Serverless PostgreSQL) featuring dynamic `jsonb` specification storage and branch environments.

### Stack Specification

| Layer                      | Technology                      | Strategic Purpose & Governance                                                                                                |
| :------------------------- | :------------------------------ | :---------------------------------------------------------------------------------------------------------------------------- |
| **Monorepo Engine**        | Turborepo + pnpm[cite: 1]       | High-speed build pipeline and shared monorepo package orchestration[cite: 1].                                                 |
| **Mobile App**             | Expo (React Native)             | Native iOS & Android application built for field surveyors and on-site auditors.                                              |
| **Admin Web & API**        | Next.js (App Router)            | Desktop back-office management console & centralized API Route Handlers.                                                      |
| **ORM & Type Safety**      | Drizzle ORM                     | End-to-end type-safe database queries, migrations, and schema definition.                                                     |
| **Database**               | Serverless Neon DB (PostgreSQL) | Scalable PostgreSQL database[cite: 1] with `jsonb` support for asset specifications[cite: 1] and instant branch environments. |
| **Mobile Offline Storage** | `react-native-mmkv` / SQLite    | Fast synchronous local storage for queueing surveys in cellular dead zones.                                                   |
| **Authentication**         | NextAuth.js / Clerk + JWT       | Role-based access control (`surveyor`, `backoffice`, `admin`)[cite: 1] with secure JWT sessions[cite: 1].                     |
| **Media Storage**          | Cloudflare R2 / S3 Storage      | Presigned direct uploads for high-resolution photo evidence and QR label assets[cite: 1].                                     |

---

## 2. Monorepo Repository Structure

- `diip-asset-survey/`
  - `.github/workflows/` — CI/CD pipelines (EAS mobile builds, Vercel web deployments)
  - `apps/`
    - `mobile/` — Expo React Native App (iOS & Android)
      - `app/` — Expo Router file-based pages (`(auth)`, `(surveyor)`, `_layout.tsx`)
      - `src/` — Custom hooks (GPS, offline queue, printer), local SQLite/MMKV database configuration
      - `app.json` — Expo build configuration
    - `web/` — Next.js Enterprise Web Platform & API Server
      - `app/`
        - `(admin)/` — Desktop back-office enrichment, master taxonomy configuration, audit dashboards
        - `api/` — Serverless route handlers (`/api/assets`, `/api/taxonomy`, `/api/audit`, `/api/cafm`)
      - `public/` — Static assets
  - `packages/` — Shared Workspace Libraries
    - `db/` — Drizzle ORM schema definitions (`schema.ts`), migrations (`/drizzle`), and Neon DB client instance
    - `core/` — Shared Zod validation schemas, taxonomy definitions, and completion scoring algorithms
    - `ui/` — Shared UI tokens and cross-platform styling utilities
  - `pnpm-workspace.yaml`
  - `turbo.json`
  - `drizzle.config.ts`
  - `package.json`

---

## 3. Data Integrity & Non-Negotiable Rules

To guarantee data accuracy for downstream CAFM platforms, all developers must strictly uphold these rules[cite: 1]:

1. **Constrained Location Inputs:** Surveyors **never free-type** building, floor, or room names[cite: 1]. Locations are selected exclusively from pre-configured database dropdowns managed via the Admin Web Portal[cite: 1].
2. **Curated Makes List:** Asset makes are driven by controlled array definitions in the taxonomy schema[cite: 1]. "Other" is always positioned as the final option[cite: 1]. Model numbers are free text[cite: 1].
3. **Silent Photo-Triggered GPS:** High-accuracy GPS coordinates are captured automatically in the background whenever an asset photo is captured (via `expo-location`)[cite: 1].
4. **Master Identifier (`asset_code`):** All records use the master code format `{PROP_CODE}-{CAT_CODE}-{SEQ_NUM}` (e.g., `TTC-HVAC-001042`). This binds asset registers, BIM GUIDs (`bim_guid`), physical QR labels, and audit trails[cite: 1].
5. **Serverless Database Driver:** Drizzle must connect to Neon DB using the `@neondatabase/serverless` WebSocket/HTTP connection pooler to prevent running out of database connections during serverless API invocations.
6. **Direct Storage Uploads:** Mobile photo uploads must request a presigned upload URL from `apps/web/app/api/upload/route.ts` and post directly to cloud storage to prevent serverless payload limits.
7. **Audit Trail Guarantee:** All Drizzle mutation operations on assets must automatically append an immutable log entry into `audit_logs` detailing `userId`, `oldValue`, and `newValue`[cite: 1].

---

## 4. Phased Delivery Roadmap & Backlog Execution

- **Phase 1:** Monorepo Workspace & Drizzle + Neon DB Integration
- **Phase 2:** Master Configuration & Expo Mobile Survey App
- **Phase 3:** Dynamic Completion Engine & Offline Sync Queue
- **Phase 4:** Statutory Compliance Engine & Space Register Sync
- **Phase 5:** Hardware Integration & Downstream CAFM Pipeline

### Phase 1 — Infrastructure & Universal Workspace

- [x] Restructure repository into Turborepo + pnpm workspace with `apps/mobile`, `apps/web`, and `packages/db`.
- [x] Define PostgreSQL schemas using Drizzle ORM in `packages/db/schema.ts`[cite: 1].
- [ ] Connect Neon DB instance and run initial migration scripts for 89 taxonomies[cite: 1] and 11,353 seeded assets[cite: 1].
- [ ] Set up NextAuth/Clerk authentication in `apps/web` and JWT token exchange for `apps/mobile`[cite: 1].

### Phase 2 — Master Config & Smart Mobile Survey (Backlog #1 & #2)

- [ ] **Admin Master Config UI (Backlog Item #1):** Build web dashboard screens in `apps/web/app/(admin)/config` to edit 3-level taxonomies[cite: 1], curated makes[cite: 1], and pre-configured floor maps[cite: 1].
- [ ] **Smart Mobile Survey Form (Backlog Item #2):** Wire cascading taxonomy selectors into the 4-step survey form in `apps/mobile` with camera-triggered GPS capture[cite: 1].
- [ ] Render dynamic `jsonb` specification fields inside the mobile survey workflow[cite: 1].

### Phase 3 — Completion Scoring & Offline Engine (Backlog #3 & #4)

- [ ] **Completion Score Calculation (Backlog Item #3):** Implement weighted completion scoring logic in `packages/core` to calculate asset completeness dynamically[cite: 1].
- [ ] **Smart Enrichment Console (Backlog Item #4):** Build back-office Next.js admin forms where input fields dynamically adapt based on the selected asset category[cite: 1].
- [ ] **Offline Sync Engine:** Implement `react-native-mmkv` / SQLite state queueing in `apps/mobile` to seamlessly push offline survey data to Next.js API route handlers upon reconnecting[cite: 1].

### Phase 4 — Statutory Compliance & Spatial Hierarchy (Backlog #5 & #6)

- [ ] **Statutory Compliance Module (Backlog Item #5):** Auto-trigger compliance sub-sections based on taxonomy classification (Lifts Act, CEA, SPCB, Petroleum Rules, Boilers Act, Fire NOC)[cite: 1].
- [ ] **Space Register Integration (Backlog Item #6):** Integrate full spatial hierarchy (`Property` -> `Building` -> `Floor` -> `Space` -> `Asset`) linking with `DivyaSree-space-wizard` (`sw_*` tables)[cite: 1].

### Phase 5 — Hardware Integration, Auditing & CAFM Sync (Backlog #7, #8, #9)

- [ ] **CAFM REST Endpoints (Backlog Item #7):** Build secure Next.js payload delivery route handlers for downstream CAFM platform ingestion[cite: 1].
- [ ] **Bluetooth Zebra Printing (Backlog Item #8):** Integrate Zebra Mobile SDK in `apps/mobile` for direct on-site QR label printing to Zebra ZQ320 hardware[cite: 1].
- [ ] **Statutory & Audit Dashboard (Backlog Item #9):** Build central compliance analytics panel tracking document expiry dates and periodic audit frequencies across all 13 properties[cite: 1].

---

## 5. Development & Deployment Operations

### Local Workspace Setup

```bash
# 1. Clone repository
git clone [https://github.com/agentdeepankar-del/diip-asset-survey.git](https://github.com/agentdeepankar-del/diip-asset-survey.git)
cd diip-asset-survey

# 2. Configure Environment
cp apps/web/.env.example apps/web/.env
# Set DATABASE_URL (Neon DB string) and JWT_SECRET inside apps/web/.env

# 3. Install Dependencies & Push Drizzle Schema
pnpm install
pnpm db:push

# 4. Launch Monorepo Services
pnpm dev
# Running services:
# - Next.js Web App & API: http://localhost:3000
# - Expo Mobile App: Launch via Metro Bundler (press 'i' for iOS, 'a' for Android)
```
