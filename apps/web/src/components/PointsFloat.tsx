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
