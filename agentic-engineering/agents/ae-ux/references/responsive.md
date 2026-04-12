# Responsive Behavior

---

## Core principle

Mobile and desktop aren't just different widths — they're different interaction models.
Mobile = touch, thumb reach, small screen, intermittent attention.
Desktop = cursor precision, keyboard, large screen, sustained attention.

Responsive implementation isn't just making things fit — it's making things work for each context.

---

## Breakpoint checklist

- [ ] Does the layout work at the project's defined breakpoints?
  Common breakpoints: 375px (mobile), 768px (tablet), 1024px (desktop), 1440px (wide)
- [ ] Is there no content overflow or horizontal scroll on mobile?
- [ ] Do fixed/sticky elements stay in the right position on all screen sizes?
- [ ] Are touch targets large enough on mobile? (minimum 44×44px)
- [ ] Is text readable without zooming on mobile? (minimum 16px for body text)

---

## Layout behavior checklist

**Navigation:**
- [ ] Is mobile navigation (hamburger / bottom nav / drawer) implemented if the design calls for it?
- [ ] Does the desktop nav collapse correctly on mobile?
- [ ] Are navigation links reachable by thumb on mobile? (bottom of screen more reachable than top)

**Content reflow:**
- [ ] Do multi-column layouts stack correctly on mobile?
- [ ] Do tables become scrollable or reflow to card layout on mobile?
- [ ] Do side-by-side elements stack vertically on small screens?
- [ ] Is the reading order logical after reflow? (not: image → label → image → label on mobile)

**Images and media:**
- [ ] Are images responsive? (`max-width: 100%` or equivalent)
- [ ] Do images use appropriate sizes for their breakpoint? (not loading 1400px image on mobile)
- [ ] Do videos have correct aspect ratio containers so they don't cause layout shift?

---

## Mobile-specific checklist

- [ ] Are tap targets large enough and spaced apart? (avoid accidental taps on adjacent elements)
- [ ] Does the on-screen keyboard push content up correctly? (form fields remain visible)
- [ ] Are swipe gestures (if used) also accessible via buttons?
- [ ] Is content above the fold on mobile without excessive scrolling to reach primary action?
- [ ] Are modals full-screen or near-full-screen on mobile (not floating boxes that overflow)?
- [ ] Is horizontal swiping avoided for primary navigation? (conflicts with browser back gesture)

---

## Desktop-specific checklist

- [ ] Is the content max-width constrained on very wide screens? (full-width text at 1920px is unreadable)
- [ ] Are hover states implemented for interactive elements?
- [ ] Do dropdown menus work with keyboard navigation?
- [ ] Is extra whitespace used purposefully on wide layouts, not just empty margins?

---

## Common responsive bugs to flag

| Bug | What to check |
|---|---|
| Text overlapping image on mobile | Absolute positioning not adjusted for mobile |
| Button wider than screen | Missing `max-width` or `width: 100%` on mobile |
| Modal extends off screen | Missing `overflow: auto` or full-screen on mobile |
| Sidebar visible on mobile when should be hidden | Missing responsive show/hide |
| Two columns become two narrow unusable columns | Should stack, not squeeze |
| Fixed header covering content | Body needs `padding-top` matching header height |
