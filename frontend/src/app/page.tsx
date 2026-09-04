"use client";

import React, { useEffect, useState } from "react";
import {
  Cpu,
  Layers,
  FileCode2,
  ShieldAlert,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  Share2,
  Activity,
  Github,
} from "lucide-react";
import Canvas from "@/components/Canvas";
import VoiceInput from "@/components/VoiceInput";
import LinterPanel from "@/components/LinterPanel";
import CodeModal from "@/components/CodeModal";
import { useGraphStore } from "@/store/graphStore";
import { CLIENT_PRESETS } from "@/lib/api";

export default function WorkspacePage() {
  const {
    violations,
    loadGraph,
    exportCode,
    isExporting,
    isLinterOpen,
    toggleLinterOpen,
  } = useGraphStore();

  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);

  // Initialize with the rich E-Commerce preset on first mount
  useEffect(() => {
    loadGraph(CLIENT_PRESETS.ecommerce, "ecommerce");
  }, [loadGraph]);

  const errorCount = violations.filter((v) => v.severity === "error").length;
  const warningCount = violations.filter((v) => v.severity === "warning").length;

  return (
    <main className="flex flex-col h-screen w-screen bg-[#080c14] overflow-hidden select-none font-sans">
      {/* Top Navigation Bar */}
      <header className="flex items-center justify-between h-14 px-4 bg-slate-950/90 border-b border-slate-800/80 z-30 shrink-0">
        {/* Brand & Badges */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 shadow-lg shadow-sky-500/25 text-slate-950">
              <Cpu className="w-5 h-5 font-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold tracking-tight text-white font-sans">
                  Circuit<span className="text-sky-400">Scribe</span>
                </span>
                <span className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30">
                  Hackathon MVP
                </span>
              </div>
              <p className="text-[10px] text-slate-400 -mt-0.5 hidden sm:block">
                Voice-to-Architecture • NetworkX Linter • Docker Compiler
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Linter Status Toggle Button */}
          <button
            onClick={toggleLinterOpen}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              violations.length === 0
                ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/30"
                : errorCount > 0
                ? "bg-rose-950/30 border-rose-500/50 text-rose-300 hover:bg-rose-900/40 shadow-[0_0_15px_rgba(244,63,94,0.2)]"
                : "bg-amber-950/30 border-amber-500/50 text-amber-300 hover:bg-amber-900/40"
            }`}
          >
            {violations.length === 0 ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            ) : (
              <ShieldAlert className="w-4 h-4 animate-pulse" />
            )}
            <span>
              {violations.length === 0
                ? "0 Vulnerabilities"
                : `${violations.length} Audit ${violations.length === 1 ? "Alert" : "Alerts"}`}
            </span>
          </button>

          {/* Export Code Button */}
          <button
            onClick={exportCode}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 text-slate-950 font-bold text-xs shadow-lg shadow-sky-500/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            <FileCode2 className="w-4 h-4" />
            <span>{isExporting ? "Compiling..." : "Compile & Export Docker"}</span>
          </button>
        </div>
      </header>

        {/* Main Workspace Body */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Left Sidebar: Ingestion & Presets */}
          <div
            className={`relative transition-all duration-300 ease-in-out border-r border-slate-800/80 bg-slate-950/70 flex flex-col z-20 shrink-0 ${
              isLeftPanelOpen ? "w-80 sm:w-96" : "w-0 overflow-hidden border-none"
            }`}
          >
            <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
              <div className="flex items-center justify-between pb-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Panel Controls
                </span>
                <button
                  type="button"
                  onClick={() => setIsLeftPanelOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
                  title="Collapse sidebar"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>
              <VoiceInput />
            </div>
          </div>

          {/* Central Main Canvas */}
          <div className="flex-1 h-full relative">
            {!isLeftPanelOpen && (
              <button
                type="button"
                onClick={() => setIsLeftPanelOpen(true)}
                className="absolute top-4 left-4 z-40 p-2.5 rounded-xl glass-panel text-slate-300 hover:text-white hover:bg-slate-800 transition-all shadow-2xl border border-slate-700 hover:scale-105"
                title="Open ingestion sidebar"
              >
                <PanelLeftOpen className="w-4 h-4 text-sky-400" />
              </button>
            )}
            <Canvas />
          </div>

        {/* Right Sidebar: Linter & 1-Click Auto-Fixes */}
        {isLinterOpen && (
          <div className="w-80 sm:w-96 border-l border-slate-800/80 bg-slate-950/50 flex flex-col p-3.5 z-20 transition-all duration-300">
            <LinterPanel />
          </div>
        )}
      </div>

      {/* Code Export Modal */}
      <CodeModal />
    </main>
  );
}
