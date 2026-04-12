# Visual Consistency

This is not a pixel-perfection audit. It's a check for patterns that make the
UI feel inconsistent, unprofessional, or hard to read — things users notice even
if they can't articulate why.

---

## Spacing checklist

- [ ] Does spacing follow the project's spacing scale? (4px / 8px base grid, not arbitrary values)
- [ ] Is spacing consistent between similar elements? (all card paddings the same, all section gaps the same)
- [ ] Is there enough breathing room? Content shouldn't feel cramped against edges or each other
- [ ] Are related elements grouped visually? (closer together = belongs together)
- [ ] Is there consistent padding between screen edge and content?

**Flag:** A component with `padding: 13px` when everything else uses 8px/16px grid. Cards with different internal padding in the same list.

---

## Typography checklist

- [ ] Are font sizes from the project's type scale? (not arbitrary sizes)
- [ ] Is there clear visual hierarchy? (headings larger than body, labels smaller than values)
- [ ] Is body text readable at its size? (minimum ~14px for most interfaces)
- [ ] Are font weights used consistently? (bold for emphasis, not just for decoration)
- [ ] Is line height adequate? (1.4-1.6x for body text, tighter for headings)
- [ ] Are text styles consistent between similar screens in this feature?

**Flag:** H1 on one screen, H2 on another for the same semantic level. Random mix of font sizes not in the type scale.

---

## Color checklist

- [ ] Are colors from the design system / token set? (not hardcoded hex values)
- [ ] Is color used consistently for the same purposes? (red = error, green = success, everywhere)
- [ ] Are interactive elements distinguishable from non-interactive ones?
- [ ] Does link color match the rest of the app?
- [ ] Are disabled states visually distinct but not using color alone?
- [ ] Is enough contrast maintained? (see accessibility.md for specifics)

**Flag:** A success message using a different shade of green than the rest of the app. Error state using orange instead of red.

---

## Layout checklist

- [ ] Is the visual hierarchy clear? (most important element draws eye first)
- [ ] Are CTAs prominent enough? (primary action visually dominant)
- [ ] Is there only one primary CTA per screen? (two equal primary buttons = no hierarchy)
- [ ] Are lists consistent? (all items same height/structure unless explicitly variable)
- [ ] Are modals and overlays sized appropriately? (not full-screen for simple confirmations)
- [ ] Is content alignment consistent? (left-aligned text, consistent icon placement)

---

## Icon and image checklist

- [ ] Are icons from the same icon set / same style?
- [ ] Are icons consistent in size within the same context?
- [ ] Do icons have text labels when their meaning isn't universally obvious?
- [ ] Are images shown with aspect ratios preserved? (no stretched images)
- [ ] Do images have alt text or aria-label?
- [ ] Are loading states handled for images? (skeleton or blur-up, not broken image icon)

---

## What NOT to flag

- Pixel-level differences from the design comp (2px off is not a blocker)
- Font rendering differences between design tool and browser
- Exact color hex matching between Figma and CSS (slight rendering differences are normal)
- Subjective aesthetic preferences not reflected in the design spec
