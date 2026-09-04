"use client";

import React, { useCallback, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Maximize2,
  RefreshCw,
  ArrowDownCircle,
  ArrowRightCircle,
  Sparkles,
  Layers,
} from "lucide-react";
import { useGraphStore, AppNode } from "@/store/graphStore";
import { nodeTypes } from "./CustomNodes";

function FlowCanvas() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    layoutDirection,
    setLayoutDirection,
    runDagreLayout,
    isParsing,
    isLinting,
    isAutoFixing,
  } = useGraphStore();

  const { fitView } = useReactFlow();

  const handleFitView = useCallback(() => {
    setTimeout(() => {
      fitView({ padding: 0.25, duration: 400 });
    }, 50);
  }, [fitView]);

  const handleToggleLayout = () => {
    const newDir = layoutDirection === "TB" ? "LR" : "TB";
    setLayoutDirection(newDir);
    setTimeout(() => fitView({ padding: 0.25, duration: 400 }), 50);
  };

  useEffect(() => {
    if (nodes.length > 0) {
      handleFitView();
    }
  }, [nodes.length, handleFitView]);

  return (
    <div className="relative w-full h-full bg-[#080c14] overflow-hidden">
      {/* Top Floating Control Bar */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-2 rounded-xl glass-panel shadow-2xl">
        <button
          onClick={handleToggleLayout}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-xs font-medium text-slate-200 border border-slate-700/50 transition-all hover:scale-105"
          title={`Switch to ${layoutDirection === "TB" ? "Horizontal (LR)" : "Vertical (TB)"} layout`}
        >
          {layoutDirection === "TB" ? (
            <>
              <ArrowDownCircle className="w-3.5 h-3.5 text-sky-400" />
              <span>Vertical (TB)</span>
            </>
          ) : (
            <>
              <ArrowRightCircle className="w-3.5 h-3.5 text-indigo-400" />
              <span>Horizontal (LR)</span>
            </>
          )}
        </button>

        <button
          onClick={() => {
            runDagreLayout();
            handleFitView();
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-xs font-medium text-slate-200 border border-slate-700/50 transition-all hover:scale-105"
          title="Auto-organize graph layout"
        >
          <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
          <span>Auto-Layout</span>
        </button>

        <button
          onClick={handleFitView}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-xs font-medium text-slate-200 border border-slate-700/50 transition-all hover:scale-105"
          title="Zoom to fit diagram"
        >
          <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
          <span>Fit View</span>
        </button>

        {/* Status Indicators */}
        {(isParsing || isLinting || isAutoFixing) && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-700/60 text-xs font-mono text-sky-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
            </span>
            <span>
              {isParsing
                ? "Synthesizing Topology..."
                : isAutoFixing
                ? "Applying 1-Click Fix..."
                : "Auditing NetworkX Rules..."}
            </span>
          </div>
        )}
      </div>

      {/* React Flow Canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.2}
        maxZoom={2}
        defaultEdgeOptions={{
          type: "smoothstep",
          animated: false,
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color="#1e293b"
        />
        <Controls position="bottom-right" showInteractive={false} />
        <MiniMap
          position="bottom-left"
          nodeStrokeWidth={3}
          nodeColor={(node) => {
            const data = node.data as AppNode["data"];
            if (data?.hasViolation) return "#f43f5e";
            switch (data?.type) {
              case "frontend":
                return "#38bdf8";
              case "gateway":
                return "#818cf8";
              case "service":
                return "#2dd4bf";
              case "database":
                return "#34d399";
              case "cache":
                return "#fbbf24";
              case "queue":
                return "#c084fc";
              default:
                return "#64748b";
            }
          }}
          maskColor="rgba(8, 12, 20, 0.75)"
          className="!bg-[#0c1322] !border !border-slate-800"
        />
      </ReactFlow>

      {/* Empty State Overlay */}
      {nodes.length === 0 && !isParsing && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-6 text-center">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-2xl backdrop-blur-md max-w-md">
            <div className="flex justify-center mb-3">
              <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
                <Layers className="w-8 h-8 animate-pulse" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-slate-100 mb-1">
              Canvas Ready for Architecture
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Speak into the microphone or select one of the instant enterprise demo presets on the left to synthesize the topology and run the NetworkX graph auditor.
            </p>
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-mono text-sky-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Try clicking &ldquo;E-Commerce Pipeline&rdquo;</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Canvas() {
  return (
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  );
}
