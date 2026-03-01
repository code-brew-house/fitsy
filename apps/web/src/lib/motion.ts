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
