// ABOUTME: Horizontal typographic completeness readout. Mono number, two-layer hairline rule.
// ABOUTME: Editorial alternative to a circular progress ring. Amber overlay fills to percentage.

"use client";

import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion";

interface CompletenessIndicatorProps {
  value: number;
}

export function CompletenessIndicator({ value }: CompletenessIndicatorProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <motion.div
      variants={fadeUp}
      className="flex items-center gap-6 w-full"
      aria-label={`Profile completeness ${clamped} of 100`}
    >
      <span className="type-eyebrow text-paper-muted shrink-0">
        complete
      </span>

      <span
        className="type-mono text-paper shrink-0 tabular-nums"
        style={{ fontFeatureSettings: '"tnum"' }}
      >
        {String(clamped).padStart(3, "0")}
        <span className="text-paper-muted"> / 100</span>
      </span>

      <div className="relative flex-1 h-px" aria-hidden>
        <div
          className="absolute inset-0"
          style={{ background: "var(--line-subtle)" }}
        />
        <motion.div
          className="absolute left-0 top-0 bottom-0"
          style={{ background: "var(--amber)" }}
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        />
      </div>
    </motion.div>
  );
}
