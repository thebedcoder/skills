# Interaction States

Every interactive screen has multiple states. All of them need to be implemented.
Missing states are the most common frontend UX bug — they make the app feel broken
or leave users stuck.

---

## Required states checklist

For every screen or component in this story, check:

### Loading state
- [ ] Is there a visible loading indicator while data fetches?
- [ ] Is it a skeleton screen or spinner? (Skeleton preferred for content-heavy layouts)
- [ ] Are interactive elements disabled during loading? (prevent double-submit)
- [ ] Is the loading state shown on the *first* load, not just refreshes?

**Bad:** Blank white screen while fetching. Layout shift when data arrives.
**Good:** Skeleton that matches the loaded layout shape. Buttons disabled during submit.

### Empty state
- [ ] What does the user see when there's no data yet?
- [ ] Is the empty state helpful? Does it explain what to do next?
- [ ] Is it different from the loading state? (blank ≠ empty)
- [ ] For lists: does the empty state appear when filters return 0 results too?

**Bad:** Empty list with no message. Same blank screen as loading.
**Good:** Illustration or icon + explanation + action ("No orders yet — start shopping").

### Error state
- [ ] What happens when the API call fails?
- [ ] Is there an error message visible to the user (not just console)?
- [ ] Can the user retry without refreshing the page?
- [ ] Is the error message specific enough to be actionable?
- [ ] Are network errors handled separately from application errors?

**Bad:** Spinner that never stops. White screen on failure. Generic "Something went wrong".
**Good:** Error message + retry button. "Couldn't load orders — check your connection" + Retry.

### Disabled state
- [ ] Are buttons disabled when their action isn't available?
- [ ] Is it visually clear why something is disabled? (tooltip or helper text)
- [ ] Are disabled elements still accessible (focusable with tab, readable by screen readers)?

### Success state
- [ ] Is there confirmation after a successful action?
- [ ] Is the confirmation proportionate? (toast for minor, full page for major)
- [ ] Does the UI update to reflect the change, or just show a message?

---

## Transition and feedback timing

- [ ] Do actions feel instant? (< 100ms feedback for taps/clicks)
- [ ] Are loading indicators shown after ~200ms delay? (avoid flicker for fast loads)
- [ ] Do success/error toasts auto-dismiss at an appropriate time? (3-5s for info, longer for errors)
- [ ] Do animations respect `prefers-reduced-motion`?

---

## Common missing states

These are the ones most often forgotten:

| Scenario | Missing state |
|---|---|
| List with search/filter | Zero results state |
| Async form submit | Submitting state (button disabled, spinner) |
| Paginated list | Last page / end of results indicator |
| Real-time data | Stale data / reconnecting indicator |
| File upload | Upload progress, upload error, file too large |
| Delete action | Confirmation dialog before destructive action |
