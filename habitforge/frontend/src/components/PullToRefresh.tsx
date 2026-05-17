/**
 * PullToRefresh — wrap page content to enable native-feeling pull-down refresh on mobile.
 * No-op on desktop (fine-pointer). Uses touchstart/move/end + framer-motion for indicator.
 */
import { useRef, useState, type ReactNode } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { Loader2, ArrowDown } from "lucide-react";
import { haptic } from "@/lib/utils";

interface Props {
  onRefresh: () => Promise<unknown> | unknown;
  children: ReactNode;
  /** Pull distance (px) required to trigger refresh. Default 70. */
  threshold?: number;
  /** Max pull distance (px). Default 120. */
  max?: number;
}

export function PullToRefresh({ onRefresh, children, threshold = 70, max = 120 }: Props) {
  const y = useMotionValue(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const armed = useRef(false);
  const triggered = useRef(false);

  const arrowRotate = useTransform(y, [0, threshold], [0, 180]);
  const indicatorOpacity = useTransform(y, [0, threshold * 0.5], [0, 1]);

  function onTouchStart(e: React.TouchEvent) {
    if (refreshing) return;
    // Only arm when at top of scroll
    const scroller = document.scrollingElement || document.documentElement;
    if (scroller.scrollTop > 0) return;
    startY.current = e.touches[0].clientY;
    armed.current = true;
    triggered.current = false;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!armed.current || startY.current === null || refreshing) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta <= 0) {
      y.set(0);
      return;
    }
    // Rubber-band: dampen past threshold
    const damped = delta < max ? delta * 0.5 : max * 0.5 + (delta - max) * 0.1;
    const capped = Math.min(damped, max);
    y.set(capped);
    if (!triggered.current && capped >= threshold) {
      triggered.current = true;
      haptic("light");
    }
  }

  async function onTouchEnd() {
    if (!armed.current || refreshing) {
      armed.current = false;
      return;
    }
    armed.current = false;
    const shouldRefresh = y.get() >= threshold;
    if (shouldRefresh) {
      setRefreshing(true);
      y.set(threshold * 0.6);
      haptic("medium");
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        y.set(0);
      }
    } else {
      y.set(0);
    }
  }

  return (
    <div
      className="relative md:contents"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      {/* Indicator */}
      <motion.div
        className="md:hidden pointer-events-none absolute left-0 right-0 -top-12 flex justify-center z-10"
        style={{ y, opacity: indicatorOpacity }}
      >
        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-white dark:bg-neutral-800 shadow-md border border-border dark:border-neutral-700">
          {refreshing ? (
            <Loader2 size={18} className="animate-spin text-indigo-500" />
          ) : (
            <motion.div style={{ rotate: arrowRotate }}>
              <ArrowDown size={18} className="text-indigo-500" />
            </motion.div>
          )}
        </div>
      </motion.div>

      <motion.div style={{ y }} transition={{ type: "spring", stiffness: 280, damping: 30 }}>
        {children}
      </motion.div>
    </div>
  );
}
