---
paths:
  - "app/**/*.tsx"
  - "app/**/*.ts"
  - "src/app/**/*.tsx"
  - "src/app/**/*.ts"
---

# Next.js App Router Rules

## Server vs Client components
- Default to Server Components — no `"use client"` unless necessary
- Add `"use client"` only when the file uses: state, effects, browser APIs, event handlers, or client-only libraries
- Fetch data in Server Components — not in client components
- Pass data down as props — don't duplicate fetches

## Routing
- File conventions: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`
- Every route segment that fetches data needs a `loading.tsx`
- Every route that can fail needs an `error.tsx` — error.tsx must be a client component
- Route groups `(group)/` for organization without affecting URL
- Parallel routes `@slot` and intercepting routes `(.)path` — only when intentional

## Data fetching
- Use `fetch` with Next.js caching options explicitly: `cache: 'force-cache'` or `cache: 'no-store'`
- Set `revalidate` for ISR pages
- Server actions for mutations — not API routes for internal data
- Never fetch in client components that could fetch server-side instead

## Metadata and SEO
- Export `metadata` or `generateMetadata` from every page
- Dynamic OG images via `opengraph-image.tsx`
- `robots.txt` and `sitemap.ts` at app root

## Performance
- `next/image` for all images — never `<img>`
- `next/link` for all internal navigation — never `<a>` for internal routes
- Dynamic imports (`next/dynamic`) for heavy client-only components
- Avoid client-side data fetching waterfalls — parallelize with `Promise.all`

## Environment variables
- Server-only: `process.env.SECRET`
- Client-exposed: `NEXT_PUBLIC_*` prefix required
- Validate env at startup with Zod or similar — fail fast on missing values
