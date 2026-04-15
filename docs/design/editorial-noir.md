# CollabSphere — Editorial Noir Design System

> Version 2. Supersedes the Notion UI/UX Direction page (09) and the Sprint 1 design tokens.
> Adopted 2026-04-15.

## Thesis

CollabSphere is not a SaaS template. It is a premium editorial portfolio magazine for creators and brands. Every screen should feel like a spread from a monochrome art book, not a dashboard. Content wins. Chrome disappears.

The aesthetic is **Editorial Noir**: ink-black backgrounds, cream-on-ink type, hairline rule structure, one amber accent used sparingly, and display typography that carries the hierarchy.

## Core principles

1. **Typography does the heavy lifting.** Scale and weight create hierarchy. Color does not.
2. **One accent, used sparingly.** Amber appears only at interactive moments: button hover, focus rings, verified badges, link underlines.
3. **Rule lines, not cards.** Hairline horizontal rules separate content. No nested card on card stacking.
4. **Grid broken editorial layout.** 12 column grid with content spanning odd combinations (3+7, 2+8, 5+7). Content pushes left, breathing room right.
5. **Generous negative space.** Minimum 64px vertical rhythm between sections on desktop, 48px on mobile.
6. **Restraint in motion.** Slow (0.5s), smooth easeOutExpo, staggered on page load. No bouncy springs.
7. **No dashes in UI copy.** Period, comma, parenthesis only.

## Typography

| Purpose | Font | Reason |
|---|---|---|
| Display | **Fraunces** (variable serif, Google Fonts) | Optical size axis lets headlines feel dramatic at 96px and composed at 28px. Gives immediate editorial character. |
| Body | **Inter** (kept from Sprint 1) | Excellent screen legibility. Familiar, not distracting. |
| Mono | **JetBrains Mono** (kept from Sprint 1) | IDs, timestamps, section numbers, code. |

### Fraunces axes

- Optical size: 144 at display sizes, 72 at section headlines, 24 at H3 and smaller
- Soft: 30 (slight warmth without cartoon)
- Weights: 300 for hero display, 400 for page titles, 500 for section heads

### Scale

| Token | Font | Size | Line | Tracking | Weight | Usage |
|---|---|---|---|---|---|---|
| `display-xl` | Fraunces | 96px | 0.95 | -0.02em | 300 | Hero profile names |
| `display-l` | Fraunces | 72px | 1.0 | -0.015em | 400 | Page titles |
| `display-m` | Fraunces | 48px | 1.05 | -0.01em | 400 | Hero subtitles |
| `h1` | Fraunces | 36px | 1.1 | -0.01em | 500 | Card headlines |
| `h2` | Fraunces | 28px | 1.15 | 0 | 500 | Section headers |
| `h3` | Inter | 20px | 1.3 | 0 | 600 | Subsections |
| `body-l` | Inter | 17px | 1.55 | 0 | 400 | Primary bio, intro copy |
| `body-m` | Inter | 15px | 1.6 | 0 | 400 | Default body |
| `body-s` | Inter | 13px | 1.5 | 0 | 400 | Metadata, captions |
| `eyebrow` | Inter | 11px | 1.0 | 0.12em | 600 | UPPERCASE section markers |
| `label` | Inter | 12px | 1.3 | 0.05em | 500 | UPPERCASE form labels |
| `mono` | JetBrains Mono | 13px | 1.0 | 0 | 400 | IDs, section numbers |

### Eyebrows — the signature

Every section gets a numbered eyebrow set in tracked uppercase Inter above the Fraunces headline. Examples:

```
01 / CREATOR
02 / IDENTITY
03 / COLLABORATION
```

This small detail is the thing you will remember. Do not skip it.

## Color palette

Dark only. Values in OKLCH would be cleaner but hex is kept for Tailwind compatibility.

```css
/* Ink scale — backgrounds */
--ink-0: #09090B;   /* page background, deepest */
--ink-1: #111113;   /* elevated panel surface */
--ink-2: #18181B;   /* input background, secondary panel */
--ink-3: #27272A;   /* hover state */

/* Line */
--line-subtle: #1F1F22;   /* hairlines between sections */
--line: #2E2E33;          /* input borders, dividers */
--line-strong: #3F3F46;   /* focus rings, heavy borders */

/* Paper — foreground */
--paper: #F5F0E6;         /* primary text, headlines, cream parchment */
--paper-dim: #A1A1AA;     /* secondary text, metadata */
--paper-muted: #52525B;   /* timestamps, hints */

/* Accent (used sparingly) */
--amber: #D4A056;         /* interactive accent, verified, focus */
--amber-dim: #927146;     /* amber on hover backgrounds */

/* Semantic */
--sage: #7AC29A;          /* success, verified badge */
--rust: #D66B6B;          /* error, destructive */
```

Rule: 90% of any screen is `--ink-0` with `--paper` text. Amber appears in at most 2 or 3 moments per screen. No gradients. No glows. No glass morphism. No soft shadows.

## Spatial system

4px base grid. Vertical rhythm scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 160.

| Context | Desktop | Mobile |
|---|---|---|
| Section padding top | 96px | 48px |
| Section padding bottom | 64px | 32px |
| Content max width | 1200px | 100% |
| Hero content max width | 1440px | 100% |
| Gap between fields | 32px | 24px |

## Component language

### Buttons
- **Primary**: cream fill, ink text, 1px solid paper border, 2px radius, 14x28px padding, Inter 14px/500. Hover: amber fill, ink text.
- **Outline**: transparent fill, 1px solid line-strong, cream text. Hover: ink-2 background.
- **Ghost / link**: underline link style, cream text, amber underline on hover. No padding box.
- No rounded pills. No gradient buttons. No shadow.

### Inputs
- Zero box outline. Bottom rule only: 1px solid `--line`, becomes amber on focus.
- Label sits above in eyebrow style.
- Value typeset in 17px Inter.
- Flush left, no input box padding.
- Error state: rule becomes rust.

### Pills (niche tags)
- Sharp corners (0 radius). 1px solid line. 6x12px padding. Inter 11px/600 UPPERCASE. Letter-spacing 0.08em.
- Selected: paper background, ink text, same border, no radius.
- NOT rounded-full. That is the SaaS cliche.

### Avatars
- Square by default. 1px cream border with 2px inset offset. Sizes: 48, 64, 80, 120.
- Fallback (no image): initials set in Fraunces display, centered, ink-2 background.

### Images
- Full bleed hero cover. No rounded corners.
- Portfolio grid: square tiles, 0 gap, 1px line-subtle between.

### Motion

Framer Motion only. Shared constants:

```typescript
// client/src/lib/motion.ts
export const ease = [0.16, 1, 0.3, 1] as const;        // easeOutExpo
export const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease },
};
export const stagger = (index: number) => ({
  ...fadeUp,
  transition: { duration: 0.5, ease, delay: index * 0.06 },
});
```

No hover wobbles. Hover state changes are color and weight only, with 150ms linear transition.

## Layout patterns

### Page skeleton

```
┌──────────────────────────────────────────────────────┐
│ top nav (64px, 1px bottom rule)                      │
├──────────────────────────────────────────────────────┤
│                                                       │
│ 96px                                                  │
│                                                       │
│ eyebrow:  01 / PROFILE                                │
│ 16px                                                  │
│ display headline (Fraunces 72px, spans 8 cols)        │
│ 32px                                                  │
│                                                       │
│ body content                                          │
│                                                       │
│ 96px                                                  │
├──────────────────────────────────────────────────────┤
│ footer (optional, 1px top rule)                      │
└──────────────────────────────────────────────────────┘
```

### Profile view hero (the signature moment)

```
┌────────────────────────────────────────────────────────┐
│ eyebrow:  01 / CREATOR                                 │
│                                                         │
│                                                         │
│  Aarav                                  ┌────────────┐ │
│  Sharma                                  │  avatar   │ │
│                                           │  80x80    │ │
│                                           │  square   │ │
│                                           └────────────┘│
│  ─────────────────────────────────── 1px line           │
│  mumbai, india                                          │
│                                                         │
└────────────────────────────────────────────────────────┘
```

Name wraps to two lines on purpose when it fits. Fraunces 96px/300/line-height 0.95, tracking -0.02em. Avatar flush right.

### Edit form

Single column, 480px max width, left-aligned. Each field is vertical: eyebrow label → input rule → value. 32px between fields. Save button sits bottom-left, no container, text button treatment only.

## Copy tone

Terse, declarative, confident. No exclamation marks. No "Let's...", "awesome", "great", "success!". Headlines are short. Labels are single words when possible. Verbs over nouns. Never emoji unless Sarvesh explicitly asks.

| Don't | Do |
|---|---|
| "Let's build your profile!" | "No profile yet. Create one." |
| "Profile saved successfully!" | "Saved." |
| "My Profile" (nav) | "Profile" |
| "Browse Creators" | "Discover" |
| "Send a Message" | "Message" |

## Implementation rules for engineering

1. Load **Fraunces** via `next/font/google` in `client/src/app/layout.tsx` with axes `['SOFT', 'opsz', 'wght']`. Expose as `--font-display`.
2. Keep the existing Inter load. Expose as `--font-body`.
3. Move all Editorial Noir tokens into `client/src/app/globals.css` CSS variables.
4. Tailwind `@theme inline` block maps CSS variables to utility names.
5. Add shared utilities: `font-display`, `font-body`, `font-mono`, `text-paper`, `text-paper-dim`, `bg-ink-0`, `bg-ink-1`, `border-line`, `accent-amber`.
6. Delete all references to `rounded-card`, `rounded-pill`, `accent-primary`, `accent-secondary`, `accent-soft`. These are the old Sprint 1 tokens.
7. Shared motion constants live at `client/src/lib/motion.ts`.
8. Any new component must use the type scale tokens. No arbitrary `text-[17px]`.

## What this replaces

- **Notion page 09 (UI/UX Direction)**: superseded. Old tokens (`#6C63FF` purple, `bg-primary` blue-black, rounded-card 12px, rounded-pill) are deprecated.
- **Old memory file `project_collabsphere_ui_design.md`**: rewritten to point here.
- **Sprint 1 `globals.css`**: rewritten in Sprint 2 Task 15a.

Sprint 1 auth pages will be migrated in a future sprint. Sprint 2 frontend ships the profile pages in the new system. The two will visually differ until the migration.
