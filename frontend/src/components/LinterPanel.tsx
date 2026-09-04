"use client";

import React from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Wrench,
  AlertTriangle,
  AlertCircle,
  Sparkles,
  ChevronRight,
  Info,
  CheckCircle2,
} from "lucide-react";
import { useGraphStore } from "@/store/graphStore";
import { LinterViolation } from "@/lib/api";

export default function LinterPanel() {
  const { violations, applyAutoFix, isAutoFixing, isLinting } = useGraphStore();

  const errors = violations.filter((v) => v.severity === "error");
  const warnings = violations.filter((v) => v.severity === "warning");

  return (
    <div className="flex flex-col h-full rounded-2xl glass-panel text-slate-100 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-xl border ${
              violations.length === 0
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-rose-500/10 border-rose-500/20 text-rose-400"
            }`}
          >
            {violations.length === 0 ? (
              <ShieldCheck className="w-5 h-5" />
            ) : (
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            )}
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100">
              NetworkX Graph Linter
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">
              Deterministic Distributed Audits
            </p>
          </div>
        </div>

        {/* Stats Pill */}
        <div className="flex items-center gap-1.5 text-[10px] font-mono">
          {errors.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
              {errors.length} Errors
            </span>
          )}
          {warnings.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
              {warnings.length} Warnings
            </span>
          )}
          {violations.length === 0 && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
              Clean (0)
            </span>
          )}
        </div>
      </div>

      {/* Violations List Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {violations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-8 text-center">
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-3 shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-sm font-bold text-slate-200">
              Zero Architecture Vulnerabilities
            </h4>
            <p className="text-xs text-slate-400 max-w-xs mt-1 leading-relaxed">
              All 4 distributed audit rules verified: No single points of failure, unbuffered writes, missing cache tiers, or synchronous cycles.
            </p>
          </div>
        ) : (
          violations.map((violation: LinterViolation) => {
            const isError = violation.severity === "error";
            return (
              <div
                key={violation.id}
                className={`flex flex-col gap-2.5 p-3.5 rounded-xl border transition-all ${
                  isError
                    ? "bg-rose-950/20 border-rose-500/40 hover:border-rose-500/70"
                    : "bg-amber-950/20 border-amber-500/40 hover:border-amber-500/70"
                }`}
              >
                {/* Violation Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {isError ? (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                    <span
                      className={`text-xs font-bold ${
                        isError ? "text-rose-200" : "text-amber-200"
                      }`}
                    >
                      {violation.rule_name}
                    </span>
                  </div>
                  <span
                    className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded font-bold ${
                      isError
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    }`}
                  >
                    {violation.severity}
                  </span>
                </div>

                {/* Description */}
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {violation.message}
                </p>

                {/* Remediation Note */}
                <div className="flex items-start gap-1.5 p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-[10px] text-slate-400">
                  <Info className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                  <span className="leading-snug">{violation.suggested_action}</span>
                </div>

                {/* 1-Click Auto-Fix Action Button */}
                {violation.auto_fix_type && (
                  <button
                    onClick={() => applyAutoFix(violation.id)}
                    disabled={isAutoFixing || isLinting}
                    className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 text-slate-950 font-bold text-xs shadow-lg shadow-sky-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed mt-1"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>
                      {isAutoFixing
                        ? "Restructuring Canvas..."
                        : violation.auto_fix_type === "scale_replicas"
                        ? "1-Click Fix: Scale to 2 Replicas"
                        : violation.auto_fix_type === "add_cache"
                        ? "1-Click Fix: Insert Redis Cache Layer"
                        : violation.auto_fix_type === "add_queue"
                        ? "1-Click Fix: Insert Kafka Event Buffer"
                        : "1-Click Fix: Break Synchronous Cycle"}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 ml-auto" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Rule Explanation */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 text-[10px] text-slate-500 flex items-center justify-between font-mono">
        <span>Auditing: SPOF, Caching, Buffers &amp; Cycles</span>
        <Sparkles className="w-3 h-3 text-sky-400" />
      </div>
    </div>
  );
}
