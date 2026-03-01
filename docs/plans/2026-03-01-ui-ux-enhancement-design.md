# Fitsy UI/UX Enhancement Design

**Date**: 2026-03-01
**Status**: Approved
**Approach**: Big Bang Redesign — all pages, motion system, PWA, and rebrand simultaneously

## Vision

Transform Fitsy from a clean Mantine app into an **energetic, gamified** family fitness experience with bold flat colors, celebration animations, native-app PWA feel, and delightful micro-interactions. Think Duolingo's energy level applied to a family fitness tracker.

---

## 1. Color Palette (Full Rebrand)

No gradients. Pure flat colors. Energy comes from bold color blocking.

### Primary Palette

| Role | Name | Hex | Usage |
|------|------|-----|-------|
| **Primary** | Electric Indigo | `#6C5CE7` | Buttons, active nav, CTAs |
| **Secondary** | Hot Coral | `#FF6B6B` | Notifications, streaks (4-6 days), urgency |
| **Accent** | Sunshine Yellow | `#FECA57` | Stars, achievements, gold rewards |
| **Success** | Mint Green | `#00D2D3` | Completed states, positive feedback |
| **Energy** | Vivid Orange | `#FF9F43` | Points, flames, energy meters |

### Neutral Palette

| Role | Light | Dark | Usage |
|------|-------|------|-------|
| **Background** | `#F8F9FC` | `#1A1B2E` | Page bg |
| **Surface** | `#FFFFFF` | `#242540` | Cards, modals |
| **Surface Elevated** | `#F1F3F8` | `#2D2E4A` | Hover, secondary |
| **Text Primary** | `#2D3436` | `#F5F6FA` | Headings, body |
| **Text Secondary** | `#636E72` | `#A4A6B8` | Captions |
| **Border** | `#DFE6E9` | `#3D3E5C` | Dividers |

### Semantic Colors

- **Streak Fire**: Orange `#FF9F43` (1-3d) → Coral `#FF6B6B` (4-6d) → Indigo `#6C5CE7` (7+d)
- **Rank Podium**: Gold `#FECA57`, Silver `#A4A6B8`, Bronze `#E17055`
- **Points**: Always Orange `#FF9F43`
- **Destructive**: Red `#E74C3C`

---

## 2. Typography

**Font**: Plus Jakarta Sans (Google Fonts, free)

| Element | Weight | Size |
|---------|--------|------|
| Display | 800 | 2rem / 32px |
| H1 | 700 | 1.5rem / 24px |
| H2 | 700 | 1.25rem / 20px |
| H3 | 600 | 1.125rem / 18px |
| Body | 400 | 1rem / 16px |
| Small | 500 | 0.875rem / 14px |
| Micro | 600 | 0.75rem / 12px |

### Component Tokens

| Token | Old | New |
|-------|-----|-----|
| Border radius | `md` (8px) | `lg` (12px) |
| Card style | `withBorder` flat | Shadow `0 2px 8px rgba(0,0,0,0.06)` + border |
| Button radius | `md` | `xl` (pill) for primary CTAs |
| Card padding | `md` | `lg` |
| Icon sizes | Mixed | nav=24px, inline=18px, feature=32px |

---

## 3. Motion System (Framer Motion)

### Layer 1: Page & Layout Transitions

| Transition | Description | Duration | Easing |
|------------|-------------|----------|--------|
| Page Enter | Fade + slide up 16px | 350ms | `[0.22, 1, 0.36, 1]` |
| Page Exit | Fade + slide down 8px | 200ms | ease-out |
| Tab Switch | Direction-aware horizontal slide | 300ms | Spring `stiffness: 300, damping: 30` |
| Modal Enter | Scale 0.95 + fade | 250ms | Spring |
| Modal Exit | Scale 0.98 + fade | 150ms | ease-in |

### Layer 2: List & Card Animations

| Animation | Description | Timing |
|-----------|-------------|--------|
| Stagger List | Items enter sequentially | 50ms stagger, 300ms each |
| Card Press | Scale to 0.97 on press | Spring `stiffness: 400` |
| Card Hover | Lift -2px + shadow | 150ms |
| Swipe Dismiss | Horizontal drag → fade out | Gesture-driven |
| Pull to Refresh | Overscroll → spinner → bounce | Gesture-driven |

### Layer 3: Micro-interactions

| Interaction | Description | When |
|-------------|-------------|------|
| Button Tap | Scale pulse 1→0.95→1 | Every button press |
| Reaction Toggle | Pop 1→1.3→1 with spring | Emoji reactions |
| Number Counter | Animated count-up | Points/stats on load |
| Skeleton Shimmer | Animated shimmer | Loading states |

### Layer 4: Celebrations

| Celebration | Trigger | Description |
|-------------|---------|-------------|
| Confetti Burst | Log activity, redeem reward | Canvas, 50-80 particles, 2s |
| Points Float | Log activity | "+15 pts" floats up, fades |
| Streak Flame | Dashboard load (active streak) | Wobble/flicker animation |
| Level Up | Point milestones | Full-screen overlay + confetti |
| Podium Bounce | Top 3 leaderboard | Playful bounce on load |

### Shared Motion Library (`src/lib/motion.ts`)

- Reusable `variants` for common animations
- `<AnimatedList>` component for staggered lists
- `<Confetti>` canvas-based component
- `<PointsFloat>` floating text component
- `useHaptics()` hook
- `useSoundEffect()` hook

---

## 4. Gamification Layer

### Points Display
- Large animated counter on dashboard (orange `#FF9F43`)
- Format: Bold number + "pts" label
- On earn: floating "+N" animation

### Streak Visualization
- Flame icon with color escalation (orange → coral → indigo)
- Subtle CSS wobble animation (infinite)
- Zero streak: grey flame + "Start a streak!" prompt

### Progress Ring (New Component)
- Circular SVG with animated `pathLength` fill
- Weekly activity goal (e.g., "4 of 7")
- Prominent dashboard placement

### Achievement Badges (Visual, Profile Page)
- Circular icons for milestones
- Unlocked: colored + pop animation on first view
- Locked: grey silhouette
- Grid layout on profile

### Sound Effects (Web Audio API)
- Point earn: ascending chime
- Celebration: "ding"
- Button tap: subtle click
- Error: soft thud
- **Muted by default**, one-time "Enable sounds?" prompt
- Preference stored in localStorage

### Haptic Feedback (Vibration API)
- Button tap: 10ms
- Activity logged: 50ms
- Achievement: `[30, 50, 30]` pattern
- Error: 100ms
- Graceful degradation on unsupported devices

---

## 5. PWA Enhancements

### Service Worker (Workbox via @serwist/next)

| Strategy | Routes | Behavior |
|----------|--------|----------|
| NetworkFirst | API calls | Fresh data, cache fallback |
| StaleWhileRevalidate | JS, CSS, fonts | Instant serve, background update |
| CacheFirst | Images, icons | Cache permanently |
| NetworkOnly | Auth endpoints | Never cache |

Branded offline page.

### Gesture Navigation

| Gesture | Behavior |
|---------|----------|
| Pull to Refresh | Overscroll → refresh data |
| Swipe Tabs | Horizontal swipe → switch nav tab |
| Swipe Dismiss | Swipe notification → dismiss |
| Long Press | Feed item → context menu |

### App Chrome

| Feature | Detail |
|---------|--------|
| Splash Screen | Logo + animated progress bar |
| Status Bar | Dynamic `theme-color` per page context |
| Standalone | No browser UI, custom back behavior, safe-area insets |
| Install Prompt | Redesigned banner after 2nd visit |
| Viewport | `viewport-fit=cover` + safe-area padding |

### Optimistic Updates
- Activity logging → show in feed instantly
- Reactions → toggle instantly, sync background
- Comments → show with "sending..." state

---

## 6. Page-by-Page Redesign

### Dashboard

1. **Hero greeting**: "Hey {name}!" + animated streak flame
2. **Points summary**: Big animated counter (total) + weekly below
3. **Progress ring**: Weekly activity goal (SVG, animated)
4. **Stat cards** (2x2): Weekly pts, streak, activities, rank — staggered spring animation, animated counters
5. **Quick log FAB**: Indigo, pulsing glow, bottom-right
6. **Recent feed**: 3-5 items, staggered list

### Activity Logging

1. **Step 1**: Activity grid with emoji icons, press animation, indigo border on selection
2. **Step 2**: Slide-in measurement input, large number + stepper, real-time points preview
3. **Step 3**: Submit → celebration screen (indigo flash, confetti, "+N pts" float, haptic, chime, auto-redirect 1.5s)

### Leaderboard

1. **Podium**: Visual 3-position podium (1st center elevated, 2nd left, 3rd right), avatars, gold/silver/bronze colors, bounce animation
2. **Remaining ranks**: Card list, staggered entry
3. **Time tabs**: Animated sliding underline indicator
4. **User highlight**: Indigo bg + "You" badge if not in top 3

### Feed (Social)

- Cards with shadow + 12px radius
- Reaction pop animation on toggle
- Comment expand: smooth height via `AnimatePresence`
- New items: slide in from top
- Pull-to-refresh

### Rewards

- Pill-shaped indigo "REDEEM" button
- Orange points cost badge
- Affordable: subtle button pulse
- Not affordable: greyed + "Need X more pts"
- On redeem: confetti + haptic + floating text

### Profile

- Large avatar with achievement badge ring
- Animated stats row (points, activities, streak)
- Achievement badge grid
- Smooth modal edit

### Navigation Shell

**Bottom nav (mobile)**:
- Active: indigo icon + animated dot indicator
- Tap: icon scale animation
- Tab switch: direction-aware content slide

**Sidebar (desktop)**:
- Active: indigo left border + bg tint
- Hover: subtle bg shift
- Collapse/expand: smooth width animation

---

## 7. New Dependencies

| Package | Purpose |
|---------|---------|
| `@serwist/next` | Workbox-based service worker for Next.js |
| `@next/font` or Google Fonts | Plus Jakarta Sans font loading |

Framer Motion already installed. No other new deps needed.

---

## 8. Files to Create/Modify

### New Files
- `src/lib/motion.ts` — shared animation variants and utilities
- `src/components/Confetti.tsx` — canvas confetti component
- `src/components/PointsFloat.tsx` — floating points animation
- `src/components/ProgressRing.tsx` — SVG circular progress
- `src/components/AnimatedList.tsx` — staggered list wrapper
- `src/components/AnimatedCounter.tsx` — number count-up
- `src/components/Podium.tsx` — leaderboard podium visual
- `src/components/AchievementBadge.tsx` — badge component
- `src/components/PullToRefresh.tsx` — pull-to-refresh wrapper
- `src/components/CelebrationOverlay.tsx` — full-screen celebration
- `src/hooks/useHaptics.ts` — vibration API hook
- `src/hooks/useSoundEffect.ts` — Web Audio API hook
- `public/offline.html` — branded offline page

### Modified Files
- `src/theme.ts` — full rebrand (colors, fonts, radius, tokens)
- `src/app/layout.tsx` — font loading, updated providers
- `src/components/AppShell.tsx` — navigation animations, new colors
- `src/app/(app)/dashboard/page.tsx` — full redesign
- `src/app/(app)/log/page.tsx` — celebration flow
- `src/app/(app)/leaderboard/page.tsx` — podium + animations
- `src/app/(app)/rewards/page.tsx` — new card design
- `src/app/(app)/profile/page.tsx` — badges + stats
- `src/components/FeedItem.tsx` — reaction animations, new style
- `src/components/StatCards.tsx` — animated counters, new colors
- `src/components/RewardCard.tsx` — new design
- `src/components/PageTransition.tsx` — enhanced transitions
- `src/components/PwaInstallButton.tsx` — redesigned prompt
- `public/manifest.json` — new theme color
- `public/sw.js` → replaced by Serwist-generated SW
- `next.config.ts` — Serwist plugin integration
