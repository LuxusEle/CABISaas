# CabEngine Pro — SEO Implementation Plan

Based on `cabengine_seo_blueprint.md` analysis of the CABISaas codebase.

---

## Current State Summary

| Aspect | Status |
|--------|--------|
| Framework | Vite + React 18 SPA (no SSG/SSR) |
| Routing | `react-router-dom` v7, client-side only |
| Head management | None — single `<meta description>` in `index.html` |
| JSON-LD | None |
| robots.txt | None |
| sitemap.xml | None |
| Canonical URLs | None |
| Per-page meta | None |
| Public routes | `/`, `/pricing`, `/docs`, `/terms`, `/testing`, `/embed/setup` |
| Auth-protected | `/dashboard`, `/setup`, `/walls`, `/bom`, `/profile`, `/admin` |
| Deployment | Vercel with SPA rewrites to `index.html` |

---

## Phase 1 — Foundation SEO

**Goal:** Basic SEO infrastructure — meta tags, structured data, crawler files.

### 1.1 Add `react-helmet-async`

Install package for per-page `<head>` control:

```bash
npm install react-helmet-async
```

- Wrap `<App />` in `<HelmetProvider>` in `src/index.tsx`
- Use `<Helmet>` in each page component to set `<title>`, meta description, OG tags, etc.

### 1.2 Inject Global Meta & JSON-LD in Root

In `src/App.tsx`, add a `<Helmet>` with:

- `<title>` — `CabEngine Pro | 3D Cabinet Design Software & Cut List Optimizer`
- `<meta name="description">` — Professional-grade cloud-based cabinet design software...
- `<meta name="robots">` — `index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1`
- `<link rel="canonical">` — `https://www.protradee.com/`
- Open Graph tags (`og:type`, `og:title`, `og:description`, `og:url`, `og:site_name`)
- JSON-LD `SoftwareApplication` schema with Free + Pro offers (from blueprint §4)

### 1.3 Create `public/robots.txt`

```txt
User-agent: *
Allow: /

Sitemap: https://www.protradee.com/sitemap.xml
```

### 1.4 Create `public/sitemap.xml`

List all public routes with appropriate priorities and change frequencies:

| Path | Priority | Change frequency |
|------|----------|-----------------|
| `/` | 1.0 | weekly |
| `/pricing` | 0.9 | monthly |
| `/docs` | 0.8 | weekly |
| `/terms` | 0.3 | yearly |
| `/embed/setup` | 0.7 | monthly |

(Target: `/embed-cabinet-planner`, `/manual-cabinet-software`, `/cut-list-generator` added in Phase 3.)

### 1.5 Per-Page SEO

Update each public page component to set its own `<Helmet>`:

| Route | Title | Description keywords |
|-------|-------|---------------------|
| `/` | CabEngine Pro | 3D cabinet design, cloud-based, cabinet software |
| `/pricing` | Pricing - CabEngine Pro | Pro subscription, cabinet design software pricing |
| `/docs` | Documentation - CabEngine Pro | cabinet software docs, API, integration guide |
| `/terms` | Terms of Service - CabEngine Pro | |
| `/embed/setup` | Embedded Cabinet Planner - CabEngine Pro | embeddable cabinet configurator |

---

## Phase 2 — SSG / Prerendering

**Goal:** Fix SPA crawlability — serve static HTML to crawler bots.

### 2.1 Install Prerender Plugin

```bash
npm install -D vite-plugin-prerender
```

### 2.2 Configure `vite.config.ts`

Add the plugin to pre-render public routes at build time:

```ts
import { VitePluginPrerender } from 'vite-plugin-prerender'

VitePluginPrerender({
  routes: ['/', '/pricing', '/docs', '/terms', '/testing', '/embed/setup'],
  renderer: '@prerenderer/renderer-puppeteer',
})
```

Exclude auth-protected routes (`/dashboard`, `/walls`, `/setup`, `/bom`, `/profile`, `/admin`).

### 2.3 Update Vercel Config

Update `vercel.json` to serve pre-rendered HTML files with proper cache headers:

- Static pages (pre-rendered) → long-lived cache (`public, max-age=31536000, immutable`)
- `index.html` (SPA fallback) → no-cache

### 2.4 Verify Crawlability

After deployment, use Google Search Console's URL Inspection Tool to verify Googlebot sees rendered HTML content.

---

## Phase 3 — New Landing Pages

**Goal:** Capture B2B keyword traffic with dedicated landing funnels.

### 3.1 `/embed-cabinet-planner` — Widget API Page

**Target keywords:** `3d kitchen planner iframe embed`, `cabinet configurator widget for website`, `white label cabinet software api`

**Content:**
- Hero: "Add a 3D Cabinet Designer to Your Website in Minutes"
- Live demo iframe showing the embed in action (use existing `/embed/setup`)
- Copy-paste HTML code block (from blueprint §4)
- Security section: domain whitelisting, API key management, event listening model
- Pricing / CTA to sign up

**Route:** Add to `App.tsx` as public route.

### 3.2 `/manual-cabinet-software` — Advanced Direct Entry Page

**Target keywords:** `manual cabinet layout software`, `cabinet cut list generator no auto solver`, `custom cabinet box width entry`

**Content:**
- Hero: "Full Control Cabinet Design — No Auto-Layout Lock-In"
- Feature list: manual override for carcass sides, door tolerances, drawer depths, back panel channels
- Comparison table: Auto Mode vs Advanced Direct Entry
- CTA: "Start Building"

**Route:** Add to `App.tsx` as public route.

### 3.3 `/cut-list-generator` — Nesting Optimization Hub

**Target keywords:** `plywood sheet nesting tool online`, `automated panel optimization software`, `minimize sheet waste calculator`

**Content:**
- Hero: "Reduce Sheet Waste by up to 30%"
- Explain the calculation loop behind layout generation
- Feature: multiple sheet thicknesses, accessory profiles, financial cards (Raw Sheet Totals, Hardware Costs, Assembly Time, Final Quote)
- Before/after metrics or calculator
- CTA: "Try the Optimizer"

**Route:** Add to `App.tsx` as public route.

---

## Phase 4 — Keyword & Content Optimization

**Goal:** Naturally integrate target keywords into existing content.

### 4.1 Update Existing Pages

| Page | Keywords to weave in |
|------|---------------------|
| Landing (`/`) | 3D cabinet design software, cloud-based cabinet engineering, cabinet BOM generator |
| Docs (`/docs`) | cabinet configurator API, cabinet software integration, embeddable 3D planner |
| Pricing (`/pricing`) | cabinet design software pricing, pro subscription, white label cabinet software |
| Embed route (`/embed/setup`) | (already relevant, but add: iframe cabinet planner, embeddable configurator) |

### 4.2 Canonical URLs

Add `<link rel="canonical">` to every public page via `react-helmet-async` (already covered in Phase 1.2 but ensure per-page override where needed).

### 4.3 Google Search Console & Sitemap Submission

**Step 1 — Add property in Search Console**
1. Go to https://search.google.com/search-console
2. Sign in with the Google account that manages `protradee.com`
3. Choose **"URL prefix"** and enter `https://www.protradee.com/`
4. Select **"DNS"** verification method
5. Copy the TXT record value provided

**Step 2 — Add DNS TXT record (via domain registrar / DNS provider)**
1. Log in to your DNS provider (e.g., Cloudflare, Namecheap, GoDaddy)
2. Add a new TXT record:
   - **Name/Host:** `@` (or `protradee.com`)
   - **Value:** the TXT record from step 1
   - **TTL:** 300 (or default)
3. Wait up to 30 minutes for propagation, then click **"Verify"** in Search Console

**Step 3 — Submit sitemap**
1. In Search Console, go to **Sitemaps** (left sidebar)
2. Enter `https://www.protradee.com/sitemap.xml`
3. Click **Submit**
4. Verify status shows "Success" — you should see 8 URLs discovered

**Step 4 — Monitor**
- **Coverage** — check for crawl errors or pages excluded from indexing
- **Mobile Usability** — fix any issues found
- **Core Web Vitals** — verify LCP, FID, CLS are passing
- **URL Inspection** — test a few URLs (e.g., `/`, `/pricing`, `/docs`) to confirm Googlebot sees the pre-rendered HTML with all meta tags and JSON-LD

---

## Phase 5 — Backlink & Growth

**Goal:** Earn high-authority backlinks from relevant communities.

### 5.1 Create Utility Assets

Production-ready downloadable resources (unbranded):

- **DXF blocks** — sample cabinet templates (door styles, joinery details)
- **BOM spreadsheets** — blank material takeoff templates with formulas
- **Layout templates** — common kitchen layouts in PDF/DXF format

Host these on the site with a download page and naturally earn references from forums.

### 5.2 Community Placements

- **Reddit:** `r/cabinetry`, `r/woodworking` — post case studies solving specific manufacturing issues
- **Woodweb:** technical forum posts with embedded utility assets
- **Format:** value-first, no generic links. Frame as "How we solved X problem using automated nesting"

---

## Execution Order

```
Phase 1 ─────────────────────────────── (highest impact, ~1-2 days)
  ├── 1.1 react-helmet-async setup
  ├── 1.2 Global meta + JSON-LD in App.tsx
  ├── 1.3 robots.txt
  ├── 1.4 sitemap.xml
  └── 1.5 Per-page Helmet for each public route

Phase 2 ─────────────────────────────── (~1 day)
  ├── 2.1 Install prerender plugin
  ├── 2.2 Configure vite.config.ts
  └── 2.3 Update Vercel cache headers

Phase 3 ─────────────────────────────── (~2-3 days)
  ├── 3.1 /embed-cabinet-planner page
  ├── 3.2 /manual-cabinet-software page
  └── 3.3 /cut-list-generator page

Phase 4 ─────────────────────────────── (~1 day)
  ├── 4.1 Keyword integration into existing pages
  └── 4.3 Search Console setup

Phase 5 ─────────────────────────────── (ongoing)
  ├── 5.1 Utility asset creation
  └── 5.2 Community engagement
```

---

## Files That Will Be Modified

| File | Phase |
|------|-------|
| `src/index.tsx` | 1.1 — wrap in `<HelmetProvider>` |
| `src/App.tsx` | 1.2 — global Helmet + JSON-LD; 3.1-3.3 — new routes |
| `src/components/LandingPage.tsx` | 1.5 — per-page Helmet; 4.1 — keyword content |
| `src/components/PricingPage.tsx` | 1.5, 4.1 |
| `src/components/DocsPage.tsx` | 1.5, 4.1 |
| `src/pages/TermsPage.tsx` | 1.5 |
| `src/screens/ScreenEmbedSetup.tsx` | 1.5 |
| `public/robots.txt` | 1.3 — new file |
| `public/sitemap.xml` | 1.4 — new file |
| `vite.config.ts` | 2.2 — prerender plugin |
| `vercel.json` | 2.3 — cache headers |
| `src/components/EmbedCabinetPlannerPage.tsx` | 3.1 — new file |
| `src/components/ManualCabinetSoftwarePage.tsx` | 3.2 — new file |
| `src/components/CutListGeneratorPage.tsx` | 3.3 — new file |
| `package.json` | 1.1 — new dependency |
