'use client';

import { useCallback, useRef, useEffect } from 'react';

type SoundEffect = 'pointEarn' | 'celebration' | 'tap' | 'error';

const SOUND_ENABLED_KEY = 'fitsy-sounds-enabled';

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
