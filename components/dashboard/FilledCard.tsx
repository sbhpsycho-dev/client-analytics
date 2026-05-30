"use client";

import { motion, useMotionValue, useTransform, animate, useReducedMotion } from "framer-motion";
import { useEffect } from "react";
import { TrendingUp, TrendingDown, Minus, ChevronDown } from "lucide-react";

export type CardTheme = "navy" | "teal" | "emerald" | "amber" | "slate";

const THEMES: Record<CardTheme, { bg: string; border: string; label: string; value: string; trend: string }> = {
  navy:    { bg: "linear-gradient(135deg, #1a3e7a 0%, #0f2450 100%)", border: "rgba(74,122,181,0.35)",  label: "rgba(180,210,240,0.7)", value: "#ffffff", trend: "rgba(180,210,240,0.6)" },
  teal:    { bg: "linear-gradient(135deg, #0d5a6e 0%, #083848 100%)", border: "rgba(45,180,190,0.30)",  label: "rgba(150,220,230,0.7)", value: "#ffffff", trend: "rgba(150,220,230,0.6)" },
  emerald: { bg: "linear-gradient(135deg, #0d6e4a 0%, #084830 100%)", border: "rgba(52,211,153,0.30)",  label: "rgba(110,231,183,0.7)", value: "#ffffff", trend: "rgba(110,231,183,0.6)" },
  amber:   { bg: "linear-gradient(135deg, #5a3a0a 0%, #3a2206 100%)", border: "rgba(245,158,11,0.30)",  label: "rgba(252,211,77,0.7)",  value: "#ffffff", trend: "rgba(252,211,77,0.6)" },
  slate:   { bg: "linear-gradient(135deg, #162035 0%, #0d1828 100%)", border: "rgba(180,210,240,0.12)", label: "rgba(120,154,184,0.8)", value: "#dce8f4", trend: "rgba(100,140,170,0.6)" },
};

function AnimatedValue({ raw, display }: { raw: number; display: string }) {
  const reduced = useReducedMotion();
  const mv = useMotionValue(reduced ? raw : 0);
  const out = useTransform(mv, (v) => {
    // Preserve non-numeric prefix/suffix (e.g. "$", "%")
    return display.replace(/[\d,]+(\.\d+)?/, () => {
      const isFloat = display.includes(".");
      return isFloat
        ? v.toFixed(display.split(".")[1]?.length ?? 0)
        : Math.round(v).toLocaleString();
    });
  });

  useEffect(() => {
    const ctrl = animate(mv, raw, { duration: 1.2, ease: "easeOut" });
    return ctrl.stop;
  }, [raw, mv]);

  return <motion.span>{out}</motion.span>;
}

interface FilledCardProps {
  label: string;
  value: string | number;
  sub?: string;
  theme?: CardTheme;
  trend?: number;
  index?: number;
}

export function FilledCard({ label, value, sub, theme = "slate", trend, index = 0 }: FilledCardProps) {
  const t = THEMES[theme];
  const reduced = useReducedMotion();
  const isUp = trend !== undefined && trend > 0;
  const isDown = trend !== undefined && trend < 0;

  const displayVal = typeof value === "number" ? value.toLocaleString() : String(value);
  const rawNum = typeof value === "number"
    ? value
    : parseFloat(String(value).replace(/[^0-9.-]/g, ""));
  const canAnimate = !isNaN(rawNum);

  return (
    <motion.div
      className="rounded-xl p-5 flex flex-col gap-2 relative overflow-hidden"
      initial={reduced ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: "easeOut" }}
      whileHover={{ scale: 1.015, transition: { duration: 0.15 } }}
      style={{
        background: t.bg,
        border: `1px solid ${t.border}`,
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        minHeight: "120px",
      }}
    >
      {/* Top highlight line */}
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: "rgba(255,255,255,0.12)" }} />

      <p className="text-[10px] font-bold uppercase tracking-[0.18em] leading-none" style={{ color: t.label }}>
        {label}
      </p>

      <p className="text-3xl font-black tabular-nums leading-none" style={{ color: t.value }}>
        {canAnimate ? <AnimatedValue raw={rawNum} display={displayVal} /> : displayVal}
      </p>

      <div className="flex items-center justify-between mt-auto">
        {trend !== undefined ? (
          <span
            className="flex items-center gap-0.5 text-[11px] font-semibold"
            style={{ color: isUp ? "#4ade80" : isDown ? "#f87171" : t.trend }}
          >
            {isUp ? <TrendingUp className="h-3 w-3" /> : isDown ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
            {isUp ? "+" : ""}{trend.toFixed(1)}% vs last month
          </span>
        ) : (
          <span className="text-[11px]" style={{ color: t.trend }}>{sub ?? " "}</span>
        )}
        <ChevronDown className="h-3.5 w-3.5 opacity-25" style={{ color: t.value }} />
      </div>
    </motion.div>
  );
}
