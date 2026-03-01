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
