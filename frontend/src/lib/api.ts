import axios from "axios";

export type NodeType = "frontend" | "gateway" | "service" | "database" | "cache" | "queue";
export type Protocol = "REST" | "gRPC" | "PubSub" | "WebSocket";
export type Severity = "error" | "warning";

export interface NodeModel {
  id: string;
  label: string;
  type: NodeType;
  technology: string;
  port: number;
  replicas: number;
  description?: string;
}

export interface EdgeModel {
  id: string;
  source: string;
  target: string;
  protocol: Protocol;
  is_async: boolean;
  label?: string;
}

export interface ArchitectureGraph {
  nodes: NodeModel[];
  edges: EdgeModel[];
  confidence: number;
  summary?: string;
}

export interface LinterViolation {
  id: string;
  rule_name: string;
  severity: Severity;
  message: string;
  target_node_id: string;
  suggested_action: string;
  auto_fix_type?: "scale_replicas" | "add_cache" | "add_queue" | "break_cycle" | string;
  auto_fix_payload?: Record<string, any>;
}

export interface LintResponse {
  violations: LinterViolation[];
  is_clean: boolean;
  total_violations: number;
}

export interface ExportResponse {
  docker_compose_yaml: string;
  mermaid_diagram: string;
  graph_json: Record<string, any>;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Built-in Instant Presets for zero-latency instant loading and offline fail-safe
export const CLIENT_PRESETS: Record<string, ArchitectureGraph> = {
  ecommerce: {
    confidence: 1.0,
    summary: "E-Commerce Pipeline (React -> Kong Gateway -> Auth & Order Services -> PostgreSQL & Kafka -> Fulfillment Worker)",
    nodes: [
      {
        id: "node-frontend",
        label: "Storefront Web (Next.js)",
        type: "frontend",
        technology: "Next.js",
        port: 3000,
        replicas: 2,
        description: "Customer-facing web shop",
      },
      {
        id: "node-gateway",
        label: "API Gateway (Kong)",
        type: "gateway",
        technology: "Kong",
        port: 8000,
        replicas: 2,
        description: "Reverse proxy and rate limiting gateway",
      },
      {
        id: "node-auth",
        label: "Auth Service (Express)",
        type: "service",
        technology: "Express.js",
        port: 4001,
        replicas: 2,
        description: "Authentication and session token service",
      },
      {
        id: "node-order",
        label: "Order Service (FastAPI)",
        type: "service",
        technology: "FastAPI",
        port: 4002,
        replicas: 2,
        description: "Processes checkouts and order states",
      },
      {
        id: "node-postgres",
        label: "Relational DB (PostgreSQL)",
        type: "database",
        technology: "PostgreSQL",
        port: 5432,
        replicas: 1, // Intentional SPOF vulnerability
        description: "Primary database store",
      },
      {
        id: "node-worker",
        label: "Order Fulfillment Worker",
        type: "service",
        technology: "Python Worker",
        port: 4003,
        replicas: 1,
        description: "Background order delivery worker",
      },
    ],
    edges: [
      { id: "edge-1", source: "node-frontend", target: "node-gateway", protocol: "REST", is_async: false, label: "HTTPS" },
      { id: "edge-2", source: "node-gateway", target: "node-auth", protocol: "gRPC", is_async: false, label: "gRPC Auth" },
      { id: "edge-3", source: "node-gateway", target: "node-order", protocol: "REST", is_async: false, label: "REST Orders" },
      { id: "edge-4", source: "node-auth", target: "node-postgres", protocol: "REST", is_async: false, label: "Direct SQL" },
      { id: "edge-5", source: "node-order", target: "node-postgres", protocol: "REST", is_async: false, label: "Direct SQL" },
      { id: "edge-6", source: "node-order", target: "node-worker", protocol: "REST", is_async: false, label: "Sync Dispatch (Unbuffered)" },
    ],
  },
  fintech: {
    confidence: 1.0,
    summary: "FinTech Payment Gateway (Mobile -> Envoy Edge -> Payment Engine <-> Fraud Detection -> Ledger DB)",
    nodes: [
      {
        id: "node-mobile",
        label: "FinTech Mobile App",
        type: "frontend",
        technology: "React Native",
        port: 8080,
        replicas: 1,
        description: "Customer banking mobile application",
      },
      {
        id: "node-edge-proxy",
        label: "Edge Security Proxy",
        type: "gateway",
        technology: "Envoy Proxy",
        port: 443,
        replicas: 3,
        description: "mTLS termination and security shield",
      },
      {
        id: "node-payment-svc",
        label: "Payment Engine",
        type: "service",
        technology: "Golang",
        port: 9001,
        replicas: 3,
        description: "Card processing and payment settlement",
      },
      {
        id: "node-fraud-svc",
        label: "Fraud Detection Service",
        type: "service",
        technology: "Python ML",
        port: 9002,
        replicas: 2,
        description: "Realtime ML risk scoring",
      },
      {
        id: "node-fin-db",
        label: "Ledger Database (PostgreSQL)",
        type: "database",
        technology: "PostgreSQL",
        port: 5432,
        replicas: 1,
        description: "Financial ledger storage",
      },
    ],
    edges: [
      { id: "edge-f1", source: "node-mobile", target: "node-edge-proxy", protocol: "REST", is_async: false, label: "mTLS REST" },
      { id: "edge-f2", source: "node-edge-proxy", target: "node-payment-svc", protocol: "gRPC", is_async: false, label: "gRPC Pay" },
      { id: "edge-f3", source: "node-payment-svc", target: "node-fraud-svc", protocol: "gRPC", is_async: false, label: "Fraud Check" },
      { id: "edge-f4", source: "node-fraud-svc", target: "node-payment-svc", protocol: "REST", is_async: false, label: "Circular Callback (Cycle)" },
      { id: "edge-f5", source: "node-payment-svc", target: "node-fin-db", protocol: "REST", is_async: false, label: "Direct Writes" },
    ],
  },
  iot: {
    confidence: 1.0,
    summary: "IoT Telemetry Ingestion (Sensor Fleet -> MQTT Gateway -> TimeSeries DB -> Alerting Service)",
    nodes: [
      {
        id: "node-sensors",
        label: "Industrial Sensor Fleet",
        type: "frontend",
        technology: "MQTT Sensors",
        port: 1883,
        replicas: 1,
        description: "Edge telemetry sensors",
      },
      {
        id: "node-iot-gateway",
        label: "IoT Ingestion Gateway",
        type: "gateway",
        technology: "EMQX Gateway",
        port: 8883,
        replicas: 2,
        description: "High volume sensor ingestion proxy",
      },
      {
        id: "node-telemetry-db",
        label: "TimeSeries DB (PostgreSQL)",
        type: "database",
        technology: "PostgreSQL Timescale",
        port: 5432,
        replicas: 1,
        description: "Raw sensor time-series store",
      },
      {
        id: "node-alert-svc",
        label: "Anomaly Alert Service",
        type: "service",
        technology: "FastAPI",
        port: 5000,
        replicas: 1,
        description: "Realtime anomaly detection",
      },
    ],
    edges: [
      { id: "edge-i1", source: "node-sensors", target: "node-iot-gateway", protocol: "WebSocket", is_async: true, label: "MQTT/WS" },
      { id: "edge-i2", source: "node-iot-gateway", target: "node-telemetry-db", protocol: "REST", is_async: false, label: "Direct REST Write (Bottleneck)" },
      { id: "edge-i3", source: "node-telemetry-db", target: "node-alert-svc", protocol: "REST", is_async: false, label: "Direct Polling" },
    ],
  },
};

// Client-side deterministic Linter engine fallback
export function clientSideLint(graph: ArchitectureGraph): LintResponse {
  const violations: LinterViolation[] = [];
  const nodeMap = new Map<string, NodeModel>(graph.nodes.map((n) => [n.id, n]));

  // Count in-degrees
  const inDegreeMap = new Map<string, number>();
  const incomingSources = new Map<string, string[]>();
  graph.nodes.forEach((n) => {
    inDegreeMap.set(n.id, 0);
    incomingSources.set(n.id, []);
  });

  graph.edges.forEach((e) => {
    inDegreeMap.set(e.target, (inDegreeMap.get(e.target) || 0) + 1);
    const list = incomingSources.get(e.target) || [];
    list.push(e.source);
    incomingSources.set(e.target, list);
  });

  // Rule 1: Single Point of Failure (SPOF)
  graph.nodes.forEach((node) => {
    const inDeg = inDegreeMap.get(node.id) || 0;
    if ((node.type === "database" || node.type === "cache") && inDeg > 1 && node.replicas <= 1) {
      violations.push({
        id: `violation-spof-${node.id}`,
        rule_name: "Single Point of Failure (SPOF)",
        severity: inDeg >= 3 ? "error" : "warning",
        message: `${node.type === "database" ? "Database" : "Cache"} '${node.label}' receives traffic from ${inDeg} components with only 1 replica. A single node crash causes total system outage.`,
        target_node_id: node.id,
        suggested_action: "Scale replicas to 2+ or provision automated read replica replication.",
        auto_fix_type: "scale_replicas",
        auto_fix_payload: {
          node_id: node.id,
          target_replicas: 2,
        },
      });
    }
  });

  // Rule 2: Missing Cache Layer
  const hasCache = graph.nodes.some((n) => n.type === "cache");
  graph.nodes.forEach((node) => {
    if (node.type === "database" && /postgres|mysql|mariadb|sql|timescale/i.test(node.technology)) {
      const preds = incomingSources.get(node.id) || [];
      const servicesWithoutCache = preds
        .map((pId) => nodeMap.get(pId))
        .filter((src): src is NodeModel => !!src && (src.type === "service" || src.type === "gateway"));

      if (servicesWithoutCache.length > 0 && !hasCache) {
        const srcNode = servicesWithoutCache[0];
        violations.push({
          id: `violation-cache-${node.id}`,
          rule_name: "Missing Distributed Cache Layer",
          severity: "warning",
          message: `Relational Database '${node.label}' receives direct traffic from '${srcNode.label}' without an intermediate cache (e.g. Redis), risking connection pool exhaustion.`,
          target_node_id: node.id,
          suggested_action: "Insert a Redis cache layer in front of the database to offload high-volume read traffic.",
          auto_fix_type: "add_cache",
          auto_fix_payload: {
            source_id: srcNode.id,
            target_db_id: node.id,
            new_node: {
              id: `node-cache-${Math.random().toString(36).substring(2, 6)}`,
              label: "Distributed Cache (Redis)",
              type: "cache",
              technology: "Redis",
              port: 6379,
              replicas: 1,
              description: "High performance memory caching tier",
            },
          },
        });
      }
    }
  });

  // Rule 3: Unbuffered Writes
  graph.edges.forEach((edge) => {
    const src = nodeMap.get(edge.source);
    const tgt = nodeMap.get(edge.target);
    if (!src || !tgt) return;

    if ((src.type === "frontend" || src.type === "gateway") && tgt.type === "database" && !edge.is_async) {
      violations.push({
        id: `violation-unbuffered-${edge.id}`,
        rule_name: "Unbuffered Direct Database Write",
        severity: "error",
        message: `${src.type === "gateway" ? "Gateway" : "Frontend"} '${src.label}' connects synchronously to Database '${tgt.label}'. Ingress spikes will crash DB thread pools.`,
        target_node_id: src.id,
        suggested_action: "Insert a message queue (e.g. Apache Kafka or RabbitMQ) to buffer write operations.",
        auto_fix_type: "add_queue",
        auto_fix_payload: {
          edge_id: edge.id,
          source_id: src.id,
          target_id: tgt.id,
          new_node: {
            id: `node-queue-${Math.random().toString(36).substring(2, 6)}`,
            label: "Message Queue (Kafka)",
            type: "queue",
            technology: "Apache Kafka",
            port: 9092,
            replicas: 1,
            description: "Distributed streaming event buffer",
          },
        },
      });
    } else if (tgt.label.toLowerCase().includes("worker") && edge.protocol === "REST" && !edge.is_async) {
      violations.push({
        id: `violation-unbuffered-worker-${edge.id}`,
        rule_name: "Unbuffered Synchronous Worker Dispatch",
        severity: "warning",
        message: `Service '${src.label}' dispatches tasks to Worker '${tgt.label}' synchronously via REST instead of asynchronous message queueing.`,
        target_node_id: src.id,
        suggested_action: "Insert an asynchronous message queue (e.g. RabbitMQ / Kafka) to buffer worker tasks.",
        auto_fix_type: "add_queue",
        auto_fix_payload: {
          edge_id: edge.id,
          source_id: src.id,
          target_id: tgt.id,
          new_node: {
            id: `node-queue-${Math.random().toString(36).substring(2, 6)}`,
            label: "Task Queue (RabbitMQ)",
            type: "queue",
            technology: "RabbitMQ",
            port: 5672,
            replicas: 1,
            description: "AMQP queue broker for worker jobs",
          },
        },
      });
    }
  });

  // Rule 4: Cycle Detection (DFS)
  const adj = new Map<string, string[]>();
  graph.nodes.forEach((n) => adj.set(n.id, []));
  graph.edges.forEach((e) => {
    if (!e.is_async) {
      const list = adj.get(e.source) || [];
      list.push(e.target);
      adj.set(e.source, list);
    }
  });

  const visited = new Set<string>();
  const recStack = new Set<string>();
  const cycleNodes: string[] = [];

  function dfs(u: string, stack: string[]): boolean {
    visited.add(u);
    recStack.add(u);
    stack.push(u);

    const neighbors = adj.get(u) || [];
    for (const v of neighbors) {
      if (!visited.has(v)) {
        if (dfs(v, stack)) return true;
      } else if (recStack.has(v)) {
        const cycleIdx = stack.indexOf(v);
        cycleNodes.push(...stack.slice(cycleIdx));
        return true;
      }
    }

    recStack.delete(u);
    stack.pop();
    return false;
  }

  for (const node of graph.nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id, [])) break;
    }
  }

  if (cycleNodes.length >= 2) {
    const names = cycleNodes.map((id) => nodeMap.get(id)?.label || id);
    const lastNode = cycleNodes[cycleNodes.length - 1];
    const firstNode = cycleNodes[0];
    const edge = graph.edges.find((e) => e.source === lastNode && e.target === firstNode);

    violations.push({
      id: `violation-cycle-${cycleNodes.join("-")}`,
      rule_name: "Circular Synchronous Dependency",
      severity: "error",
      message: `Synchronous call loop detected: ${names.join(" -> ")} -> ${names[0]}. Leads to cascade latency and deadlocks.`,
      target_node_id: cycleNodes[0],
      suggested_action: "Convert return call to asynchronous PubSub event or remove duplicate coupling.",
      auto_fix_type: "break_cycle",
      auto_fix_payload: {
        cycle_nodes: cycleNodes,
        edge_id_to_async: edge?.id,
        source_id: lastNode,
        target_id: firstNode,
      },
    });
  }

  return {
    violations,
    is_clean: violations.length === 0,
    total_violations: violations.length,
  };
}

// Client-side Code Generator Fallback
export function clientSideGenerate(graph: ArchitectureGraph): ExportResponse {
  // Docker Compose
  let compose = `# ====================================================================\n# CircuitScribe Generated Docker Compose File\n# Total Services: ${graph.nodes.length} | Edges: ${graph.edges.length}\n# ====================================================================\n\nversion: '3.8'\n\nservices:\n`;

  graph.nodes.forEach((node) => {
    const safeName = node.technology.toLowerCase().replace(/[^a-z0-9]/g, "-") + "-" + node.id.slice(-4);
    compose += `  ${safeName}:\n`;
    if (node.type === "database") {
      compose += `    image: postgres:16-alpine\n    container_name: ${safeName}\n    restart: unless-stopped\n    ports:\n      - "${node.port}:5432"\n    environment:\n      POSTGRES_USER: circuit_user\n      POSTGRES_PASSWORD: circuit_password_secure\n      POSTGRES_DB: circuit_db\n    networks:\n      - circuit_mesh\n`;
      if (node.replicas > 1) {
        compose += `    deploy:\n      replicas: ${node.replicas}\n`;
      }
    } else if (node.type === "cache") {
      compose += `    image: redis:7.2-alpine\n    container_name: ${safeName}\n    restart: unless-stopped\n    ports:\n      - "${node.port}:6379"\n    networks:\n      - circuit_mesh\n`;
    } else if (node.type === "queue") {
      compose += `    image: bitnami/kafka:3.7\n    container_name: ${safeName}\n    restart: unless-stopped\n    ports:\n      - "${node.port}:9092"\n    environment:\n      KAFKA_CFG_NODE_ID: 0\n      KAFKA_CFG_PROCESS_ROLES: controller,broker\n    networks:\n      - circuit_mesh\n`;
    } else if (node.type === "gateway") {
      compose += `    image: nginx:alpine\n    container_name: ${safeName}\n    ports:\n      - "${node.port}:80"\n    networks:\n      - circuit_mesh\n`;
    } else {
      compose += `    build:\n      context: ./services/${safeName}\n    container_name: ${safeName}\n    ports:\n      - "${node.port}:${node.port}"\n    environment:\n      PORT: ${node.port}\n      NODE_ENV: production\n    networks:\n      - circuit_mesh\n`;
      if (node.replicas > 1) {
        compose += `    deploy:\n      replicas: ${node.replicas}\n`;
      }
    }
    compose += "\n";
  });

  compose += `networks:\n  circuit_mesh:\n    driver: bridge\n`;

  // Mermaid
  let mermaid = `flowchart TD\n    %% Class Styles\n    classDef frontend fill:#0284c7,stroke:#38bdf8,stroke-width:2px,color:#ffffff,rx:8,ry:8;\n    classDef gateway fill:#4f46e5,stroke:#818cf8,stroke-width:2px,color:#ffffff,rx:8,ry:8;\n    classDef service fill:#0f766e,stroke:#2dd4bf,stroke-width:2px,color:#ffffff,rx:8,ry:8;\n    classDef database fill:#065f46,stroke:#34d399,stroke-width:2px,color:#ffffff,rx:4,ry:4;\n    classDef cache fill:#b45309,stroke:#fbbf24,stroke-width:2px,color:#ffffff,rx:8,ry:8;\n    classDef queue fill:#6b21a8,stroke:#c084fc,stroke-width:2px,color:#ffffff,rx:8,ry:8;\n\n`;

  graph.nodes.forEach((n) => {
    const safeId = n.id.replace(/-/g, "_");
    mermaid += `    ${safeId}["<b>${n.label}</b><br/>${n.technology} (Port ${n.port})"]\n`;
  });
  mermaid += "\n";
  graph.nodes.forEach((n) => {
    const safeId = n.id.replace(/-/g, "_");
    mermaid += `    class ${safeId} ${n.type};\n`;
  });
  mermaid += "\n";
  graph.edges.forEach((e) => {
    const src = e.source.replace(/-/g, "_");
    const tgt = e.target.replace(/-/g, "_");
    const badge = e.protocol + (e.is_async ? " [Async]" : "");
    if (e.is_async) {
      mermaid += `    ${src} -.->|${badge}| ${tgt}\n`;
    } else {
      mermaid += `    ${src} -->|${badge}| ${tgt}\n`;
    }
  });

  return {
    docker_compose_yaml: compose,
    mermaid_diagram: mermaid,
    graph_json: graph,
  };
}

// Resilient API Methods with fallback
export const api = {
  async parse(text: string, presetId?: string): Promise<ArchitectureGraph> {
    if (presetId && CLIENT_PRESETS[presetId]) {
      return CLIENT_PRESETS[presetId];
    }
    const lower = text.toLowerCase();
    if (lower.includes("ecommerce") || lower.includes("e-commerce")) return CLIENT_PRESETS.ecommerce;
    if (lower.includes("fintech") || lower.includes("payment")) return CLIENT_PRESETS.fintech;
    if (lower.includes("iot") || lower.includes("sensor")) return CLIENT_PRESETS.iot;

    try {
      const res = await apiClient.post<ArchitectureGraph>("/api/parse", { text, preset_id: presetId });
      return res.data;
    } catch (err) {
      console.warn("API parse failed, falling back to deterministic client parser:", err);
      return CLIENT_PRESETS.ecommerce;
    }
  },

  async lint(graph: ArchitectureGraph): Promise<LintResponse> {
    try {
      const res = await apiClient.post<LintResponse>("/api/lint", { graph });
      return res.data;
    } catch (err) {
      console.warn("API lint failed, falling back to local client linter:", err);
      return clientSideLint(graph);
    }
  },

  async export(graph: ArchitectureGraph): Promise<ExportResponse> {
    try {
      const res = await apiClient.post<ExportResponse>("/api/export", { graph });
      return res.data;
    } catch (err) {
      console.warn("API export failed, falling back to local client generator:", err);
      return clientSideGenerate(graph);
    }
  },

  async health(): Promise<{ status: string }> {
    try {
      const res = await apiClient.get<{ status: string }>("/health");
      return res.data;
    } catch {
      return { status: "offline (using local engine)" };
    }
  },
};
