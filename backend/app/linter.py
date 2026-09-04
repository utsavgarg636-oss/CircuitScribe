import uuid
from typing import List, Dict, Set, Any, Tuple, Optional
from app.schemas import ArchitectureGraph, LinterViolation, NodeModel, EdgeModel, LintResponse

try:
    import networkx as nx
    HAS_NETWORKX = True
except ImportError:
    HAS_NETWORKX = False

    # Pure Python Lightweight DiGraph implementation for 100% zero-dependency execution
    class PurePythonDiGraph:
        def __init__(self):
            self._nodes: Dict[str, Dict[str, Any]] = {}
            self._succ: Dict[str, Dict[str, Dict[str, Any]]] = {}
            self._pred: Dict[str, Dict[str, Dict[str, Any]]] = {}

        def add_node(self, node_for_adding: str, **attr):
            if node_for_adding not in self._nodes:
                self._nodes[node_for_adding] = attr
                self._succ[node_for_adding] = {}
                self._pred[node_for_adding] = {}
            else:
                self._nodes[node_for_adding].update(attr)

        def add_edge(self, u: str, v: str, **attr):
            self.add_node(u)
            self.add_node(v)
            self._succ[u][v] = attr
            self._pred[v][u] = attr

        def nodes(self, data: bool = False):
            if data:
                return list(self._nodes.items())
            return list(self._nodes.keys())

        def in_degree(self, n: str) -> int:
            return len(self._pred.get(n, {}))

        def predecessors(self, n: str):
            return list(self._pred.get(n, {}).keys())

        def has_edge(self, u: str, v: str) -> bool:
            return u in self._succ and v in self._succ[u]

        def get_edge_data(self, u: str, v: str) -> Dict[str, Any]:
            return self._succ.get(u, {}).get(v, {})

    def pure_simple_cycles(G) -> List[List[str]]:
        """Tarjan / DFS based simple cycle finder."""
        cycles = []
        visited = set()
        stack = []
        stack_set = set()

        def dfs(node):
            visited.add(node)
            stack.append(node)
            stack_set.add(node)

            for neighbor in G._succ.get(node, {}):
                if neighbor in stack_set:
                    # Found cycle
                    idx = stack.index(neighbor)
                    cycles.append(list(stack[idx:]))
                elif neighbor not in visited:
                    dfs(neighbor)

            stack_set.remove(node)
            stack.pop()

        for n in G.nodes():
            if n not in visited:
                dfs(n)
        return cycles



class ArchitectureLinter:
    """NetworkX-based architectural graph auditor enforcing 4 core distributed systems rules."""

    def lint(self, graph: ArchitectureGraph) -> LintResponse:
        """Execute all architectural audits on the graph."""
        violations: List[LinterViolation] = []
        if not graph.nodes:
            return LintResponse(violations=[], is_clean=True, total_violations=0)

        # Build DiGraph (NetworkX or Zero-Dependency Fallback)
        G = nx.DiGraph() if HAS_NETWORKX else PurePythonDiGraph()
        nodes_by_id: Dict[str, NodeModel] = {n.id: n for n in graph.nodes}
        edges_by_pair: Dict[tuple, EdgeModel] = {}

        for node in graph.nodes:
            G.add_node(
                node.id,
                label=node.label,
                type=node.type,
                technology=node.technology,
                port=node.port,
                replicas=node.replicas
            )

        for edge in graph.edges:
            # Only add edges where source and target exist
            if edge.source in nodes_by_id and edge.target in nodes_by_id:
                G.add_edge(
                    edge.source,
                    edge.target,
                    id=edge.id,
                    protocol=edge.protocol,
                    is_async=edge.is_async,
                    label=edge.label
                )
                edges_by_pair[(edge.source, edge.target)] = edge

        # Execute 4 Audits
        violations.extend(self._check_spof(G, nodes_by_id))
        violations.extend(self._check_missing_cache(G, nodes_by_id, graph.edges))
        violations.extend(self._check_unbuffered_writes(G, nodes_by_id, graph.edges))
        violations.extend(self._check_cycles(G, nodes_by_id))

        return LintResponse(
            violations=violations,
            is_clean=len(violations) == 0,
            total_violations=len(violations)
        )

    def _check_spof(self, G: Any, nodes_by_id: Dict[str, NodeModel]) -> List[LinterViolation]:
        """Rule 1: Single Point of Failure (SPOF)
        Flags Database or Cache nodes with in-degree > 1 and replicas == 1.
        """
        violations: List[LinterViolation] = []
        for node_id, data in G.nodes(data=True):
            node_type = data.get("type")
            replicas = data.get("replicas", 1)
            in_deg = G.in_degree(node_id)

            if node_type in ["database", "cache"] and in_deg > 1 and replicas <= 1:
                node = nodes_by_id[node_id]
                severity = "error" if in_deg >= 3 else "warning"
                violations.append(
                    LinterViolation(
                        id=f"violation-spof-{node_id}",
                        rule_name="Single Point of Failure (SPOF)",
                        severity=severity,
                        message=f"{node.type.title()} '{node.label}' is receiving traffic from {in_deg} components with only {replicas} replica. A single outage will cause total system failure.",
                        target_node_id=node_id,
                        suggested_action="Scale replicas to at least 2 with an active-replica cluster or read-replica pool.",
                        auto_fix_type="scale_replicas",
                        auto_fix_payload={
                            "node_id": node_id,
                            "target_replicas": 2
                        }
                    )
                )
        return violations

    def _check_missing_cache(
        self, G: Any, nodes_by_id: Dict[str, NodeModel], edges: List[EdgeModel]
    ) -> List[LinterViolation]:
        """Rule 2: Missing Cache Layer
        Flags Relational Databases receiving direct synchronous traffic from services without an intermediate Redis/Memcached cache.
        """
        violations: List[LinterViolation] = []
        # Check existing caches in graph
        cache_nodes = [n for n in nodes_by_id.values() if n.type == "cache"]
        cache_ids = {n.id for n in cache_nodes}

        for node_id, data in G.nodes(data=True):
            if data.get("type") == "database":
                tech_lower = data.get("technology", "").lower()
                is_relational = any(k in tech_lower for k in ["postgres", "mysql", "mariadb", "sql", "timescale"])
                
                if is_relational:
                    # Check incoming predecessors
                    predecessors = list(G.predecessors(node_id))
                    services_without_cache = []

                    for pred_id in predecessors:
                        pred_node = nodes_by_id.get(pred_id)
                        if pred_node and pred_node.type in ["service", "gateway"]:
                            # Check if pred_id is already connected to a cache
                            pred_connected_to_cache = any(
                                G.has_edge(pred_id, c_id) or G.has_edge(c_id, pred_id) for c_id in cache_ids
                            )
                            if not pred_connected_to_cache:
                                services_without_cache.append(pred_node)

                    if services_without_cache:
                        target_node = nodes_by_id[node_id]
                        source_node = services_without_cache[0]
                        violations.append(
                            LinterViolation(
                                id=f"violation-cache-{node_id}",
                                rule_name="Missing Distributed Cache Layer",
                                severity="warning",
                                message=f"Relational Database '{target_node.label}' receives direct traffic from '{source_node.label}' without an intermediate cache (e.g. Redis), causing DB connection pool exhaustion under load.",
                                target_node_id=node_id,
                                suggested_action="Insert a Redis distributed cache between the service and database for sub-millisecond read offloading.",
                                auto_fix_type="add_cache",
                                auto_fix_payload={
                                    "source_id": source_node.id,
                                    "target_db_id": node_id,
                                    "new_node": {
                                        "id": f"node-cache-{str(uuid.uuid4())[:4]}",
                                        "label": "Distributed Cache (Redis)",
                                        "type": "cache",
                                        "technology": "Redis",
                                        "port": 6379,
                                        "replicas": 1,
                                        "description": "In-memory caching layer for read offloading"
                                    }
                                }
                            )
                        )
        return violations

    def _check_unbuffered_writes(
        self, G: Any, nodes_by_id: Dict[str, NodeModel], edges: List[EdgeModel]
    ) -> List[LinterViolation]:
        """Rule 3: Unbuffered Direct Write / Traffic Surge Bottleneck
        Flags synchronous REST edges connecting Gateway/Client directly to Database or Worker without a Queue.
        """
        violations: List[LinterViolation] = []
        for edge in edges:
            src = nodes_by_id.get(edge.source)
            tgt = nodes_by_id.get(edge.target)
            if not src or not tgt:
                continue

            # Case A: Gateway or Client directly writes to a Database
            if src.type in ["frontend", "gateway"] and tgt.type == "database" and not edge.is_async:
                violations.append(
                    LinterViolation(
                        id=f"violation-unbuffered-{edge.id}",
                        rule_name="Unbuffered Direct Database Write",
                        severity="error",
                        message=f"{src.type.title()} '{src.label}' has a direct synchronous {edge.protocol} connection to Database '{tgt.label}'. Surges in ingress traffic will directly overwhelm database connections.",
                        target_node_id=src.id,
                        suggested_action="Decouple direct ingress writes using a message broker (e.g. Apache Kafka or RabbitMQ).",
                        auto_fix_type="add_queue",
                        auto_fix_payload={
                            "edge_id": edge.id,
                            "source_id": src.id,
                            "target_id": tgt.id,
                            "new_node": {
                                "id": f"node-queue-{str(uuid.uuid4())[:4]}",
                                "label": "Message Queue (Kafka)",
                                "type": "queue",
                                "technology": "Apache Kafka",
                                "port": 9092,
                                "replicas": 1,
                                "description": "High-throughput asynchronous event buffer"
                            }
                        }
                    )
                )

            # Case B: Synchronous REST dispatch between heavy worker / order service without buffer
            elif "worker" in tgt.label.lower() and edge.protocol == "REST" and not edge.is_async:
                violations.append(
                    LinterViolation(
                        id=f"violation-unbuffered-worker-{edge.id}",
                        rule_name="Unbuffered Synchronous Worker Dispatch",
                        severity="warning",
                        message=f"Service '{src.label}' dispatches tasks to '{tgt.label}' synchronously via REST instead of asynchronous message queuing.",
                        target_node_id=src.id,
                        suggested_action="Insert an asynchronous message queue (e.g. Kafka / RabbitMQ) between the publisher and worker.",
                        auto_fix_type="add_queue",
                        auto_fix_payload={
                            "edge_id": edge.id,
                            "source_id": src.id,
                            "target_id": tgt.id,
                            "new_node": {
                                "id": f"node-queue-{str(uuid.uuid4())[:4]}",
                                "label": "Task Queue (RabbitMQ)",
                                "type": "queue",
                                "technology": "RabbitMQ",
                                "port": 5672,
                                "replicas": 1,
                                "description": "AMQP message broker for background jobs"
                            }
                        }
                    )
                )

        return violations

    def _check_cycles(self, G: Any, nodes_by_id: Dict[str, NodeModel]) -> List[LinterViolation]:
        """Rule 4: Circular Synchronous Dependency (Cycle Detection)
        Flags loops in synchronous communications (REST/gRPC) causing deadlocks and tight coupling.
        """
        violations: List[LinterViolation] = []
        try:
            cycles = list(nx.simple_cycles(G)) if HAS_NETWORKX else pure_simple_cycles(G)
            for cycle in cycles:
                # Only flag cycles with length >= 2
                if len(cycle) >= 2:
                    cycle_nodes = [nodes_by_id[nid] for nid in cycle if nid in nodes_by_id]
                    cycle_labels = [n.label for n in cycle_nodes]
                    
                    # Find the closing edge in the cycle
                    last_node_id = cycle[-1]
                    first_node_id = cycle[0]
                    edge_id = None
                    if G.has_edge(last_node_id, first_node_id):
                        edge_data = G.get_edge_data(last_node_id, first_node_id)
                        edge_id = edge_data.get("id")

                    violations.append(
                        LinterViolation(
                            id=f"violation-cycle-{'-'.join(cycle[:2])}",
                            rule_name="Circular Synchronous Dependency",
                            severity="error",
                            message=f"Synchronous communication loop detected: {' -> '.join(cycle_labels)} -> {cycle_labels[0]}. Circular dependencies create distributed deadlocks and prevent independent deployments.",
                            target_node_id=cycle[0],
                            suggested_action="Break the synchronous dependency cycle by converting the return call to an asynchronous PubSub event or removing the redundant link.",
                            auto_fix_type="break_cycle",
                            auto_fix_payload={
                                "cycle_nodes": cycle,
                                "edge_id_to_async": edge_id,
                                "source_id": last_node_id,
                                "target_id": first_node_id
                            }
                        )
                    )
        except Exception:
            pass

        return violations


linter = ArchitectureLinter()
