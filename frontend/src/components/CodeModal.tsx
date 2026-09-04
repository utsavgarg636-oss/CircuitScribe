"use client";

import React, { useState } from "react";
import {
  X,
  Copy,
  Check,
  Download,
  FileCode,
  Network,
  Braces,
  Terminal,
} from "lucide-react";
import { useGraphStore } from "@/store/graphStore";

export default function CodeModal() {
  const { isCodeModalOpen, setIsCodeModalOpen, exportResult } = useGraphStore();
  const [activeTab, setActiveTab] = useState<"docker" | "mermaid" | "json">("docker");
  const [copied, setCopied] = useState(false);

  if (!isCodeModalOpen || !exportResult) return null;

  const getCodeContent = () => {
    switch (activeTab) {
      case "docker":
        return exportResult.docker_compose_yaml;
      case "mermaid":
        return exportResult.mermaid_diagram;
      case "json":
        return JSON.stringify(exportResult.graph_json, null, 2);
    }
  };

  const getFileName = () => {
    switch (activeTab) {
      case "docker":
        return "docker-compose.yml";
      case "mermaid":
        return "architecture.mmd";
      case "json":
        return "architecture-graph.json";
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getCodeContent());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleDownload = () => {
    const content = getCodeContent();
    const fileName = getFileName();
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl glass-dropdown border border-slate-700/80 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                Compiled Infrastructure Code
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Ready to Deploy
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Deterministic artifacts compiled from your verified React Flow graph
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsCodeModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls & Actions */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800">
          {/* Tabs */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab("docker")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "docker"
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>docker-compose.yml</span>
            </button>

            <button
              onClick={() => setActiveTab("mermaid")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "mermaid"
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Mermaid.js Diagram</span>
            </button>

            <button
              onClick={() => setActiveTab("json")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "json"
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
              }`}
            >
              <Braces className="w-3.5 h-3.5" />
              <span>Graph Schema JSON</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all hover:scale-105"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold shadow-md shadow-sky-500/20 transition-all hover:scale-105"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          </div>
        </div>

        {/* Code Content Area */}
        <div className="flex-1 overflow-auto p-4 bg-[#080d1a] font-mono text-xs text-slate-300 leading-relaxed max-h-[60vh]">
          <pre className="selection:bg-sky-500/30 selection:text-sky-200 whitespace-pre">
            <code>{getCodeContent()}</code>
          </pre>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-3 border-t border-slate-800/80 bg-slate-950/80 text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Run locally:</span>
            <code className="px-2 py-0.5 rounded bg-slate-800 text-sky-400 font-bold">
              docker compose up -d
            </code>
          </div>
          <button
            onClick={() => setIsCodeModalOpen(false)}
            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-sans text-xs font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
