/**
 * MotionContainer + MotionItem — control-ingresos
 *
 * Convenience wrappers around `motion.div` that apply the `stagger` and
 * `slideUp` variants respectively. Use them for list animations:
 *
 *   <MotionContainer>
 *     {items.map(i => <MotionItem key={i.id}>...</MotionItem>)}
 *   </MotionContainer>
 */
import { motion, type HTMLMotionProps } from "motion/react";
import { slideUp, stagger } from "./variants";

export function MotionContainer({
  children,
  ...props
}: HTMLMotionProps<"div">): React.JSX.Element {
  return (
    <motion.div initial="hidden" animate="visible" variants={stagger} {...props}>
      {children}
    </motion.div>
  );
}

export function MotionItem({
  children,
  ...props
}: HTMLMotionProps<"div">): React.JSX.Element {
  return (
    <motion.div variants={slideUp} {...props}>
      {children}
    </motion.div>
  );
}
