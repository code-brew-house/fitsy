# PWA Install Button Design

**Date:** 2026-03-01
**Status:** Approved

## Problem

`PwaInstallButton` exists but:
1. Has `visibleFrom="sm"` — hidden on mobile screens
2. Only handles Android Chrome (`beforeinstallprompt`), not iOS Safari

## Solution

Rework `PwaInstallButton.tsx` to be visible on all screen sizes and handle both platforms.

## Behaviour

### Visibility
- Hidden if app is already installed (`display-mode: standalone`)
- Hidden if neither Android install prompt is available nor iOS is detected
- Desktop: Button with "Install" text label (unchanged)
- Mobile: Icon-only `ActionIcon` (download icon) to save header space

### Android / Chrome
- Listen for `beforeinstallprompt` (existing logic)
- Tap → native OS install sheet

### iOS Safari
- Detect iOS via `navigator.userAgent` on mount
- `beforeinstallprompt` never fires on iOS — show `ActionIcon` instead
- Tap → Mantine `Modal` with three steps:
  1. Tap the Share button (⎙) in your browser toolbar
  2. Scroll down and tap "Add to Home Screen"
  3. Tap "Add" to confirm

## State

| Variable | Type | Purpose |
|---|---|---|
| `deferredPrompt` | `BeforeInstallPromptEvent \| null` | Android install prompt |
| `isIos` | `boolean` | iOS Safari detected |
| `isStandalone` | `boolean` | Already installed as PWA |
| `iosModalOpen` | `boolean` | Controls iOS instructions modal |

## Files

- Modify: `apps/web/src/components/PwaInstallButton.tsx`
- No changes to `AppShell.tsx` (component already rendered in header)
