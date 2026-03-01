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
