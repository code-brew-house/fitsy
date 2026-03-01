# Bottom Nav Fix: AppShell.Footer

**Date:** 2026-03-01
**Status:** Approved

## Problem

Two bugs in the mobile bottom navigation bar:

1. **Doesn't spread to full device width** — the nav bar is narrower than the screen on mobile.
2. **Active indicator misaligned** — the indigo pill indicator doesn't sit above the correct tab (notably Leaderboard).

**Root cause:** The bottom nav was rendered as a `position: fixed` Box inside `MantineAppShell.Main`. Mantine's AppShell applies CSS padding and layout variables to `Main` that can affect `position: fixed` children, causing them to be offset from the true viewport edges. This makes `left: 0; right: 0` unreliable, and the indicator's `left: X%` calculation misaligns with actual tab positions.

## Solution

Replace the hand-rolled `position: fixed` Box with Mantine's built-in `AppShell.Footer` slot.

## Changes to `AppShell.tsx`

1. Add `footer={{ height: 60 }}` to `MantineAppShell` props.
2. Wrap the bottom nav content in `MantineAppShell.Footer` instead of a fixed `Box` inside `Main`.
3. Remove the manual `pb={isMobile ? 80 : 0}` bottom padding from the content `Box` — Mantine handles this automatically via the footer config.
4. Keep `hiddenFrom="sm"` on the Footer so it only appears on mobile.
5. Keep `paddingBottom: 'env(safe-area-inset-bottom, 0px)'` for iOS home bar clearance.

## No Changes

- Visual design of the nav bar (icons, labels, active colors) stays identical.
- Framer-motion indicator animation stays identical.
- Active tab detection logic stays identical.
