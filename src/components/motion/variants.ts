/**
 * Motion variants — control-ingresos
 *
 * Centralized animation definitions. Use these in any `motion.*` component
 * to keep timings and easings consistent across the app. Values are tuned
 * for the Apple-style "soft" easing: fast for micro-interactions, slow
 * for transitions.
 */
import type { Variants } from "motion/react";

/** 200ms fade — for appearance and disappearance. */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
  },
};

/** 300ms slide up from 12px — for cards, modals, page sections. */
export const slideUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    opacity: 0,
    y: 8,
    transition: { duration: 0.15, ease: [0.65, 0, 0.35, 1] },
  },
};

/** 200ms scale in — for popovers, dropdowns, tooltips. */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    transition: { duration: 0.15, ease: [0.65, 0, 0.35, 1] },
  },
};

/** Stagger container for lists. Children should use `slideUp` or similar. */
export const stagger: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
};

/** 600ms color transition — for the budget control widget. */
export const budgetColorTransition: Variants = {
  safe: {
    backgroundColor: "var(--color-success)",
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
  warning: {
    backgroundColor: "var(--color-warning)",
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
  danger: {
    backgroundColor: "var(--color-danger-neon)",
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
};
