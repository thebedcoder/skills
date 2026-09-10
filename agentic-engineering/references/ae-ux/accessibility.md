# Accessibility

Focus on the things that actually block users — not exhaustive WCAG compliance,
but the issues that affect keyboard users, screen reader users, and users with
low vision most often.

---

## Keyboard navigation checklist

- [ ] Can every interactive element be reached by Tab key?
- [ ] Is the tab order logical? (follows visual reading order, not DOM order if they differ)
- [ ] Is focus visible at all times? (no `outline: none` without a custom focus style)
- [ ] Can modals be closed with Escape key?
- [ ] Are dropdowns/menus navigable with arrow keys?
- [ ] After a modal closes, does focus return to the element that opened it?
- [ ] Are focus traps implemented for modals? (Tab should cycle within the modal, not behind it)

**This is the most commonly broken category.** Check that you can navigate the entire story's UI using only Tab, Shift+Tab, Enter, Space, and arrow keys.

---

## Screen reader checklist

- [ ] Do images have `alt` text? (decorative images have `alt=""`)
- [ ] Do icon buttons have `aria-label`? (a button with only an icon and no text needs a label)
- [ ] Do form inputs have associated `<label>` elements? (or `aria-label` / `aria-labelledby`)
- [ ] Are error messages associated with their input? (`aria-describedby` linking input to error)
- [ ] Are dynamic updates announced? (`aria-live` for toasts, status messages, async content changes)
- [ ] Does the page have a logical heading structure? (h1 → h2 → h3, no skipping levels)
- [ ] Are custom interactive components using correct ARIA roles? (a div used as button needs `role="button"`)

---

## Color and contrast checklist

Minimum contrast ratios (WCAG AA):
- Normal text (< 18px): **4.5:1**
- Large text (≥ 18px or bold ≥ 14px): **3:1**
- UI components and icons: **3:1**

- [ ] Is body text contrast sufficient against its background?
- [ ] Is placeholder text contrast sufficient? (common failure — placeholders are often too light)
- [ ] Are error messages readable? (red on white is usually fine, red on orange is not)
- [ ] Is information conveyed by color alone? (always pair color with icon, text, or pattern)
- [ ] Do focus indicators have sufficient contrast against surrounding elements?

**Quick check:** If you desaturate the screen, can you still distinguish all meaningful states?

---

## Motion and animation checklist

- [ ] Does animation respect `prefers-reduced-motion`?
  ```css
  @media (prefers-reduced-motion: reduce) {
    * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
  }
  ```
- [ ] Are there no flashing elements? (> 3 flashes/second can trigger seizures)
- [ ] Do auto-playing animations have pause controls?

---

## Touch and mobile accessibility

- [ ] Are touch targets at least 44×44px?
- [ ] Are closely spaced targets far enough apart to avoid accidental activation?
- [ ] Does the interface work in both portrait and landscape orientation?

---

## What NOT to flag as accessibility issues

- Missing ARIA landmarks (`<main>`, `<nav>`) — helpful but not critical
- Missing `lang` attribute on `<html>` — important for screen readers but not a UX blocker
- WCAG AAA requirements (contrast > 7:1, sign language for video) — beyond baseline
- Perfect WCAG compliance for every edge case — focus on the common failure modes above
