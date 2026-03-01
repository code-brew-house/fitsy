# Fitsy UI/UX Enhancement — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform Fitsy from a clean Mantine app into an energetic, gamified family fitness PWA with bold flat colors, celebration animations, native-app feel, and delightful micro-interactions.

**Architecture:** Big Bang redesign touching all pages simultaneously. Build shared infrastructure (theme, motion library, utility hooks, reusable components) first, then apply to every page. PWA upgrades run in parallel.

**Tech Stack:** Next.js 15, Mantine v7, Framer Motion 12, Serwist (Workbox), Plus Jakarta Sans, Web Audio API, Vibration API

---

## Task 1: Install Dependencies & Font Setup

**Files:**
- Modify: `apps/web/package.json`
- Modify: `apps/web/src/app/layout.tsx`

**Step 1: Install new packages**

Run from repo root:
```bash
cd apps/web && pnpm add @fontsource-variable/plus-jakarta-sans serwist @serwist/next
```

**Step 2: Verify installation**

Run: `ls apps/web/node_modules/@fontsource-variable/plus-jakarta-sans`
Expected: directory exists with font files

Run: `ls apps/web/node_modules/@serwist/next`
Expected: directory exists

**Step 3: Add font import to root layout**

In `apps/web/src/app/layout.tsx`, add at top of imports:
```typescript
import '@fontsource-variable/plus-jakarta-sans';
```

This makes Plus Jakarta Sans available globally via CSS `font-family: 'Plus Jakarta Sans Variable'`.

**Step 4: Commit**

```bash
git add apps/web/package.json apps/web/pnpm-lock.yaml apps/web/src/app/layout.tsx
git commit -m "chore: add Plus Jakarta Sans font and Serwist PWA dependencies"
```

---

## Task 2: Theme Rebrand

**Files:**
- Modify: `apps/web/src/theme.ts`
- Modify: `apps/web/src/app/layout.tsx` (meta tags)
- Modify: `apps/web/public/manifest.json`

**Step 1: Rewrite theme.ts with new color palette and tokens**

Replace the entire contents of `apps/web/src/theme.ts` with:

```typescript
import { createTheme, MantineColorsTuple, DEFAULT_THEME, mergeMantineTheme } from '@mantine/core';

// Electric Indigo — primary brand color
const indigo: MantineColorsTuple = [
  '#f3f1ff',
  '#e4e0ff',
  '#c9bfff',
  '#ab9aff',
  '#9180ff',
  '#7b6cf0',
  '#6C5CE7', // index 6 = primary shade
  '#5a4bd4',
  '#4a3db8',
  '#3a2f9c',
];

// Hot Coral — secondary / streaks / urgency
const coral: MantineColorsTuple = [
  '#fff1f1',
  '#ffe0e0',
  '#ffc4c4',
  '#ffa3a3',
  '#ff8585',
  '#ff7676',
  '#FF6B6B', // index 6
  '#e85d5d',
  '#cc4f4f',
  '#b04242',
];

// Sunshine Yellow — achievements / gold / stars
const sunshine: MantineColorsTuple = [
  '#fffbeb',
  '#fff4cc',
  '#ffec99',
  '#ffe066',
  '#fed840',
  '#fecf4a',
  '#FECA57', // index 6
  '#e5b34e',
  '#cc9e45',
  '#b2893c',
];

// Mint — success / completed states
const mint: MantineColorsTuple = [
  '#e6fffe',
  '#ccfffe',
  '#99fffd',
  '#66f8f0',
  '#33ede5',
  '#1ae0d8',
  '#00D2D3', // index 6
  '#00b8b9',
  '#009e9f',
  '#008485',
];

// Vivid Orange — points / flames / energy
const energy: MantineColorsTuple = [
  '#fff6ed',
  '#ffecda',
  '#ffd9b5',
  '#ffc38a',
  '#ffb066',
  '#ffa757',
  '#FF9F43', // index 6
  '#e58c3b',
  '#cc7b33',
  '#b26a2b',
];

export const theme = mergeMantineTheme(
  DEFAULT_THEME,
  createTheme({
    primaryColor: 'indigo',
    colors: {
      indigo,
      coral,
      sunshine,
      mint,
      energy,
    },
    fontFamily: "'Plus Jakarta Sans Variable', system-ui, -apple-system, sans-serif",
    headings: {
      fontFamily: "'Plus Jakarta Sans Variable', system-ui, -apple-system, sans-serif",
    },
    defaultRadius: 'lg',
    components: {
      Button: {
        defaultProps: {
          radius: 'xl',
        },
      },
      Paper: {
        defaultProps: {
          radius: 'lg',
          shadow: 'xs',
        },
      },
      Card: {
        defaultProps: {
          radius: 'lg',
          shadow: 'xs',
        },
      },
    },
  }),
);
```

**Step 2: Update meta tags in root layout**

In `apps/web/src/app/layout.tsx`, change the theme-color meta tag:
```html
<meta name="theme-color" content="#6C5CE7" />
```

Also add viewport-fit for safe areas:
```html
<meta name="viewport" content="minimum-scale=1, initial-scale=1, width=device-width, user-scalable=no, viewport-fit=cover" />
```

**Step 3: Update manifest.json**

Replace `apps/web/public/manifest.json`:
```json
{
  "name": "Fitsy — Family Fitness Tracker",
  "short_name": "Fitsy",
  "description": "Earn fitness points and redeem rewards with your family",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#F8F9FC",
  "theme_color": "#6C5CE7",
  "icons": [
    { "src": "/icons/icon.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "any maskable" },
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**Step 4: Verify build**

Run: `cd apps/web && pnpm build`
Expected: Build succeeds (may have warnings, no errors)

**Step 5: Commit**

```bash
git add apps/web/src/theme.ts apps/web/src/app/layout.tsx apps/web/public/manifest.json
git commit -m "feat: rebrand theme with Electric Indigo palette and Plus Jakarta Sans"
```

---

## Task 3: Motion System Library & Utility Hooks

**Files:**
- Create: `apps/web/src/lib/motion.ts`
- Create: `apps/web/src/hooks/useHaptics.ts`
- Create: `apps/web/src/hooks/useSoundEffect.ts`

**Step 1: Create the shared motion variants library**

Create `apps/web/src/lib/motion.ts`:

```typescript
import type { Variants, Transition } from 'framer-motion';

// Shared easing curves
export const EASE_OUT_EXPO = [0.22, 1, 0.36, 1] as const;

// Spring configs
export const SPRING_SNAPPY = { type: 'spring' as const, stiffness: 400, damping: 30 };
export const SPRING_GENTLE = { type: 'spring' as const, stiffness: 300, damping: 30 };
export const SPRING_BOUNCY = { type: 'spring' as const, stiffness: 500, damping: 25 };

// Page transitions
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export const pageTransition: Transition = {
  duration: 0.35,
  ease: EASE_OUT_EXPO,
};

// Modal transitions
export const modalVariants: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
};

// List item stagger
export const listContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export const listItemVariants: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: EASE_OUT_EXPO },
  },
};

// Card interactions
export const cardTapVariants: Variants = {
  idle: { scale: 1 },
  tap: { scale: 0.97 },
};

export const cardHoverVariants: Variants = {
  idle: { y: 0 },
  hover: { y: -2 },
};

// Button micro-interaction
export const buttonTapScale = {
  whileTap: { scale: 0.95 },
  transition: SPRING_SNAPPY,
};

// Reaction pop
export const reactionPopVariants: Variants = {
  initial: { scale: 1 },
  pop: {
    scale: [1, 1.3, 1],
    transition: { duration: 0.3, ease: 'easeOut' },
  },
};

// Floating text (points earned)
export const floatUpVariants: Variants = {
  initial: { opacity: 1, y: 0, scale: 1 },
  animate: {
    opacity: 0,
    y: -60,
    scale: 1.2,
    transition: { duration: 1.2, ease: 'easeOut' },
  },
};

// Counter animation helper (for AnimatedCounter)
export function getCounterDuration(value: number): number {
  if (value < 10) return 0.5;
  if (value < 100) return 0.8;
  if (value < 1000) return 1.2;
  return 1.5;
}

// Podium bounce
export const podiumBounceVariants: Variants = {
  initial: { opacity: 0, y: 30, scale: 0.9 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 20,
    },
  },
};

// Direction-aware slide (for tab switches)
export function getSlideVariants(direction: number): Variants {
  return {
    initial: { opacity: 0, x: direction > 0 ? 100 : -100 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: direction > 0 ? -100 : 100 },
  };
}

// Streak flame wobble (CSS keyframe helper — not Framer, used as className)
export const STREAK_FLAME_KEYFRAMES = `
  @keyframes flameWobble {
    0%, 100% { transform: rotate(-3deg) scale(1); }
    25% { transform: rotate(3deg) scale(1.05); }
    50% { transform: rotate(-2deg) scale(1); }
    75% { transform: rotate(2deg) scale(1.03); }
  }
`;
```

**Step 2: Create useHaptics hook**

Create `apps/web/src/hooks/useHaptics.ts`:

```typescript
'use client';

import { useCallback } from 'react';

type HapticPattern = 'tap' | 'success' | 'achievement' | 'error';

const patterns: Record<HapticPattern, number | number[]> = {
  tap: 10,
  success: 50,
  achievement: [30, 50, 30],
  error: 100,
};

export function useHaptics() {
  const vibrate = useCallback((pattern: HapticPattern) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(patterns[pattern]);
      } catch {
        // Silently fail on unsupported devices
      }
    }
  }, []);

  return { vibrate };
}
```

**Step 3: Create useSoundEffect hook**

Create `apps/web/src/hooks/useSoundEffect.ts`:

```typescript
'use client';

import { useCallback, useRef, useEffect } from 'react';

type SoundEffect = 'pointEarn' | 'celebration' | 'tap' | 'error';

const SOUND_ENABLED_KEY = 'fitsy-sounds-enabled';

// Generate simple tones using Web Audio API
function createOscillator(
  ctx: AudioContext,
  freq: number,
  duration: number,
  startTime: number,
  type: OscillatorType = 'sine',
  volume: number = 0.15,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  gain.gain.setValueAtTime(volume, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

const soundConfigs: Record<SoundEffect, (ctx: AudioContext) => void> = {
  pointEarn: (ctx) => {
    const now = ctx.currentTime;
    createOscillator(ctx, 523, 0.15, now, 'sine', 0.12);
    createOscillator(ctx, 659, 0.15, now + 0.1, 'sine', 0.12);
  },
  celebration: (ctx) => {
    const now = ctx.currentTime;
    createOscillator(ctx, 523, 0.12, now, 'sine', 0.1);
    createOscillator(ctx, 659, 0.12, now + 0.08, 'sine', 0.1);
    createOscillator(ctx, 784, 0.2, now + 0.16, 'sine', 0.12);
  },
  tap: (ctx) => {
    const now = ctx.currentTime;
    createOscillator(ctx, 800, 0.05, now, 'sine', 0.06);
  },
  error: (ctx) => {
    const now = ctx.currentTime;
    createOscillator(ctx, 200, 0.2, now, 'triangle', 0.1);
  },
};

export function useSoundEffect() {
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    return () => {
      ctxRef.current?.close();
    };
  }, []);

  const isEnabled = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(SOUND_ENABLED_KEY) === 'true';
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    localStorage.setItem(SOUND_ENABLED_KEY, String(enabled));
  }, []);

  const play = useCallback((effect: SoundEffect) => {
    if (!isEnabled()) return;
    try {
      if (!ctxRef.current || ctxRef.current.state === 'closed') {
        ctxRef.current = new AudioContext();
      }
      const ctx = ctxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      soundConfigs[effect](ctx);
    } catch {
      // Silently fail
    }
  }, [isEnabled]);

  return { play, isEnabled, setEnabled };
}
```

**Step 4: Commit**

```bash
git add apps/web/src/lib/motion.ts apps/web/src/hooks/useHaptics.ts apps/web/src/hooks/useSoundEffect.ts
git commit -m "feat: add motion system library and haptics/sound hooks"
```

---

## Task 4: Reusable Animation Components

**Files:**
- Create: `apps/web/src/components/AnimatedCounter.tsx`
- Create: `apps/web/src/components/AnimatedList.tsx`
- Create: `apps/web/src/components/Confetti.tsx`
- Create: `apps/web/src/components/PointsFloat.tsx`
- Create: `apps/web/src/components/ProgressRing.tsx`
- Create: `apps/web/src/components/CelebrationOverlay.tsx`
- Create: `apps/web/src/components/Podium.tsx`

**Step 1: Create AnimatedCounter**

Create `apps/web/src/components/AnimatedCounter.tsx`:

```typescript
'use client';

import { useEffect, useRef, useState } from 'react';
import { Text, type TextProps } from '@mantine/core';
import { useIntersection } from '@mantine/hooks';

interface AnimatedCounterProps extends TextProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  formatNumber?: boolean;
}

export function AnimatedCounter({
  value,
  duration = 1,
  prefix = '',
  suffix = '',
  formatNumber = true,
  ...textProps
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const { ref, entry } = useIntersection({ threshold: 0.1 });
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!entry?.isIntersecting || hasAnimated.current) return;
    hasAnimated.current = true;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = (timestamp - startTimeRef.current) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(eased * value));

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [entry?.isIntersecting, value, duration]);

  const formatted = formatNumber
    ? displayValue.toLocaleString()
    : String(displayValue);

  return (
    <Text ref={ref} {...textProps}>
      {prefix}{formatted}{suffix}
    </Text>
  );
}
```

**Step 2: Create AnimatedList**

Create `apps/web/src/components/AnimatedList.tsx`:

```typescript
'use client';

import { motion } from 'framer-motion';
import { listContainerVariants, listItemVariants } from '../lib/motion';

interface AnimatedListProps {
  children: React.ReactNode;
  className?: string;
}

export function AnimatedList({ children, className }: AnimatedListProps) {
  return (
    <motion.div
      variants={listContainerVariants}
      initial="initial"
      animate="animate"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedListItem({ children, className }: AnimatedListProps) {
  return (
    <motion.div variants={listItemVariants} className={className}>
      {children}
    </motion.div>
  );
}
```

**Step 3: Create Confetti component**

Create `apps/web/src/components/Confetti.tsx`:

```typescript
'use client';

import { useEffect, useRef, useCallback } from 'react';

interface ConfettiProps {
  active: boolean;
  duration?: number;
  particleCount?: number;
  onComplete?: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  life: number;
}

const COLORS = ['#6C5CE7', '#FF6B6B', '#FECA57', '#00D2D3', '#FF9F43', '#F8F9FC'];

export function Confetti({
  active,
  duration = 2000,
  particleCount = 60,
  onComplete,
}: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number | null>(null);

  const createParticles = useCallback((width: number, height: number) => {
    const particles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: width / 2 + (Math.random() - 0.5) * 100,
        y: height / 2,
        vx: (Math.random() - 0.5) * 12,
        vy: -(Math.random() * 10 + 4),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: Math.random() * 8 + 4,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        life: 1,
      });
    }
    return particles;
  }, [particleCount]);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    particlesRef.current = createParticles(canvas.width, canvas.height);
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed > duration) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        onComplete?.();
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const globalAlpha = Math.max(0, 1 - elapsed / duration);

      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.vy += 0.3; // gravity
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.life = globalAlpha;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [active, duration, createParticles, onComplete]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />
  );
}
```

**Step 4: Create PointsFloat**

Create `apps/web/src/components/PointsFloat.tsx`:

```typescript
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Text } from '@mantine/core';
import { floatUpVariants } from '../lib/motion';

interface PointsFloatProps {
  points: number;
  visible: boolean;
}

export function PointsFloat({ points, visible }: PointsFloatProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          variants={floatUpVariants}
          initial="initial"
          animate="animate"
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            top: '40%',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10000,
            pointerEvents: 'none',
          }}
        >
          <Text
            size="2rem"
            fw={800}
            c="energy.6"
            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.2)' }}
          >
            +{points} pts
          </Text>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

**Step 5: Create ProgressRing**

Create `apps/web/src/components/ProgressRing.tsx`:

```typescript
'use client';

import { motion } from 'framer-motion';
import { Stack, Text } from '@mantine/core';

interface ProgressRingProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
}

export function ProgressRing({
  value,
  max,
  size = 120,
  strokeWidth = 10,
  color = 'var(--mantine-color-indigo-6)',
  label,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = max > 0 ? Math.min(value / max, 1) : 0;

  return (
    <Stack align="center" gap={4}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--mantine-color-default-border)"
          strokeWidth={strokeWidth}
        />
        {/* Animated progress arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - progress) }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        />
      </svg>
      {/* Center text overlay */}
      <div
        style={{
          marginTop: -size - 4,
          height: size,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text size="xl" fw={800} style={{ lineHeight: 1 }}>
          {value}/{max}
        </Text>
        {label && (
          <Text size="xs" c="dimmed" ta="center">
            {label}
          </Text>
        )}
      </div>
    </Stack>
  );
}
```

**Step 6: Create CelebrationOverlay**

Create `apps/web/src/components/CelebrationOverlay.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Stack, Text, Box } from '@mantine/core';
import { Confetti } from './Confetti';
import { useHaptics } from '../hooks/useHaptics';
import { useSoundEffect } from '../hooks/useSoundEffect';

interface CelebrationOverlayProps {
  active: boolean;
  points: number;
  message?: string;
  onComplete?: () => void;
  autoClose?: number;
}

export function CelebrationOverlay({
  active,
  points,
  message = 'Activity Logged!',
  onComplete,
  autoClose = 2000,
}: CelebrationOverlayProps) {
  const [show, setShow] = useState(false);
  const { vibrate } = useHaptics();
  const { play } = useSoundEffect();

  useEffect(() => {
    if (active) {
      setShow(true);
      vibrate('achievement');
      play('celebration');

      const timer = setTimeout(() => {
        setShow(false);
        onComplete?.();
      }, autoClose);

      return () => clearTimeout(timer);
    }
  }, [active, autoClose, onComplete, vibrate, play]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9998,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(108, 92, 231, 0.15)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => {
            setShow(false);
            onComplete?.();
          }}
        >
          <Confetti active={true} />
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <Stack align="center" gap="xs">
              <Text size="3rem" fw={800} c="white" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
                {message}
              </Text>
              <Box
                style={{
                  background: '#FF9F43',
                  borderRadius: 'var(--mantine-radius-xl)',
                  padding: '8px 24px',
                }}
              >
                <Text size="2rem" fw={800} c="white">
                  +{points} pts
                </Text>
              </Box>
            </Stack>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

**Step 7: Create Podium component**

Create `apps/web/src/components/Podium.tsx`:

```typescript
'use client';

import { motion } from 'framer-motion';
import { Avatar, Stack, Text, Group, Box } from '@mantine/core';
import { podiumBounceVariants } from '../lib/motion';
import { AnimatedCounter } from './AnimatedCounter';

interface PodiumEntry {
  userId: string;
  userName: string;
  avatarUrl?: string | null;
  totalPoints: number;
}

interface PodiumProps {
  entries: PodiumEntry[];
}

const podiumConfig = [
  { position: 1, order: 1, height: 100, avatarSize: 64, color: '#FECA57', label: '1st' },
  { position: 0, order: 0, height: 80, avatarSize: 52, color: '#A4A6B8', label: '2nd' },
  { position: 2, order: 2, height: 64, avatarSize: 52, color: '#E17055', label: '3rd' },
];

export function Podium({ entries }: PodiumProps) {
  if (entries.length === 0) return null;

  // Reorder: [2nd, 1st, 3rd] for visual layout
  const orderedEntries = [entries[1], entries[0], entries[2]].filter(Boolean);
  const configs = entries.length >= 3
    ? podiumConfig
    : podiumConfig.slice(0, entries.length);

  return (
    <Group justify="center" align="flex-end" gap="md" py="lg">
      {orderedEntries.map((entry, i) => {
        const config = configs[i];
        if (!entry || !config) return null;
        const initial = entry.userName?.charAt(0)?.toUpperCase() || '?';

        return (
          <motion.div
            key={entry.userId}
            variants={podiumBounceVariants}
            initial="initial"
            animate="animate"
            transition={{ delay: config.position * 0.15 }}
          >
            <Stack align="center" gap="xs">
              <Avatar
                src={entry.avatarUrl}
                radius="xl"
                size={config.avatarSize}
                style={{ border: `3px solid ${config.color}` }}
              >
                <Text fw={700}>{initial}</Text>
              </Avatar>
              <Text size="sm" fw={600} lineClamp={1} maw={100} ta="center">
                {entry.userName}
              </Text>
              <AnimatedCounter
                value={entry.totalPoints}
                size="sm"
                fw={700}
                c="energy.6"
                suffix=" pts"
              />
              <Box
                style={{
                  width: 80,
                  height: config.height,
                  borderRadius: 'var(--mantine-radius-md) var(--mantine-radius-md) 0 0',
                  backgroundColor: config.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text size="xl" fw={800} c="white">
                  {config.label}
                </Text>
              </Box>
            </Stack>
          </motion.div>
        );
      })}
    </Group>
  );
}
```

**Step 8: Commit**

```bash
git add apps/web/src/components/AnimatedCounter.tsx apps/web/src/components/AnimatedList.tsx apps/web/src/components/Confetti.tsx apps/web/src/components/PointsFloat.tsx apps/web/src/components/ProgressRing.tsx apps/web/src/components/CelebrationOverlay.tsx apps/web/src/components/Podium.tsx
git commit -m "feat: add reusable animation components (confetti, counter, progress ring, podium, celebrations)"
```

---

## Task 5: AppShell & Navigation Redesign

**Files:**
- Modify: `apps/web/src/components/AppShell.tsx`
- Modify: `apps/web/src/components/PageTransition.tsx`
- Modify: `apps/web/src/components/FitsyLogo.tsx`
- Modify: `apps/web/src/components/PointsBadge.tsx`
- Modify: `apps/web/src/components/ThemeToggle.tsx`
- Modify: `apps/web/src/components/PwaInstallButton.tsx`

**Step 1: Rewrite AppShell with new colors and animated bottom nav**

Replace the entire contents of `apps/web/src/components/AppShell.tsx` with:

```typescript
'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  AppShell as MantineAppShell,
  Group,
  NavLink,
  Text,
  Menu,
  ActionIcon,
  UnstyledButton,
  Avatar,
  Divider,
  Box,
  Stack,
} from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { motion } from 'framer-motion';
import {
  IconDashboard,
  IconPlus,
  IconGift,
  IconTrophy,
  IconHistory,
  IconListDetails,
  IconReceipt,
  IconUser,
  IconSettings,
  IconLogout,
  IconMenu2,
} from '@tabler/icons-react';
import { Role } from '@fitsy/shared';
import { useAuth } from '../lib/auth-context';
import { ThemeToggle } from './ThemeToggle';
import { PointsBadge } from './PointsBadge';
import { FitsyLogo } from './FitsyLogo';
import { PwaInstallButton } from './PwaInstallButton';
import { PageTransition } from './PageTransition';
import { useHaptics } from '../hooks/useHaptics';

const mainNav = [
  { label: 'Dashboard', icon: IconDashboard, href: '/dashboard' },
  { label: 'Log Activity', icon: IconPlus, href: '/log' },
  { label: 'Rewards', icon: IconGift, href: '/rewards' },
  { label: 'Leaderboard', icon: IconTrophy, href: '/leaderboard' },
];

const secondaryNav = [
  { label: 'My Activities', icon: IconListDetails, href: '/my-activities' },
  { label: 'History', icon: IconHistory, href: '/history' },
  { label: 'Redemptions', icon: IconReceipt, href: '/redemptions' },
  { label: 'Profile', icon: IconUser, href: '/profile' },
];

const adminNav = [
  { label: 'Manage Activities', icon: IconSettings, href: '/admin/activities' },
  { label: 'Manage Rewards', icon: IconGift, href: '/admin/rewards' },
  { label: 'Members', icon: IconUser, href: '/admin/members' },
  { label: 'Redemptions', icon: IconReceipt, href: '/admin/redemptions' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [opened, { toggle, close }] = useDisclosure(false);
  const { vibrate } = useHaptics();

  const isAdmin = user?.role === Role.ADMIN;
  const isMobile = useMediaQuery('(max-width: 768px)');

  const navigate = (href: string) => {
    vibrate('tap');
    router.push(href);
    close();
  };

  // Find active tab index for bottom nav dot indicator
  const activeTabIndex = mainNav.findIndex((item) => pathname === item.href);

  return (
    <MantineAppShell
      header={{ height: 60 }}
      navbar={{
        width: 260,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      {/* Header */}
      <MantineAppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <ActionIcon
              variant="default"
              size="lg"
              hiddenFrom="sm"
              onClick={toggle}
            >
              <IconMenu2 size={18} />
            </ActionIcon>
            <Group
              gap="xs"
              align="center"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate('/dashboard')}
            >
              <FitsyLogo size={32} />
              <Text size="xl" fw={800} c="indigo" style={{ letterSpacing: '-0.01em' }} visibleFrom="sm">
                Fitsy
              </Text>
            </Group>
          </Group>
          <Group gap="sm">
            <PwaInstallButton />
            <Box visibleFrom="sm">
              <PointsBadge />
            </Box>
            <ThemeToggle />
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <UnstyledButton>
                  <Avatar color="indigo" radius="xl" size="md">
                    {user?.name?.charAt(0)?.toUpperCase() || '?'}
                  </Avatar>
                </UnstyledButton>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>{user?.name}</Menu.Label>
                <Menu.Item
                  leftSection={<IconUser size={14} />}
                  onClick={() => navigate('/profile')}
                >
                  Profile
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  color="red"
                  leftSection={<IconLogout size={14} />}
                  onClick={logout}
                >
                  Logout
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </MantineAppShell.Header>

      {/* Desktop sidebar */}
      <MantineAppShell.Navbar p="sm">
        <Stack gap={4}>
          {mainNav.map((item) => (
            <NavLink
              key={item.href}
              label={item.label}
              leftSection={<item.icon size={20} />}
              active={pathname === item.href}
              onClick={() => navigate(item.href)}
              color="indigo"
              variant={pathname === item.href ? 'light' : 'subtle'}
            />
          ))}
          <Divider my="xs" />
          {secondaryNav.map((item) => (
            <NavLink
              key={item.href}
              label={item.label}
              leftSection={<item.icon size={20} />}
              active={pathname === item.href}
              onClick={() => navigate(item.href)}
              color="indigo"
              variant={pathname === item.href ? 'light' : 'subtle'}
            />
          ))}
          {isAdmin && (
            <>
              <Divider my="xs" label="Admin" labelPosition="center" />
              {adminNav.map((item) => (
                <NavLink
                  key={item.href}
                  label={item.label}
                  leftSection={<item.icon size={20} />}
                  active={pathname === item.href}
                  onClick={() => navigate(item.href)}
                  color="indigo"
                  variant={pathname === item.href ? 'light' : 'subtle'}
                />
              ))}
            </>
          ))}
        </Stack>
        <Box mt="auto" pt="md">
          <NavLink
            label="Logout"
            leftSection={<IconLogout size={20} />}
            onClick={logout}
            c="red"
          />
        </Box>
      </MantineAppShell.Navbar>

      {/* Main content */}
      <MantineAppShell.Main>
        <Box pb={isMobile ? 80 : 0}>
          <PageTransition>{children}</PageTransition>
        </Box>

        {/* Mobile bottom navigation */}
        <Box
          hiddenFrom="sm"
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            borderTop: '1px solid var(--mantine-color-default-border)',
            backgroundColor: 'var(--mantine-color-body)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
        >
          <Group grow gap={0} h={60} style={{ position: 'relative' }}>
            {/* Animated dot indicator */}
            {activeTabIndex >= 0 && (
              <motion.div
                layoutId="bottomNavIndicator"
                style={{
                  position: 'absolute',
                  top: 2,
                  width: `${100 / mainNav.length}%`,
                  left: `${(activeTabIndex * 100) / mainNav.length}%`,
                  display: 'flex',
                  justifyContent: 'center',
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              >
                <Box
                  style={{
                    width: 24,
                    height: 3,
                    borderRadius: 2,
                    backgroundColor: 'var(--mantine-color-indigo-6)',
                  }}
                />
              </motion.div>
            )}
            {mainNav.map((item) => {
              const isActive = pathname === item.href;
              return (
                <UnstyledButton
                  key={item.href}
                  onClick={() => navigate(item.href)}
                  style={{ textAlign: 'center' }}
                  py="xs"
                >
                  <motion.div whileTap={{ scale: 0.85 }}>
                    <Stack align="center" gap={2}>
                      <item.icon
                        size={22}
                        color={
                          isActive
                            ? 'var(--mantine-color-indigo-6)'
                            : 'var(--mantine-color-dimmed)'
                        }
                        strokeWidth={isActive ? 2.5 : 1.5}
                      />
                      <Text
                        size="xs"
                        c={isActive ? 'indigo' : 'dimmed'}
                        fw={isActive ? 700 : 400}
                      >
                        {item.label}
                      </Text>
                    </Stack>
                  </motion.div>
                </UnstyledButton>
              );
            })}
          </Group>
        </Box>
      </MantineAppShell.Main>
    </MantineAppShell>
  );
}
```

**Step 2: Update PageTransition**

Replace `apps/web/src/components/PageTransition.tsx`:

```typescript
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { pageVariants, pageTransition } from '../lib/motion';

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={pageTransition}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

**Step 3: Update FitsyLogo colors to indigo**

In `apps/web/src/components/FitsyLogo.tsx`, change the gradient stops from teal to indigo:
- `<stop offset="0%" stopColor="#9180ff" />` (lighter indigo)
- `<stop offset="100%" stopColor="#6C5CE7" />` (Electric Indigo)

**Step 4: Update PointsBadge**

Replace `apps/web/src/components/PointsBadge.tsx`:

```typescript
'use client';

import { Badge } from '@mantine/core';
import { IconFlame } from '@tabler/icons-react';
import { useAuth } from '../lib/auth-context';

export function PointsBadge() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <Badge size="lg" variant="light" color="energy" leftSection={<IconFlame size={14} />}>
      {user.totalPoints} pts
    </Badge>
  );
}
```

**Step 5: Update ThemeToggle**

In `apps/web/src/components/ThemeToggle.tsx`, no color changes needed — it uses `variant="default"` which adapts automatically.

**Step 6: Update PwaInstallButton**

In `apps/web/src/components/PwaInstallButton.tsx`, change `color="teal"` to `color="indigo"`.

**Step 7: Commit**

```bash
git add apps/web/src/components/AppShell.tsx apps/web/src/components/PageTransition.tsx apps/web/src/components/FitsyLogo.tsx apps/web/src/components/PointsBadge.tsx apps/web/src/components/PwaInstallButton.tsx
git commit -m "feat: redesign navigation shell with indigo theme and animated bottom nav"
```

---

## Task 6: Dashboard Page Redesign

**Files:**
- Modify: `apps/web/src/components/StatCards.tsx`
- Modify: `apps/web/src/app/(app)/dashboard/page.tsx`

**Step 1: Rewrite StatCards with animated counters and new colors**

Replace `apps/web/src/components/StatCards.tsx`:

```typescript
'use client';

import { SimpleGrid, Paper, Group, Text, ThemeIcon } from '@mantine/core';
import { motion } from 'framer-motion';
import {
  IconFlame,
  IconTrendingUp,
  IconActivity,
  IconTrophy,
} from '@tabler/icons-react';
import { listItemVariants } from '../lib/motion';
import { AnimatedCounter } from './AnimatedCounter';

interface StatCardsProps {
  totalPoints: number;
  pointsThisWeek: number;
  activitiesThisWeek: number;
  currentStreak: number;
}

const stats = [
  { key: 'pointsThisWeek' as const, label: 'Points This Week', icon: IconTrendingUp, color: 'energy', suffix: '' },
  { key: 'currentStreak' as const, label: 'Current Streak', icon: IconFlame, color: 'coral', suffix: 'd' },
  { key: 'activitiesThisWeek' as const, label: 'Activities', icon: IconActivity, color: 'mint', suffix: '' },
  { key: 'totalPoints' as const, label: 'Rank', icon: IconTrophy, color: 'indigo', suffix: '' },
];

export function StatCards({ totalPoints, pointsThisWeek, activitiesThisWeek, currentStreak }: StatCardsProps) {
  const values: Record<string, number> = { totalPoints, pointsThisWeek, activitiesThisWeek, currentStreak };

  return (
    <SimpleGrid cols={{ base: 2, md: 4 }}>
      {stats.map((stat, index) => (
        <motion.div
          key={stat.key}
          variants={listItemVariants}
          initial="initial"
          animate="animate"
          transition={{ delay: index * 0.08 }}
        >
          <Paper p="lg" radius="lg" shadow="xs" withBorder h="100%">
            <Group gap="xs" mb="xs">
              <ThemeIcon variant="light" color={stat.color} size="lg" radius="md">
                <stat.icon size={20} />
              </ThemeIcon>
            </Group>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
              {stat.label}
            </Text>
            <AnimatedCounter
              value={values[stat.key]}
              size="xl"
              fw={800}
              mt={4}
              suffix={stat.suffix}
            />
          </Paper>
        </motion.div>
      ))}
    </SimpleGrid>
  );
}
```

**Step 2: Rewrite dashboard page**

Replace `apps/web/src/app/(app)/dashboard/page.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Title,
  Text,
  Skeleton,
  Stack,
  Paper,
  Button,
  Group,
  Box,
  Affix,
  ActionIcon,
} from '@mantine/core';
import { motion } from 'framer-motion';
import { IconPlus, IconUsers, IconUserPlus, IconFlame } from '@tabler/icons-react';
import type { DashboardResponse } from '@fitsy/shared';
import { api } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';
import { StatCards } from '../../../components/StatCards';
import { FeedItem } from '../../../components/FeedItem';
import { ProgressRing } from '../../../components/ProgressRing';
import { AnimatedCounter } from '../../../components/AnimatedCounter';
import { AnimatedList, AnimatedListItem } from '../../../components/AnimatedList';
import { STREAK_FLAME_KEYFRAMES } from '../../../lib/motion';

function getStreakColor(streak: number): string {
  if (streak >= 7) return 'var(--mantine-color-indigo-6)';
  if (streak >= 4) return 'var(--mantine-color-coral-6)';
  return 'var(--mantine-color-energy-6)';
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    if (!user.familyId) {
      setLoading(false);
      return;
    }

    api
      .get<DashboardResponse>('/dashboard')
      .then(setDashboard)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <Container size="lg">
        <Stack gap="md">
          <Skeleton height={30} width={200} />
          <Skeleton height={100} />
          <Skeleton height={100} />
          <Skeleton height={200} />
        </Stack>
      </Container>
    );
  }

  if (!user?.familyId) {
    return (
      <Container size="sm">
        <Stack align="center" gap="lg" mt="xl">
          <IconUsers size={64} color="var(--mantine-color-indigo-6)" />
          <Title order={2} ta="center">
            Welcome to Fitsy!
          </Title>
          <Text c="dimmed" ta="center" maw={400}>
            You need to be part of a family to start tracking activities and earning points.
          </Text>
          <Group>
            <Button
              variant="filled"
              color="indigo"
              leftSection={<IconPlus size={16} />}
              onClick={() => router.push('/create-family')}
            >
              Create a Family
            </Button>
            <Button
              variant="outline"
              color="indigo"
              leftSection={<IconUserPlus size={16} />}
              onClick={() => router.push('/join-family')}
            >
              Join a Family
            </Button>
          </Group>
        </Stack>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="lg">
        <Text c="red">Error loading dashboard: {error}</Text>
      </Container>
    );
  }

  if (!dashboard) return null;

  return (
    <Container size="lg">
      {/* Inject flame keyframes */}
      <style>{STREAK_FLAME_KEYFRAMES}</style>

      <Stack gap="lg">
        {/* Hero greeting */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Group justify="space-between" align="flex-start">
            <Box>
              <Group gap="sm" align="center">
                <Title order={2}>
                  Hey {user?.name?.split(' ')[0]}!
                </Title>
                {dashboard.currentStreak > 0 && (
                  <Group gap={4}>
                    <IconFlame
                      size={24}
                      color={getStreakColor(dashboard.currentStreak)}
                      style={{
                        animation: 'flameWobble 2s ease-in-out infinite',
                      }}
                    />
                    <Text fw={700} c={dashboard.currentStreak >= 7 ? 'indigo' : dashboard.currentStreak >= 4 ? 'coral' : 'energy'}>
                      {dashboard.currentStreak}d streak
                    </Text>
                  </Group>
                )}
              </Group>
              <AnimatedCounter
                value={dashboard.totalPoints}
                size="2rem"
                fw={800}
                c="energy.6"
                suffix=" pts"
                duration={1.2}
              />
            </Box>
            <ProgressRing
              value={dashboard.activitiesThisWeek}
              max={7}
              size={100}
              label="this week"
            />
          </Group>
        </motion.div>

        {/* Stat cards */}
        <StatCards
          totalPoints={dashboard.totalPoints}
          pointsThisWeek={dashboard.pointsThisWeek}
          activitiesThisWeek={dashboard.activitiesThisWeek}
          currentStreak={dashboard.currentStreak}
        />

        {/* Recent Activity */}
        <div>
          <Title order={4} mb="sm">
            Recent Activity
          </Title>
          {dashboard.recentActivities.length === 0 ? (
            <Paper p="xl" radius="lg" shadow="xs" withBorder>
              <Text c="dimmed" ta="center">
                No activities yet. Start logging!
              </Text>
            </Paper>
          ) : (
            <AnimatedList>
              <Stack gap="xs">
                {dashboard.recentActivities.map((activity) => (
                  <AnimatedListItem key={activity.id}>
                    <Paper p="md" radius="lg" shadow="xs" withBorder>
                      <FeedItem activity={activity} />
                    </Paper>
                  </AnimatedListItem>
                ))}
              </Stack>
            </AnimatedList>
          )}
        </div>
      </Stack>

      {/* Quick log FAB */}
      <Affix position={{ bottom: 90, right: 20 }}>
        <motion.div whileTap={{ scale: 0.9 }}>
          <ActionIcon
            color="indigo"
            size={56}
            radius="xl"
            variant="filled"
            onClick={() => router.push('/log')}
            aria-label="Log activity"
            style={{
              boxShadow: '0 4px 16px rgba(108, 92, 231, 0.4)',
            }}
          >
            <IconPlus size={28} />
          </ActionIcon>
        </motion.div>
      </Affix>
    </Container>
  );
}
```

**Step 3: Commit**

```bash
git add apps/web/src/components/StatCards.tsx apps/web/src/app/(app)/dashboard/page.tsx
git commit -m "feat: redesign dashboard with hero greeting, progress ring, and animated counters"
```

---

## Task 7: Activity Logging Flow Redesign

**Files:**
- Modify: `apps/web/src/app/(app)/log/page.tsx`
- Modify: `apps/web/src/components/ActivityCard.tsx`

**Step 1: Update ActivityCard with tap animation and new colors**

Replace `apps/web/src/components/ActivityCard.tsx`:

```typescript
'use client';

import { Paper, Text, Stack } from '@mantine/core';
import { motion } from 'framer-motion';
import { IconCheck } from '@tabler/icons-react';
import type { ActivityTypeResponse } from '@fitsy/shared';
import { MeasurementType } from '@fitsy/shared';

interface ActivityCardProps {
  activity: ActivityTypeResponse;
  selected: boolean;
  onClick: () => void;
}

const measurementLabels: Record<MeasurementType, string> = {
  [MeasurementType.DISTANCE]: 'Distance',
  [MeasurementType.EFFORT]: 'Effort',
  [MeasurementType.FLAT]: 'Flat',
  [MeasurementType.DURATION]: 'Duration',
};

export function ActivityCard({ activity, selected, onClick }: ActivityCardProps) {
  return (
    <motion.div whileTap={{ scale: 0.97 }}>
      <Paper
        p="lg"
        radius="lg"
        shadow="xs"
        withBorder
        onClick={onClick}
        style={{
          cursor: 'pointer',
          borderColor: selected ? 'var(--mantine-color-indigo-6)' : undefined,
          boxShadow: selected ? '0 0 0 2px var(--mantine-color-indigo-3)' : undefined,
          transition: 'border-color 150ms ease, box-shadow 150ms ease',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {selected && (
          <div
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 24,
              height: 24,
              borderRadius: '50%',
              backgroundColor: 'var(--mantine-color-indigo-6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconCheck size={14} color="white" />
          </div>
        )}
        <Stack align="center" gap="xs">
          <Text size="2rem">{activity.icon}</Text>
          <Text size="sm" fw={600} ta="center" lineClamp={1}>
            {activity.name}
          </Text>
          <Text size="xs" c="dimmed">
            {measurementLabels[activity.measurementType]}
          </Text>
        </Stack>
      </Paper>
    </motion.div>
  );
}
```

**Step 2: Rewrite log page with celebration flow**

Replace `apps/web/src/app/(app)/log/page.tsx`:

```typescript
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Title,
  Text,
  Stack,
  SimpleGrid,
  Skeleton,
  NumberInput,
  SegmentedControl,
  Button,
  Paper,
  Group,
  Textarea,
  Box,
} from '@mantine/core';
import { motion, AnimatePresence } from 'framer-motion';
import { IconArrowLeft, IconCheck } from '@tabler/icons-react';
import { MeasurementType, EffortLevel } from '@fitsy/shared';
import type { ActivityTypeResponse, ActivityLogResponse } from '@fitsy/shared';
import { api } from '../../../lib/api';
import { ActivityCard } from '../../../components/ActivityCard';
import { CelebrationOverlay } from '../../../components/CelebrationOverlay';
import { AnimatedCounter } from '../../../components/AnimatedCounter';
import { AnimatedList, AnimatedListItem } from '../../../components/AnimatedList';
import { useHaptics } from '../../../hooks/useHaptics';

export default function LogPage() {
  const router = useRouter();
  const { vibrate } = useHaptics();
  const [activityTypes, setActivityTypes] = useState<ActivityTypeResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ActivityTypeResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);

  // Measurement inputs
  const [distance, setDistance] = useState<number | string>(1);
  const [effort, setEffort] = useState<EffortLevel>(EffortLevel.MEDIUM);
  const [duration, setDuration] = useState<number | string>(10);
  const [note, setNote] = useState('');

  useEffect(() => {
    api
      .get<ActivityTypeResponse[]>('/activity-types')
      .then((data) => setActivityTypes(data.filter((a) => a.isActive)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const pointsPreview = useMemo(() => {
    if (!selected) return 0;
    switch (selected.measurementType) {
      case MeasurementType.DISTANCE:
        return Math.round((Number(distance) || 0) * (selected.pointsPerUnit || 0));
      case MeasurementType.EFFORT: {
        const effortMap: Record<EffortLevel, number | null> = {
          [EffortLevel.LOW]: selected.pointsLow,
          [EffortLevel.MEDIUM]: selected.pointsMedium,
          [EffortLevel.HIGH]: selected.pointsHigh,
          [EffortLevel.EXTREME]: selected.pointsExtreme,
        };
        return effortMap[effort] || 0;
      }
      case MeasurementType.FLAT:
        return selected.flatPoints || 0;
      case MeasurementType.DURATION:
        return Math.round((Number(duration) || 0) * (selected.pointsPerMinute || 0));
      default:
        return 0;
    }
  }, [selected, distance, effort, duration]);

  const handleCelebrationComplete = useCallback(() => {
    setCelebrating(false);
    router.push('/dashboard');
  }, [router]);

  const handleSubmit = async () => {
    if (!selected) return;
    setSubmitting(true);
    vibrate('tap');

    const body: Record<string, unknown> = { activityTypeId: selected.id };
    switch (selected.measurementType) {
      case MeasurementType.DISTANCE:
        body.distanceKm = Number(distance);
        break;
      case MeasurementType.EFFORT:
        body.effortLevel = effort;
        break;
      case MeasurementType.DURATION:
        body.durationMinutes = Number(duration);
        break;
    }

    if (note.trim()) {
      body.note = note.trim();
    }

    try {
      await api.post<ActivityLogResponse>('/activity-logs', body);
      setEarnedPoints(pointsPreview);
      setCelebrating(true);
    } catch {
      vibrate('error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Container size="lg">
        <Stack gap="md">
          <Skeleton height={30} width={200} />
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} height={120} radius="lg" />
            ))}
          </SimpleGrid>
        </Stack>
      </Container>
    );
  }

  return (
    <>
      <CelebrationOverlay
        active={celebrating}
        points={earnedPoints}
        onComplete={handleCelebrationComplete}
      />

      <AnimatePresence mode="wait">
        {selected ? (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <Container size="sm">
              <Stack gap="lg">
                <Button
                  variant="subtle"
                  color="gray"
                  leftSection={<IconArrowLeft size={16} />}
                  onClick={() => setSelected(null)}
                  px={0}
                >
                  Back
                </Button>

                <Group gap="sm" align="center">
                  <Text size="2rem">{selected.icon}</Text>
                  <Title order={3}>{selected.name}</Title>
                </Group>

                <Paper p="lg" radius="lg" shadow="xs" withBorder>
                  <Stack gap="md">
                    {selected.measurementType === MeasurementType.DISTANCE && (
                      <NumberInput
                        label="Distance (km)"
                        value={distance}
                        onChange={setDistance}
                        step={0.1}
                        min={0.1}
                        decimalScale={1}
                        size="lg"
                      />
                    )}

                    {selected.measurementType === MeasurementType.EFFORT && (
                      <div>
                        <Text size="sm" fw={500} mb="xs">
                          Effort Level
                        </Text>
                        <SegmentedControl
                          value={effort}
                          onChange={(val) => setEffort(val as EffortLevel)}
                          data={[
                            { label: 'Low', value: EffortLevel.LOW },
                            { label: 'Medium', value: EffortLevel.MEDIUM },
                            { label: 'High', value: EffortLevel.HIGH },
                            { label: 'Extreme', value: EffortLevel.EXTREME },
                          ]}
                          fullWidth
                          size="md"
                          color="indigo"
                        />
                      </div>
                    )}

                    {selected.measurementType === MeasurementType.FLAT && (
                      <Text c="dimmed" ta="center">
                        Tap submit to log
                      </Text>
                    )}

                    {selected.measurementType === MeasurementType.DURATION && (
                      <NumberInput
                        label="Duration (minutes)"
                        value={duration}
                        onChange={setDuration}
                        step={1}
                        min={1}
                        size="lg"
                      />
                    )}

                    <Textarea
                      label="Note (optional)"
                      placeholder="Add a note about your workout..."
                      value={note}
                      onChange={(e) => setNote(e.currentTarget.value)}
                      maxLength={500}
                      autosize
                      minRows={2}
                      maxRows={4}
                    />

                    <Paper p="md" radius="lg" bg="energy.0" ta="center">
                      <Text size="sm" c="dimmed">
                        Points you will earn
                      </Text>
                      <AnimatedCounter
                        value={pointsPreview}
                        size="2rem"
                        fw={800}
                        c="energy.6"
                        duration={0.5}
                      />
                    </Paper>

                    <motion.div whileTap={{ scale: 0.97 }}>
                      <Button
                        fullWidth
                        size="lg"
                        color="indigo"
                        onClick={handleSubmit}
                        loading={submitting}
                        leftSection={<IconCheck size={20} />}
                      >
                        Log Activity
                      </Button>
                    </motion.div>
                  </Stack>
                </Paper>
              </Stack>
            </Container>
          </motion.div>
        ) : (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: -60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 60 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <Container size="lg">
              <Stack gap="lg">
                <Title order={2}>Log Activity</Title>
                <Text c="dimmed">Choose an activity type</Text>

                {activityTypes.length === 0 ? (
                  <Paper p="xl" radius="lg" shadow="xs" withBorder>
                    <Text c="dimmed" ta="center">
                      No activity types available. Ask an admin to create some.
                    </Text>
                  </Paper>
                ) : (
                  <AnimatedList>
                    <SimpleGrid cols={{ base: 2, sm: 2, md: 3 }}>
                      {activityTypes.map((at) => (
                        <AnimatedListItem key={at.id}>
                          <ActivityCard
                            activity={at}
                            selected={false}
                            onClick={() => {
                              vibrate('tap');
                              setSelected(at);
                            }}
                          />
                        </AnimatedListItem>
                      ))}
                    </SimpleGrid>
                  </AnimatedList>
                )}
              </Stack>
            </Container>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
```

**Step 3: Commit**

```bash
git add apps/web/src/app/(app)/log/page.tsx apps/web/src/components/ActivityCard.tsx
git commit -m "feat: redesign activity logging with celebration overlay and step animations"
```

---

## Task 8: Leaderboard Redesign

**Files:**
- Modify: `apps/web/src/app/(app)/leaderboard/page.tsx`

**Step 1: Rewrite leaderboard with podium and animated list**

Replace `apps/web/src/app/(app)/leaderboard/page.tsx`:

```typescript
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useMediaQuery } from '@mantine/hooks';
import {
  Container,
  Title,
  Text,
  Center,
  Loader,
  Stack,
  Paper,
  Group,
  Box,
  UnstyledButton,
} from '@mantine/core';
import { motion } from 'framer-motion';
import { IconTrophy } from '@tabler/icons-react';
import { api } from '../../../lib/api';
import type { LeaderboardEntry, ActivityLogResponse } from '@fitsy/shared';
import { useAuth } from '../../../lib/auth-context';
import { FeedItem } from '../../../components/FeedItem';
import { UserLink } from '../../../components/UserLink';
import { Podium } from '../../../components/Podium';
import { AnimatedList, AnimatedListItem } from '../../../components/AnimatedList';
import { AnimatedCounter } from '../../../components/AnimatedCounter';
import { listItemVariants } from '../../../lib/motion';

const periods = [
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'All Time', value: 'alltime' },
];

export default function LeaderboardPage() {
  const { user } = useAuth();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [period, setPeriod] = useState('week');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [feed, setFeed] = useState<ActivityLogResponse[]>([]);
  const [loadingBoard, setLoadingBoard] = useState(true);
  const [loadingFeed, setLoadingFeed] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    setLoadingBoard(true);
    try {
      const res = await api.get<LeaderboardEntry[]>(`/leaderboard?period=${period}`);
      setEntries(res);
    } catch {
      setEntries([]);
    } finally {
      setLoadingBoard(false);
    }
  }, [period]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  useEffect(() => {
    api
      .get<ActivityLogResponse[]>('/activity-logs/feed?limit=10')
      .then(setFeed)
      .catch(() => setFeed([]))
      .finally(() => setLoadingFeed(false));
  }, []);

  const activeIndex = periods.findIndex((p) => p.value === period);

  return (
    <Container size="lg">
      <Stack gap="lg">
        <Title order={2}>
          <Group gap="xs">
            <IconTrophy size={28} color="var(--mantine-color-sunshine-6)" />
            Leaderboard
          </Group>
        </Title>

        {/* Animated tab selector */}
        <Box
          style={{
            display: 'flex',
            position: 'relative',
            backgroundColor: 'var(--mantine-color-default)',
            borderRadius: 'var(--mantine-radius-xl)',
            padding: 4,
            border: '1px solid var(--mantine-color-default-border)',
          }}
        >
          {/* Sliding indicator */}
          <motion.div
            layoutId="periodIndicator"
            style={{
              position: 'absolute',
              top: 4,
              height: 'calc(100% - 8px)',
              width: `calc(${100 / periods.length}% - 4px)`,
              left: `calc(${(activeIndex * 100) / periods.length}% + 2px)`,
              backgroundColor: 'var(--mantine-color-indigo-6)',
              borderRadius: 'var(--mantine-radius-xl)',
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
          />
          {periods.map((p) => (
            <UnstyledButton
              key={p.value}
              onClick={() => setPeriod(p.value)}
              style={{
                flex: 1,
                textAlign: 'center',
                padding: '8px 0',
                position: 'relative',
                zIndex: 1,
                borderRadius: 'var(--mantine-radius-xl)',
              }}
            >
              <Text
                size="sm"
                fw={period === p.value ? 700 : 500}
                c={period === p.value ? 'white' : 'dimmed'}
              >
                {p.label}
              </Text>
            </UnstyledButton>
          ))}
        </Box>

        {loadingBoard ? (
          <Center py="xl">
            <Loader color="indigo" />
          </Center>
        ) : entries.length === 0 ? (
          <Center py="xl">
            <Stack align="center" gap="xs">
              <IconTrophy size={48} color="var(--mantine-color-dimmed)" />
              <Text c="dimmed" size="lg">
                No rankings yet
              </Text>
            </Stack>
          </Center>
        ) : (
          <>
            {/* Podium for top 3 */}
            {entries.length >= 2 && (
              <Podium
                entries={entries.slice(0, 3).map((e) => ({
                  userId: e.userId,
                  userName: e.userName,
                  avatarUrl: e.avatarUrl,
                  totalPoints: e.totalPoints,
                }))}
              />
            )}

            {/* Remaining ranks */}
            {entries.length > 3 && (
              <AnimatedList>
                <Stack gap="xs">
                  {entries.slice(3).map((entry, index) => {
                    const rank = index + 4;
                    const isCurrentUser = entry.userId === user?.id;
                    return (
                      <AnimatedListItem key={entry.userId}>
                        <Paper
                          p="md"
                          radius="lg"
                          shadow="xs"
                          withBorder
                          style={
                            isCurrentUser
                              ? { borderColor: 'var(--mantine-color-indigo-6)', backgroundColor: 'var(--mantine-color-indigo-0)' }
                              : undefined
                          }
                        >
                          <Group justify="space-between" align="center">
                            <Group gap="sm">
                              <Text fw={700} w={32} c="dimmed">
                                {rank}th
                              </Text>
                              <UserLink userId={entry.userId} name={entry.userName} avatarUrl={entry.avatarUrl} showAvatar fw={500} />
                              {isCurrentUser && (
                                <Text size="xs" fw={700} c="indigo">You</Text>
                              )}
                            </Group>
                            <Stack align="flex-end" gap={0}>
                              <AnimatedCounter value={entry.totalPoints} fw={600} c="energy.6" size="sm" suffix=" pts" />
                              <Text size="xs" c="dimmed">{entry.activityCount} activities</Text>
                            </Stack>
                          </Group>
                        </Paper>
                      </AnimatedListItem>
                    );
                  })}
                </Stack>
              </AnimatedList>
            )}
          </>
        )}

        {/* Family Activity Feed */}
        <Title order={3} mt="md">Family Activity Feed</Title>

        {loadingFeed ? (
          <Center py="md">
            <Loader color="indigo" size="sm" />
          </Center>
        ) : feed.length === 0 ? (
          <Text c="dimmed">No recent family activity.</Text>
        ) : (
          <AnimatedList>
            <Stack gap="xs">
              {feed.map((item) => (
                <AnimatedListItem key={item.id}>
                  <Paper p="sm" withBorder radius="lg" shadow="xs">
                    <FeedItem activity={item} />
                  </Paper>
                </AnimatedListItem>
              ))}
            </Stack>
          </AnimatedList>
        )}
      </Stack>
    </Container>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/app/(app)/leaderboard/page.tsx
git commit -m "feat: redesign leaderboard with visual podium and animated tab selector"
```

---

## Task 9: FeedItem, RewardCard & Rewards Page Redesign

**Files:**
- Modify: `apps/web/src/components/FeedItem.tsx`
- Modify: `apps/web/src/components/RewardCard.tsx`
- Modify: `apps/web/src/app/(app)/rewards/page.tsx`

**Step 1: Update FeedItem with reaction animations and new colors**

In `apps/web/src/components/FeedItem.tsx`, make these changes:

1. Add import: `import { motion } from 'framer-motion';`
2. Change every `color="teal"` to `color="indigo"` (there are multiple: avatar, points text, reaction toggle)
3. Change the points display `c="teal"` to `c="energy.6"`
4. Wrap each reaction `ActionIcon` in a `motion.div` with `whileTap={{ scale: 1.3 }}` and set `transition={{ type: 'spring', stiffness: 500, damping: 20 }}`
5. Change reacted color from `color="teal"` to `color="indigo"`

Specific changes to the FeedItem component:
- Line with `<Avatar color="teal"` → `<Avatar color="indigo"`
- Line with `c="teal"` (points) → `c="energy.6"`
- Reaction ActionIcon `color={reacted ? 'teal' : 'gray'}` → `color={reacted ? 'indigo' : 'gray'}`
- Wrap reaction ActionIcon:
```tsx
<motion.div key={emoji} whileTap={{ scale: 1.3 }} style={{ display: 'inline-flex' }}>
  <ActionIcon ...>
```

**Step 2: Update RewardCard**

In `apps/web/src/components/RewardCard.tsx`:

1. Add import: `import { motion } from 'framer-motion';`
2. Change `color="teal"` on Badge → `color="energy"`
3. Change `color="teal"` on both Buttons → `color="indigo"`
4. Change the fallback gradient to solid indigo: `background: 'var(--mantine-color-indigo-6)'`
5. Wrap the card in `motion.div` with `whileTap={{ scale: 0.98 }}`
6. Make the button pill-shaped by adding `radius="xl"` (already default from theme, but be explicit)

**Step 3: Update rewards page with confetti on redeem and new colors**

In `apps/web/src/app/(app)/rewards/page.tsx`:

1. Add imports for `Confetti`, `useHaptics`, `useSoundEffect`
2. Change all `color="teal"` → `color="indigo"`
3. Add confetti state: `const [showConfetti, setShowConfetti] = useState(false);`
4. In `handleConfirmRedeem` success path, trigger: `setShowConfetti(true); vibrate('achievement'); play('celebration');`
5. Add `<Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />` to the render
6. Add `setTimeout(() => setShowConfetti(false), 2500)` as a cleanup

**Step 4: Commit**

```bash
git add apps/web/src/components/FeedItem.tsx apps/web/src/components/RewardCard.tsx apps/web/src/app/(app)/rewards/page.tsx
git commit -m "feat: redesign feed items with reaction animations and rewards with confetti"
```

---

## Task 10: Profile Page Redesign

**Files:**
- Modify: `apps/web/src/components/ProfileHeader.tsx`
- Modify: `apps/web/src/components/ProfileStats.tsx`
- Modify: `apps/web/src/components/ProfileView.tsx`
- Modify: `apps/web/src/components/UserLink.tsx`

**Step 1: Update ProfileHeader with new colors**

In `apps/web/src/components/ProfileHeader.tsx`:
- Change `<Avatar ... color="teal"` → `color="indigo"`
- Change `<Badge color={profile.role === 'ADMIN' ? 'teal' : 'gray'}` → `color={profile.role === 'ADMIN' ? 'indigo' : 'gray'}`

**Step 2: Update ProfileStats with animated counters**

Replace `apps/web/src/components/ProfileStats.tsx`:

```typescript
'use client';

import { SimpleGrid, Paper, Text, Stack } from '@mantine/core';
import { motion } from 'framer-motion';
import { IconTrophy, IconActivity, IconFlame, IconChartBar } from '@tabler/icons-react';
import type { ProfileResponse } from '@fitsy/shared';
import { AnimatedCounter } from './AnimatedCounter';
import { listItemVariants } from '../lib/motion';

interface ProfileStatsProps {
  profile: ProfileResponse;
}

const statConfig = [
  { key: 'totalPoints' as const, label: 'Total Points', icon: IconTrophy, color: 'sunshine' },
  { key: 'activityCount' as const, label: 'Activities Logged', icon: IconActivity, color: 'mint' },
  { key: 'currentStreak' as const, label: 'Current Streak', icon: IconFlame, color: 'energy', suffix: ' days' },
  { key: 'avgPointsPerActivity' as const, label: 'Avg Pts/Activity', icon: IconChartBar, color: 'indigo' },
];

export function ProfileStats({ profile }: ProfileStatsProps) {
  return (
    <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
      {statConfig.map(({ key, label, icon: Icon, color, suffix }, index) => (
        <motion.div
          key={key}
          variants={listItemVariants}
          initial="initial"
          animate="animate"
          transition={{ delay: index * 0.08 }}
        >
          <Paper p="md" withBorder radius="lg" shadow="xs">
            <Stack gap={4} align="center">
              <Icon size={24} color={`var(--mantine-color-${color}-6)`} />
              <AnimatedCounter
                value={profile[key]}
                size="xl"
                fw={800}
                suffix={suffix || ''}
              />
              <Text size="xs" c="dimmed" ta="center">{label}</Text>
            </Stack>
          </Paper>
        </motion.div>
      ))}
    </SimpleGrid>
  );
}
```

**Step 3: Update ProfileView colors**

In `apps/web/src/components/ProfileView.tsx`:
- Change every `color="teal"` to `color="indigo"` (Loader, Pagination, SegmentedControl, Button, notification)

**Step 4: Update UserLink**

In `apps/web/src/components/UserLink.tsx`:
- Change `<Avatar ... color="teal"` → `color="indigo"`

**Step 5: Commit**

```bash
git add apps/web/src/components/ProfileHeader.tsx apps/web/src/components/ProfileStats.tsx apps/web/src/components/ProfileView.tsx apps/web/src/components/UserLink.tsx
git commit -m "feat: redesign profile with animated stats and updated color scheme"
```

---

## Task 11: Global Color Migration — Remaining Files

**Files:** Every remaining file that references `teal` or old colors.

**Step 1: Search for all remaining teal references**

Run: `grep -r "teal" apps/web/src/ --include="*.tsx" --include="*.ts" -l`

For every file found, replace:
- `color="teal"` → `color="indigo"` (Mantine component props)
- `c="teal"` → `c="indigo"` (Mantine text color)
- `c="teal"` for points → `c="energy.6"` (when it's about points earned)
- `color: 'teal'` in JS objects → `color: 'indigo'`
- `var(--mantine-color-teal-6)` → `var(--mantine-color-indigo-6)` in style objects
- `bg="teal.0"` → `bg="indigo.0"`

Key files to check:
- `apps/web/src/app/(app)/layout.tsx` (if any)
- `apps/web/src/app/(auth)/login/page.tsx`
- `apps/web/src/app/(auth)/register/page.tsx`
- `apps/web/src/app/(app)/my-activities/page.tsx`
- `apps/web/src/app/(app)/history/page.tsx`
- `apps/web/src/app/(app)/redemptions/page.tsx`
- `apps/web/src/app/(app)/create-family/page.tsx`
- `apps/web/src/app/(app)/join-family/page.tsx`
- `apps/web/src/app/(app)/setup-family/page.tsx`
- Any admin pages under `apps/web/src/app/(app)/admin/`

**Step 2: Also update notification colors**

Search for `color: 'teal'` in notification calls and replace with `color: 'indigo'` for general success, or `color: 'mint'` for explicit success states.

**Step 3: Verify build**

Run: `cd apps/web && pnpm build`
Expected: Clean build with no type errors

**Step 4: Commit**

```bash
git add -A apps/web/src/
git commit -m "feat: complete color migration from teal to indigo/energy palette across all pages"
```

---

## Task 12: PWA Service Worker Upgrade

**Files:**
- Modify: `apps/web/next.config.ts`
- Create: `apps/web/src/app/sw.ts` (Serwist service worker source)
- Delete: `apps/web/public/sw.js` (replaced by Serwist-generated SW)
- Modify: `apps/web/src/components/ServiceWorkerRegistration.tsx`
- Create: `apps/web/public/offline.html`

**Step 1: Check Serwist docs for Next.js integration**

Reference: https://serwist.pages.dev/docs/next/getting-started

The setup requires:
1. A `sw.ts` file in the app directory
2. `withSerwist()` wrapper in next.config.ts
3. Updated SW registration

**Step 2: Create the Serwist service worker source**

Create `apps/web/src/app/sw.ts`:

```typescript
import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { Serwist } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: '/offline.html',
        matcher({ request }) {
          return request.destination === 'document';
        },
      },
    ],
  },
});

serwist.addEventListeners();
```

**Step 3: Update next.config.ts**

Replace `apps/web/next.config.ts`:

```typescript
import type { NextConfig } from 'next';
import withSerwistInit from '@serwist/next';

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    optimizePackageImports: ['@mantine/core', '@mantine/hooks'],
  },
};

export default withSerwist(nextConfig);
```

**Step 4: Delete old sw.js**

```bash
rm apps/web/public/sw.js
```

**Step 5: Create branded offline page**

Create `apps/web/public/offline.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fitsy — Offline</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Plus Jakarta Sans Variable', system-ui, -apple-system, sans-serif;
      background: #F8F9FC;
      color: #2D3436;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
    }
    .container {
      text-align: center;
      max-width: 400px;
    }
    .icon {
      width: 80px;
      height: 80px;
      margin: 0 auto 24px;
      background: #6C5CE7;
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 40px;
    }
    h1 {
      font-size: 24px;
      font-weight: 800;
      margin-bottom: 12px;
      color: #2D3436;
    }
    p {
      color: #636E72;
      font-size: 16px;
      line-height: 1.5;
      margin-bottom: 24px;
    }
    button {
      background: #6C5CE7;
      color: white;
      border: none;
      padding: 12px 32px;
      border-radius: 999px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
    }
    button:active { transform: scale(0.97); }
    @media (prefers-color-scheme: dark) {
      body { background: #1A1B2E; color: #F5F6FA; }
      h1 { color: #F5F6FA; }
      p { color: #A4A6B8; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">📡</div>
    <h1>You're Offline</h1>
    <p>It looks like you've lost your internet connection. Don't worry — your fitness streak is safe! Reconnect and try again.</p>
    <button onclick="window.location.reload()">Try Again</button>
  </div>
</body>
</html>
```

**Step 6: Update ServiceWorkerRegistration**

The Serwist plugin auto-generates and injects the SW registration, but keep the manual registration as a fallback. Update `apps/web/src/components/ServiceWorkerRegistration.tsx` — no changes needed, it already registers `/sw.js`.

**Step 7: Verify build**

Run: `cd apps/web && pnpm build`
Expected: Build succeeds with Serwist generating the service worker

**Step 8: Commit**

```bash
git add apps/web/next.config.ts apps/web/src/app/sw.ts apps/web/public/offline.html apps/web/src/components/ServiceWorkerRegistration.tsx
git rm apps/web/public/sw.js 2>/dev/null || true
git commit -m "feat: upgrade service worker to Serwist with caching strategies and offline page"
```

---

## Task 13: Auth Pages Color Update

**Files:**
- Modify: `apps/web/src/app/(auth)/layout.tsx` (already fine, no color refs)
- Modify: `apps/web/src/app/(auth)/login/page.tsx`
- Modify: `apps/web/src/app/(auth)/register/page.tsx`

**Step 1: Update auth pages**

Search both login and register pages for `color="teal"` and replace with `color="indigo"`. These pages typically have:
- Submit button: `color="teal"` → `color="indigo"`
- Links: `c="teal"` → `c="indigo"`
- Anchor components: `color="teal"` → `color="indigo"`

**Step 2: Commit**

```bash
git add apps/web/src/app/\(auth\)/
git commit -m "feat: update auth pages to indigo color scheme"
```

---

## Task 14: Final Verification & Cleanup

**Step 1: Full grep for remaining teal references**

Run: `grep -r "teal" apps/web/src/ --include="*.tsx" --include="*.ts"`
Expected: Zero results (or only in comments/documentation)

**Step 2: Full build check**

Run: `cd apps/web && pnpm build`
Expected: Clean build, no errors

**Step 3: Visual verification**

Run: `cd apps/web && pnpm dev`
Open http://localhost:3000 and verify:
- [ ] New indigo color scheme on all pages
- [ ] Plus Jakarta Sans font loads
- [ ] Animated counters on dashboard
- [ ] Progress ring on dashboard
- [ ] Streak flame animation
- [ ] StatCards stagger animation
- [ ] Activity logging celebration with confetti
- [ ] Leaderboard podium layout
- [ ] Animated tab selector on leaderboard
- [ ] Reaction pop animation on feed items
- [ ] Bottom nav animated dot indicator
- [ ] Page transitions (enter/exit)
- [ ] Dark mode still works
- [ ] Mobile layout responsive

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete UI/UX enhancement — energetic gamified rebrand

Full redesign includes:
- Electric Indigo color palette with energy/coral/sunshine accents
- Plus Jakarta Sans typography
- Framer Motion animation system (page transitions, stagger lists, celebrations)
- Confetti and celebration overlay on activity logging
- Animated counters and progress ring on dashboard
- Visual podium on leaderboard
- Animated bottom nav with sliding indicator
- Haptic feedback and sound effect hooks
- Serwist PWA service worker with offline support
- Branded offline page"
```
