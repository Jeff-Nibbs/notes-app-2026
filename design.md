# Design — notes-app-2026

A locked design system for this app. Every page redesign reads this file before
emitting code. Do not regenerate per page — extend or amend this file when the
system needs to grow.

## Genre

atmospheric — "moody, thought-provoking" brief. Late-night instrument-grade
register, not decorative darkness.

## Theme

**Lumen**, both palette drops, switched by `prefers-color-scheme` (spec §6
requires both system themes fully styled):

- **Night Foundry** (dark mode) — cool-violet near-black canvas, molten-brass
  accent that *emits*.
- **Day Foundry** (light mode) — cool bone canvas with a violet pull, deep
  indigo accent that *refracts*.

Token source of truth: [`tokens.css`](tokens.css) (`--hm-*` names). The app's
shadcn-style names (`--background`, `--primary`, …) in `app/globals.css` are
aliases into the Lumen tokens — components only ever use the shadcn names or
the `u-*` / `panel` classes.

| role | Day Foundry (light) | Night Foundry (dark) |
| --- | --- | --- |
| paper | `oklch(0.97 0.008 265)` | `oklch(0.13 0.014 265)` |
| paper-2 (card) | `oklch(0.99 0.004 265)` | `oklch(0.168 0.016 265)` |
| paper-3 (recessed) | `oklch(0.936 0.012 265)` | `oklch(0.215 0.018 265)` |
| ink | `oklch(0.18 0.014 265)` | `oklch(0.96 0.006 262)` |
| ink-2 (muted) | `oklch(0.44 0.02 265)` | `oklch(0.68 0.014 265)` |
| rule (hairline) | `oklch(0.875 0.014 265)` | `oklch(0.27 0.02 265)` |
| accent | `oklch(0.46 0.24 268)` indigo | `oklch(0.76 0.17 50)` brass |
| danger | `oklch(0.5 0.19 25)` | `oklch(0.64 0.19 25)` |

## Typography — two registers

- **Display:** Bebas Neue 400 (`--font-bebas`, next/font).
  Chrome display text is **lowercase** (`.u-display`). User content set in the
  display face (note titles) is **never** case-transformed.
- **Body:** SF Pro via system font stack (`--font-sans`: `-apple-system,
  BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", ...`). SF Pro isn't
  distributable through next/font/google, so it resolves from the OS on Apple
  devices with sane fallbacks elsewhere.
- **Labels:** Geist Mono 500, 11px, `0.12em` tracking, **UPPERCASE**
  (`.u-label`) — panel titles, tags/badges, form labels, tab controls, status
  flags. Mono labels are the only uppercase surface. (Geist Mono substitutes
  for Lumen's canonical JetBrains Mono to preserve the project's font stack.)
- **No italics anywhere.** No gradient text. Button/chrome copy renders
  lowercase via CSS; string literals keep normal case where servers or
  screen readers consume them.

## App adaptation of Lumen (important)

This is an app, not a marketing page. The marketing signature moves
(apparatus, meter strip, three-stat row, verb-landmark headline) are **not
used**. What carries over:

- Blueprint grid canvas at ~4% + one faint emit wash from the top edge
  (`body` background in `app/globals.css`).
- Hairline cards lit from within (`.panel` — 1px rule + inner radial emission
  at ≤4% accent opacity). No drop shadows on cards; deep soft shadow only on
  elevated chrome (dialogs).
- Two-register typography, accent discipline (≤5% of any viewport), pill CTAs.
- **No backdrop blur / glassmorphism. No glowing orbs. No invented copy or
  metrics.**

## Spacing

Tailwind 4pt scale. Cards `p-4`/`p-6`; page gutter `px-3 sm:px-4`;
`max-w-5xl` shell. Tap targets ≥40px (spec: one-handed phone use at ~390px).

## Motion

- Transitions: colors/transform/opacity only, ~200–300ms, default easing;
  named easing token `--hm-ease-out` available for anything longer.
- Card hover: `-translate-y-0.5` + border brighten. Buttons: `active:translate-y-px`.
- Global `prefers-reduced-motion: reduce` collapse in `globals.css`.
- Focus rings appear instantly (never animated), `ring-2` accent at ≥3:1.

## Microinteractions stance

- Silent success — the mono `SAVED` flag, no toasts, no celebration.
- Optimistic updates preserved everywhere (todo toggle, pin toggle).
- Errors: small lowercase sentence in `--destructive`, inline.

## CTA voice

- Primary: pill, accent fill (`bg-primary text-primary-foreground`), lowercase.
- Secondary/outline: pill, hairline border, transparent fill.
- Ghost: muted text, accent-wash hover.

## Per-page allowances

- App pages (dashboard, notes, editor): typography + panels only. No
  enrichment, no apparatus.
- Login: the one "poster" surface — serif wordmark + mono eyebrow, still
  typography-only.

## What pages MUST share

- The lowercase serif `notes` wordmark (nav / login).
- Both Lumen drops exactly as tokenized — never a per-page palette.
- The two-register typography and the `.panel` card language.
- Pill CTA voice.

## What pages MAY differ on

- Panel composition and density (dashboard grid vs. list vs. document editor).
- Which register leads (editor is body-led; login is display-led).

## Exports

### tokens.css

See [`tokens.css`](tokens.css) at the project root — the canonical export.

### Tailwind v4 `@theme`

Already wired in `app/globals.css` (`@theme inline` maps `--color-*` and
`--font-*` onto the token layer).

### shadcn/ui CSS variables

Already wired in `app/globals.css` `:root` (`--background`, `--foreground`,
`--primary`, `--ring`, … alias the `--hm-*` tokens).
