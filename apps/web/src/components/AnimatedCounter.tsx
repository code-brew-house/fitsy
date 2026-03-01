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
