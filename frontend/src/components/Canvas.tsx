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
  ZoomIn,
  ZoomOut,
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

  const { fitView, zoomIn, zoomOut } = useReactFlow();

  const handleFitView = useCallback(() => {
    setTimeout(() => {
      fitView({ padding: 0.25, duration: 400 });
    }, 60);
  }, [fitView]);

  const handleToggleLayout = useCallback(() => {
    const newDir = layoutDirection === "TB" ? "LR" : "TB";
    setLayoutDirection(newDir);
    setTimeout(() => {
      fitView({ padding: 0.25, duration: 400 });
    }, 80);
  }, [layoutDirection, setLayoutDirection, fitView]);

  const handleAutoLayout = useCallback(() => {
    runDagreLayout(layoutDirection);
    setTimeout(() => {
      fitView({ padding: 0.25, duration: 400 });
    }, 80);
  }, [runDagreLayout, layoutDirection, fitView]);

  useEffect(() => {
    if (nodes.length > 0) {
      handleFitView();
    }
  }, [nodes.length, handleFitView]);

  return (
    <div className="relative w-full h-full bg-[#080c14] overflow-hidden select-none">
      {/* Top Floating Control Bar - High Z-index and clear pointer-events */}
      <div className="absolute top-4 left-6 z-30 flex items-center gap-2 px-3 py-2 rounded-xl glass-panel shadow-2xl pointer-events-auto border border-slate-700/80">
        <button
          type="button"
          onClick={handleToggleLayout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-xs font-semibold text-slate-100 border border-slate-700/60 shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
          title={`Switch layout to ${layoutDirection === "TB" ? "Horizontal (LR)" : "Vertical (TB)"}`}
        >
          {layoutDirection === "TB" ? (
            <>
              <ArrowDownCircle className="w-4 h-4 text-sky-400" />
              <span>Vertical (TB)</span>
            </>
          ) : (
            <>
              <ArrowRightCircle className="w-4 h-4 text-indigo-400" />
              <span>Horizontal (LR)</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleAutoLayout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-xs font-semibold text-slate-100 border border-slate-700/60 shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
          title="Auto-organize graph with Dagre"
        >
          <RefreshCw className="w-4 h-4 text-emerald-400" />
          <span>Auto-Layout</span>
        </button>

        <button
          type="button"
          onClick={handleFitView}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-xs font-semibold text-slate-100 border border-slate-700/60 shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
          title="Zoom to fit entire diagram"
        >
          <Maximize2 className="w-4 h-4 text-amber-400" />
          <span>Fit View</span>
        </button>

        {/* Quick Zoom Buttons */}
        <div className="flex items-center gap-1 pl-1.5 border-l border-slate-700/60">
          <button
            type="button"
            onClick={() => zoomIn({ duration: 300 })}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => zoomOut({ duration: 300 })}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Status Indicators */}
        {(isParsing || isLinting || isAutoFixing) && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-700/60 text-xs font-mono text-sky-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
            </span>
            <span>
              {isParsing
                ? "Synthesizing..."
                : isAutoFixing
                ? "Auto-Fixing..."
                : "Auditing..."}
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
        minZoom={0.1}
        maxZoom={2.5}
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
