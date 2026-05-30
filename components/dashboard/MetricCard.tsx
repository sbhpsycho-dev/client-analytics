"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";
import { motion, useMotionValue, useTransform, animate, useReducedMotion } from "framer-motion";
import { useEffect } from "react";

type Variant = "revenue" | "rate-good" | "rate-warn" | "default";

const VARIANTS: Record<Variant, { bg: string; border: string; label: string; value: string; glow: string }> = {
  revenue:     { bg: "rgba(42,79,138,0.22)",  border: "#4a7ab5", label: "#a8bdd4", value: "#dce8f4", glow: "rgba(42,79,138,0.15)" },
  "rate-good": { bg: "rgba(52,211,153,0.10)", border: "#34d399", label: "#6ee7b7", value: "#d1fae5", glow: "rgba(52,211,153,0.08)" },
  "rate-warn": { bg: "rgba(251,191,36,0.09)", border: "#f59e0b", label: "#fcd34d", value: "#fef3c7", glow: "rgba(251,191,36,0.06)" },
  default:     { bg: "rgba(15,29,53,0.70)",   border: "rgba(180,210,240,0.15)", label: "#7a9ab8", value: "#dce8f4", glow: "transparent" },
};

function AnimatedNumber({ raw, display }: { raw: number; display: string }) {
  const reduced = useReducedMotion();
  const mv = useMotionValue(reduced ? raw : 0);
  const animated = useTransform(mv, () => display.replace(
    /[\d,]+(\.\d+)?/,
    (_, dec) => {
      const cur = mv.get();
      return dec ? cur.toFixed(dec.length - 1) : Math.round(cur).toLocaleString();
    }
  ));

  useEffect(() => {
    const ctrl = animate(mv, raw, { duration: 1.2, ease: "easeOut" });
    return ctrl.stop;
  }, [raw, mv]);

  return <motion.span>{animated}</motion.span>;
}

interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: number;
  prefix?: string;
  suffix?: string;
  variant?: Variant;
  className?: string;
  href?: string;
  index?: number;
}

export function MetricCard({ label, value, subValue, trend, prefix, suffix, variant = "default", className, href, index = 0 }: MetricCardProps) {
  const v = VARIANTS[variant];
  const hasTrend = trend !== undefined && trend !== null;
  const isUp = hasTrend && trend! > 0;
  const isDown = hasTrend && trend! < 0;
  const reduced = useReducedMotion();

  const numericValue = typeof value === "number" ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ""));
  const isNumeric = !isNaN(numericValue);

  const inner = (
    <motion.div
      className={cn("rounded-xl p-5 border-l-[3px] cursor-default", href && "cursor-pointer", className)}
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: "easeOut" }}
      whileHover={{ scale: 1.015, transition: { duration: 0.15 } }}
      style={{
        background: `linear-gradient(135deg, ${v.bg} 0%, rgba(13,24,40,0.75) 100%)`,
        borderLeftColor: v.border,
        borderTop: "1px solid rgba(180,210,240,0.07)",
        borderRight: "1px solid rgba(180,210,240,0.07)",
        borderBottom: "1px solid rgba(180,210,240,0.07)",
        boxShadow: `0 4px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05), 0 0 20px ${v.glow}`,
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: v.label }}>{label}</p>
        {href && <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-40 transition-opacity" style={{ color: v.label }} />}
      </div>
      <div className="flex items-end gap-1">
        {prefix && <span className="text-lg mb-0.5" style={{ color: v.label }}>{prefix}</span>}
        <span className="text-3xl font-bold tabular-nums leading-none" style={{ color: v.value }}>
          {isNumeric
            ? <AnimatedNumber raw={numericValue} display={typeof value === "number" ? value.toLocaleString() : String(value)} />
            : (typeof value === "number" ? value.toLocaleString() : value)
          }
        </span>
        {suffix && <span className="text-base mb-0.5" style={{ color: v.label }}>{suffix}</span>}
      </div>
      {(subValue || hasTrend) && (
        <div className="flex items-center gap-2 mt-2.5">
          {hasTrend && (
            <span className={cn("flex items-center gap-0.5 text-xs font-medium",
              isUp ? "text-emerald-400" : isDown ? "text-red-400" : "text-zinc-500")}>
              {isUp ? <TrendingUp className="h-3 w-3" /> : isDown ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
              {isUp ? "+" : ""}{trend?.toFixed(1)}%
            </span>
          )}
          {subValue && <span className="text-xs" style={{ color: "#4a6a8a" }}>{subValue}</span>}
        </div>
      )}
    </motion.div>
  );

  if (href) {
    return <Link href={href} className="group block">{inner}</Link>;
  }
  return inner;
}
