import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import {
  Monitor,
  Shield,
  Cpu,
  Database,
  Zap,
  Radio,
  AlertTriangle,
  Layers,
  Server,
} from "lucide-react";
import { CustomNodeData, AppNode } from "@/store/graphStore";

// Node styling theme configurations
const NODE_THEMES = {
  frontend: {
    border: "border-sky-500/60 hover:border-sky-400",
    bg: "from-sky-950/40 to-slate-900/90",
    glow: "shadow-[0_0_15px_rgba(56,189,248,0.15)] hover:shadow-[0_0_25px_rgba(56,189,248,0.3)]",
    iconColor: "text-sky-400",
    badgeBg: "bg-sky-500/10 text-sky-300 border-sky-500/30",
    handleColor: "#38bdf8",
    Icon: Monitor,
  },
  gateway: {
    border: "border-indigo-500/60 hover:border-indigo-400",
    bg: "from-indigo-950/40 to-slate-900/90",
    glow: "shadow-[0_0_15px_rgba(129,140,248,0.15)] hover:shadow-[0_0_25px_rgba(129,140,248,0.3)]",
    iconColor: "text-indigo-400",
    badgeBg: "bg-indigo-500/10 text-indigo-300 border-indigo-500/30",
    handleColor: "#818cf8",
    Icon: Shield,
  },
  service: {
    border: "border-teal-500/60 hover:border-teal-400",
    bg: "from-teal-950/40 to-slate-900/90",
    glow: "shadow-[0_0_15px_rgba(45,212,191,0.15)] hover:shadow-[0_0_25px_rgba(45,212,191,0.3)]",
    iconColor: "text-teal-400",
    badgeBg: "bg-teal-500/10 text-teal-300 border-teal-500/30",
    handleColor: "#2dd4bf",
    Icon: Cpu,
  },
  database: {
    border: "border-emerald-500/60 hover:border-emerald-400",
    bg: "from-emerald-950/40 to-slate-900/90",
    glow: "shadow-[0_0_15px_rgba(52,211,153,0.15)] hover:shadow-[0_0_25px_rgba(52,211,153,0.3)]",
    iconColor: "text-emerald-400",
    badgeBg: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    handleColor: "#34d399",
    Icon: Database,
  },
  cache: {
    border: "border-amber-500/60 hover:border-amber-400",
    bg: "from-amber-950/40 to-slate-900/90",
    glow: "shadow-[0_0_15px_rgba(251,191,36,0.15)] hover:shadow-[0_0_25px_rgba(251,191,36,0.3)]",
    iconColor: "text-amber-400",
    badgeBg: "bg-amber-500/10 text-amber-300 border-amber-500/30",
    handleColor: "#fbbf24",
    Icon: Zap,
  },
  queue: {
    border: "border-purple-500/60 hover:border-purple-400",
    bg: "from-purple-950/40 to-slate-900/90",
    glow: "shadow-[0_0_15px_rgba(192,132,252,0.15)] hover:shadow-[0_0_25px_rgba(192,132,252,0.3)]",
    iconColor: "text-purple-400",
    badgeBg: "bg-purple-500/10 text-purple-300 border-purple-500/30",
    handleColor: "#c084fc",
    Icon: Radio,
  },
};

export const CustomArchitectureNode = memo(({ data, selected }: NodeProps<AppNode>) => {
  const nodeType = data.type || "service";
  const theme = NODE_THEMES[nodeType] || NODE_THEMES.service;
  const { Icon } = theme;

  return (
    <div
      className={`relative min-w-[220px] max-w-[260px] rounded-xl border bg-gradient-to-b ${theme.bg} ${
        data.hasViolation
          ? data.violationSeverity === "error"
            ? "border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.35)] animate-pulse-fast"
            : "border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
          : selected
          ? "border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.4)]"
          : `${theme.border} ${theme.glow}`
      } p-3.5 backdrop-blur-md transition-all duration-200 group`}
    >
      {/* Target Handles (Incoming) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2.5 !h-2.5 !border-2 !border-slate-900"
        style={{ backgroundColor: theme.handleColor }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="handle-left"
        className="!w-2.5 !h-2.5 !border-2 !border-slate-900 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ backgroundColor: theme.handleColor }}
      />

      {/* Violation Alert Badge */}
      {data.hasViolation && (
        <div
          className={`absolute -top-2.5 -right-2.5 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-lg ring-2 ring-slate-950 ${
            data.violationSeverity === "error"
              ? "bg-rose-500 text-white animate-bounce"
              : "bg-amber-500 text-slate-950"
          }`}
          title={data.violationMessage || "Architectural violation detected"}
        >
          <AlertTriangle className="w-3 h-3" />
          <span>{data.violationSeverity === "error" ? "CRITICAL" : "AUDIT"}</span>
        </div>
      )}

      {/* Header Info */}
      <div className="flex items-center gap-2.5 mb-2">
        <div className={`p-1.5 rounded-lg bg-slate-800/80 border border-slate-700/50 ${theme.iconColor}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-slate-100 truncate tracking-tight">
            {data.label}
          </div>
          <div className="text-[10px] font-mono text-slate-400 truncate">
            {data.technology}
          </div>
        </div>
      </div>

      {/* Node Metadata Badges */}
      <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-800/80 text-[10px]">
        <div className="flex items-center gap-1 text-slate-300 font-mono">
          <Server className="w-3 h-3 text-slate-500" />
          <span>:{data.port}</span>
        </div>

        <div className="flex items-center gap-1.5">
          {data.replicas > 1 && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono">
              <Layers className="w-2.5 h-2.5" />
              {data.replicas}x
            </span>
          )}
          <span className={`px-1.5 py-0.2 rounded border font-medium uppercase tracking-wider text-[9px] ${theme.badgeBg}`}>
            {data.type}
          </span>
        </div>
      </div>

      {/* Source Handles (Outgoing) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2.5 !h-2.5 !border-2 !border-slate-900"
        style={{ backgroundColor: theme.handleColor }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="handle-right"
        className="!w-2.5 !h-2.5 !border-2 !border-slate-900 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ backgroundColor: theme.handleColor }}
      />
    </div>
  );
});

CustomArchitectureNode.displayName = "CustomArchitectureNode";

export const nodeTypes: any = {
  customNode: CustomArchitectureNode,
};
