// ABOUTME: Shared Framer Motion variants and easing for the Editorial Noir motion system.
// ABOUTME: Restrained, slow, easeOutExpo. Staggered page load reveals, no bouncy springs.

import type { Variants, Transition } from 'framer-motion';

export const ease = [0.16, 1, 0.3, 1] as const;

export const baseTransition: Transition = {
  duration: 0.5,
  ease,
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: baseTransition,
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: baseTransition,
  },
};

export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
};
