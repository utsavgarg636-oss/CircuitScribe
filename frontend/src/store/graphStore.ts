import { create } from "zustand";
import {
  Node,
  Edge,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  Connection,
  addEdge,
  MarkerType,
  Position,
} from "@xyflow/react";
import dagre from "dagre";
import {
  ArchitectureGraph,
  LinterViolation,
  ExportResponse,
  api,
  CLIENT_PRESETS,
  NodeModel,
  EdgeModel,
} from "@/lib/api";

export interface CustomNodeData {
  id: string;
  label: string;
  type: "frontend" | "gateway" | "service" | "database" | "cache" | "queue";
  technology: string;
  port: number;
  replicas: number;
  description?: string;
  hasViolation?: boolean;
  violationSeverity?: "error" | "warning";
  violationMessage?: string;
  [key: string]: unknown;
}

export type AppNode = Node<CustomNodeData>;

interface GraphState {
  nodes: AppNode[];
  edges: Edge[];
  violations: LinterViolation[];
  isParsing: boolean;
  isLinting: boolean;
  isExporting: boolean;
  isAutoFixing: boolean;
  isCodeModalOpen: boolean;
  isLinterOpen: boolean;
  activePreset: string | null;
  layoutDirection: "TB" | "LR";
  exportResult: ExportResponse | null;
  summary: string;

  // Actions
  onNodesChange: (changes: NodeChange<AppNode>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  setLayoutDirection: (dir: "TB" | "LR") => void;
  toggleLinterOpen: () => void;
  setIsLinterOpen: (open: boolean) => void;
  setIsCodeModalOpen: (open: boolean) => void;

  loadGraph: (graph: ArchitectureGraph, presetId?: string) => Promise<void>;
  runDagreLayout: (direction?: "TB" | "LR") => void;
  runLint: () => Promise<void>;
  parsePrompt: (text: string, presetId?: string) => Promise<void>;
  applyAutoFix: (violationId: string) => Promise<void>;
  exportCode: () => Promise<void>;
}

// Convert ArchitectureGraph to React Flow Nodes & Edges with Dagre layout
function calculateDagreLayout(
  nodes: AppNode[],
  edges: Edge[],
  direction: "TB" | "LR" = "TB"
): { nodes: AppNode[]; edges: Edge[] } {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const isHorizontal = direction === "LR";
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: isHorizontal ? 60 : 70,
    ranksep: isHorizontal ? 90 : 80,
    marginx: 30,
    marginy: 30,
  });

  const nodeWidth = 240;
  const nodeHeight = 110;

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes: AppNode[] = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const x = nodeWithPosition ? Math.round(nodeWithPosition.x - nodeWidth / 2) : node.position.x;
    const y = nodeWithPosition ? Math.round(nodeWithPosition.y - nodeHeight / 2) : node.position.y;
    return {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: { x, y },
    };
  });

  return { nodes: layoutedNodes, edges: [...edges] };
}

// Helper to convert schemas to React Flow structures
function convertToFlowElements(
  graph: ArchitectureGraph,
  violations: LinterViolation[] = [],
  direction: "TB" | "LR" = "TB"
): { nodes: AppNode[]; edges: Edge[] } {
  const violationMap = new Map<string, LinterViolation>();
  violations.forEach((v) => {
    violationMap.set(v.target_node_id, v);
  });

  const rawNodes: AppNode[] = graph.nodes.map((node) => {
    const violation = violationMap.get(node.id);
    return {
      id: node.id,
      type: "customNode",
      position: { x: 0, y: 0 },
      data: {
        id: node.id,
        label: node.label,
        type: node.type,
        technology: node.technology,
        port: node.port,
        replicas: node.replicas,
        description: node.description,
        hasViolation: !!violation,
        violationSeverity: violation?.severity,
        violationMessage: violation?.message,
      },
    };
  });

  const rawEdges: Edge[] = graph.edges.map((edge) => {
    const isAsync = edge.is_async || edge.protocol === "PubSub";
    const badgeColor = edge.protocol === "gRPC" ? "#818cf8" : edge.protocol === "PubSub" ? "#c084fc" : edge.protocol === "WebSocket" ? "#38bdf8" : "#94a3b8";
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label || edge.protocol,
      animated: isAsync,
      style: {
        stroke: badgeColor,
        strokeWidth: 2,
        strokeDasharray: isAsync ? "5,5" : undefined,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: badgeColor,
        width: 16,
        height: 16,
      },
      labelStyle: {
        fill: "#f1f5f9",
        fontWeight: 600,
        fontSize: 11,
      },
      labelBgStyle: {
        fill: "#0f172a",
        fillOpacity: 0.9,
        rx: 4,
        ry: 4,
      },
    };
  });

  return calculateDagreLayout(rawNodes, rawEdges, direction);
}

// Convert React Flow state back to ArchitectureGraph for API calls
function convertToArchitectureGraph(nodes: AppNode[], edges: Edge[], summary: string): ArchitectureGraph {
  const schemaNodes: NodeModel[] = nodes.map((n) => ({
    id: n.id,
    label: n.data.label,
    type: n.data.type,
    technology: n.data.technology,
    port: n.data.port,
    replicas: n.data.replicas,
    description: n.data.description,
  }));

  const schemaEdges: EdgeModel[] = edges.map((e) => {
    const labelStr = typeof e.label === "string" ? e.label : "REST";
    let protocol: "REST" | "gRPC" | "PubSub" | "WebSocket" = "REST";
    if (labelStr.toLowerCase().includes("grpc")) protocol = "gRPC";
    else if (labelStr.toLowerCase().includes("pubsub") || labelStr.toLowerCase().includes("async") || e.animated) protocol = "PubSub";
    else if (labelStr.toLowerCase().includes("ws") || labelStr.toLowerCase().includes("websocket")) protocol = "WebSocket";

    return {
      id: e.id,
      source: e.source,
      target: e.target,
      protocol,
      is_async: !!e.animated,
      label: labelStr,
    };
  });

  return {
    nodes: schemaNodes,
    edges: schemaEdges,
    confidence: 1.0,
    summary,
  };
}

export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: [],
  edges: [],
  violations: [],
  isParsing: false,
  isLinting: false,
  isExporting: false,
  isAutoFixing: false,
  isCodeModalOpen: false,
  isLinterOpen: true,
  activePreset: "ecommerce",
  layoutDirection: "TB",
  exportResult: null,
  summary: "",

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes) as AppNode[],
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  onConnect: (connection) => {
    set({
      edges: addEdge(
        {
          ...connection,
          style: { stroke: "#38bdf8", strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#38bdf8" },
        },
        get().edges
      ),
    });
  },

  setLayoutDirection: (dir) => {
    set({ layoutDirection: dir });
    get().runDagreLayout(dir);
  },

  toggleLinterOpen: () => set({ isLinterOpen: !get().isLinterOpen }),
  setIsLinterOpen: (open) => set({ isLinterOpen: open }),
  setIsCodeModalOpen: (open) => set({ isCodeModalOpen: open }),

  loadGraph: async (graph, presetId) => {
    set({ isLinting: true, activePreset: presetId || null, summary: graph.summary || "" });
    try {
      const lintRes = await api.lint(graph);
      const { nodes, edges } = convertToFlowElements(graph, lintRes.violations, get().layoutDirection);
      set({
        nodes,
        edges,
        violations: lintRes.violations,
        isLinting: false,
      });
    } catch (err) {
      console.error("Failed to load and lint graph:", err);
      const { nodes, edges } = convertToFlowElements(graph, [], get().layoutDirection);
      set({ nodes, edges, isLinting: false });
    }
  },

  runDagreLayout: (direction) => {
    const dir = direction || get().layoutDirection;
    const currentNodes = get().nodes.map((n) => ({ ...n, position: { ...n.position } }));
    const currentEdges = get().edges.map((e) => ({ ...e }));
    const { nodes, edges } = calculateDagreLayout(currentNodes, currentEdges, dir);
    set({ nodes: [...nodes], edges: [...edges], layoutDirection: dir });
  },

  runLint: async () => {
    set({ isLinting: true });
    const graph = convertToArchitectureGraph(get().nodes, get().edges, get().summary);
    try {
      const res = await api.lint(graph);
      // Update nodes violation state
      const violationMap = new Map(res.violations.map((v) => [v.target_node_id, v]));
      const updatedNodes = get().nodes.map((node) => {
        const violation = violationMap.get(node.id);
        return {
          ...node,
          data: {
            ...node.data,
            hasViolation: !!violation,
            violationSeverity: violation?.severity,
            violationMessage: violation?.message,
          },
        };
      });

      set({
        nodes: updatedNodes,
        violations: res.violations,
        isLinting: false,
      });
    } catch (err) {
      console.error("Lint error:", err);
      set({ isLinting: false });
    }
  },

  parsePrompt: async (text, presetId) => {
    set({ isParsing: true });
    try {
      const graph = await api.parse(text, presetId);
      await get().loadGraph(graph, presetId);
    } catch (err) {
      console.error("Parse error:", err);
    } finally {
      set({ isParsing: false });
    }
  },

  applyAutoFix: async (violationId: string) => {
    set({ isAutoFixing: true });
    const violation = get().violations.find((v) => v.id === violationId);
    if (!violation) {
      set({ isAutoFixing: false });
      return;
    }

    const currentNodes = [...get().nodes];
    const currentEdges = [...get().edges];
    const payload = violation.auto_fix_payload || {};

    // 1. Scale Replicas Fix
    if (violation.auto_fix_type === "scale_replicas") {
      const targetId = payload.node_id || violation.target_node_id;
      const targetReplicas = payload.target_replicas || 2;
      const updatedNodes = currentNodes.map((n) => {
        if (n.id === targetId) {
          return {
            ...n,
            data: {
              ...n.data,
              replicas: targetReplicas,
              hasViolation: false,
              violationMessage: undefined,
            },
          };
        }
        return n;
      });
      set({ nodes: updatedNodes });
    }

    // 2. Add Redis Cache Layer Fix
    else if (violation.auto_fix_type === "add_cache") {
      const newNodeData = payload.new_node || {
        id: `node-cache-${Math.random().toString(36).substring(2, 6)}`,
        label: "Distributed Cache (Redis)",
        type: "cache",
        technology: "Redis",
        port: 6379,
        replicas: 1,
        description: "In-memory caching layer for read offloading",
      };

      const newNode: AppNode = {
        id: newNodeData.id,
        type: "customNode",
        position: { x: 0, y: 0 },
        data: {
          id: newNodeData.id,
          label: newNodeData.label,
          type: "cache",
          technology: newNodeData.technology,
          port: newNodeData.port,
          replicas: newNodeData.replicas,
          description: newNodeData.description,
          hasViolation: false,
        },
      };

      const sourceId = payload.source_id;
      const targetDbId = payload.target_db_id || violation.target_node_id;

      // Rewire edges: Source -> Cache (REST/TCP) and Cache -> DB (SQL Sync)
      const filteredEdges = currentEdges.filter(
        (e) => !(e.source === sourceId && e.target === targetDbId)
      );

      const edgeToCache: Edge = {
        id: `edge-cache-in-${Math.random().toString(36).substring(2, 6)}`,
        source: sourceId || currentNodes[0]?.id || "node-gateway",
        target: newNode.id,
        label: "Cache Read/Write",
        animated: false,
        style: { stroke: "#fbbf24", strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#fbbf24" },
      };

      const edgeFromCacheToDb: Edge = {
        id: `edge-cache-out-${Math.random().toString(36).substring(2, 6)}`,
        source: newNode.id,
        target: targetDbId,
        label: "Cache Miss / Fallback",
        animated: false,
        style: { stroke: "#34d399", strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#34d399" },
      };

      const combinedNodes = [...currentNodes, newNode];
      const combinedEdges = [...filteredEdges, edgeToCache, edgeFromCacheToDb];

      const layouted = calculateDagreLayout(combinedNodes, combinedEdges, get().layoutDirection);
      set({ nodes: layouted.nodes, edges: layouted.edges });
    }

    // 3. Add Message Queue / Buffer Fix
    else if (violation.auto_fix_type === "add_queue") {
      const newNodeData = payload.new_node || {
        id: `node-queue-${Math.random().toString(36).substring(2, 6)}`,
        label: "Message Queue (Kafka)",
        type: "queue",
        technology: "Apache Kafka",
        port: 9092,
        replicas: 1,
        description: "Distributed asynchronous event buffer",
      };

      const newNode: AppNode = {
        id: newNodeData.id,
        type: "customNode",
        position: { x: 0, y: 0 },
        data: {
          id: newNodeData.id,
          label: newNodeData.label,
          type: "queue",
          technology: newNodeData.technology,
          port: newNodeData.port,
          replicas: newNodeData.replicas,
          description: newNodeData.description,
          hasViolation: false,
        },
      };

      const sourceId = payload.source_id;
      const targetId = payload.target_id;
      const edgeId = payload.edge_id;

      const filteredEdges = currentEdges.filter(
        (e) => (edgeId ? e.id !== edgeId : !(e.source === sourceId && e.target === targetId))
      );

      const edgeToQueue: Edge = {
        id: `edge-q-pub-${Math.random().toString(36).substring(2, 6)}`,
        source: sourceId || currentNodes[0]?.id,
        target: newNode.id,
        label: "Publish Event (Async)",
        animated: true,
        style: { stroke: "#c084fc", strokeWidth: 2, strokeDasharray: "5,5" },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#c084fc" },
      };

      const edgeFromQueue: Edge = {
        id: `edge-q-sub-${Math.random().toString(36).substring(2, 6)}`,
        source: newNode.id,
        target: targetId || currentNodes[currentNodes.length - 1]?.id,
        label: "Consume Event",
        animated: true,
        style: { stroke: "#c084fc", strokeWidth: 2, strokeDasharray: "5,5" },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#c084fc" },
      };

      const combinedNodes = [...currentNodes, newNode];
      const combinedEdges = [...filteredEdges, edgeToQueue, edgeFromQueue];

      const layouted = calculateDagreLayout(combinedNodes, combinedEdges, get().layoutDirection);
      set({ nodes: layouted.nodes, edges: layouted.edges });
    }

    // 4. Break Circular Dependency Fix
    else if (violation.auto_fix_type === "break_cycle") {
      const srcId = payload.source_id;
      const tgtId = payload.target_id;

      const updatedEdges = currentEdges.map((e) => {
        if ((payload.edge_id_to_async && e.id === payload.edge_id_to_async) || (e.source === srcId && e.target === tgtId)) {
          return {
            ...e,
            label: "Async Event Dispatch",
            animated: true,
            style: { stroke: "#c084fc", strokeWidth: 2, strokeDasharray: "5,5" },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#c084fc" },
          };
        }
        return e;
      });
      set({ edges: updatedEdges });
    }

    // Re-run linter after fix
    await get().runLint();
    set({ isAutoFixing: false });
  },

  exportCode: async () => {
    set({ isExporting: true });
    const graph = convertToArchitectureGraph(get().nodes, get().edges, get().summary);
    try {
      const exportResult = await api.export(graph);
      set({ exportResult, isCodeModalOpen: true, isExporting: false });
    } catch (err) {
      console.error("Export error:", err);
      set({ isExporting: false });
    }
  },
}));
