---
paths:
  - "**/*.tsx"
  - "**/*.jsx"
  - "src/**/*.ts"
---

# React + TypeScript Rules

## Components
- Functional components only — no class components
- One component per file, file named after the component (PascalCase)
- Props typed as interface, not type alias: `interface MyComponentProps { ... }`
- Default export the component; named exports for sub-components or types
- No `React.FC` — type props directly on the function signature

## Hooks
- Custom hooks start with `use` — enforces lint rule
- Hook dependencies must be explicit — never disable `react-hooks/exhaustive-deps` without comment explaining why
- Extract complex `useEffect` logic into a named custom hook
- Prefer `useCallback`/`useMemo` only when profiling shows need — premature memoization adds noise

## State management
- Local state: `useState` / `useReducer`
- Shared state: context for theme/auth/small shared state
- Server state: React Query / SWR — never store in global client state
- Form state: React Hook Form (registered here) — avoid controlled inputs for every field

## Styling
- Follow the project's styling solution consistently (Tailwind, CSS Modules, styled-components — pick one)
- No inline styles except for dynamic values
- Class composition via `clsx` or `classnames`

## Types
- No `any` — use `unknown` and narrow, or define the real type
- Prefer discriminated unions over optional fields for state variants
- Export component prop types when other components use them
