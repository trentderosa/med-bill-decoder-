# Med Bill Decoder

Upload a photo or PDF of a medical bill or Explanation of Benefits (EOB) and get:

- **Plain-English line items** — every code and charge, explained
- **Error flags** — duplicate charges, upcoding, unbundling, surprise balance bills (No Surprises Act)
- **An estimate of what you actually owe**
- **A dispute letter** you can edit and send

> **Status:** scaffold only. The upload area and sample bills are placeholders marked "coming soon".

## Privacy stance

> Demo only. Use fake sample bills — never upload real patient information. Nothing is stored. Educational, not legal or medical advice.

This disclaimer is rendered on every page via the root layout (`src/components/Disclaimer.tsx`).

- No database, no accounts, nothing persisted.
- No analytics or tracking.
- No external API calls and no secrets in the repo.
- No external fonts or assets fetched at build or run time (system font stack only).

## Stack

Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS v4 · ESLint 9 (flat config) · Vitest + Testing Library

## Getting started

Requires Node.js 20.19+ and npm.

```bash
npm ci
npm run dev
```

Then open http://localhost:3000.

## Scripts

| Script              | What it does                                        |
| ------------------- | --------------------------------------------------- |
| `npm run dev`       | Start the dev server                                |
| `npm run build`     | Production build                                    |
| `npm start`         | Serve the production build                          |
| `npm run lint`      | ESLint (`next/core-web-vitals` + `next/typescript`), fails on warnings |
| `npm run typecheck` | `tsc --noEmit`                                      |
| `npm test`          | Run the Vitest suite once (jsdom)                   |

CI (`.github/workflows/ci.yml`) runs lint, typecheck, test, and build on every pull request and on pushes to `main`.

## Project layout

```
src/
  app/          layout.tsx (shell + disclaimer), page.tsx (home), globals.css
  components/   Disclaimer, Header, UploadPlaceholder, SampleBills, BillView (+ tests)
  data/         Fake sample bills (+ tests)
  lib/          flagEngine (pure rule-based flags + owed estimate), plainEnglish, sources, format (+ tests)
  test/         Vitest setup
```
