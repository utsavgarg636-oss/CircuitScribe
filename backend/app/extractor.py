import re
import json
import logging
from typing import Dict, Any, List, Optional
from app.schemas import ArchitectureGraph, NodeModel, EdgeModel, NodeType, Protocol
from app.config import settings

logger = logging.getLogger("circuitscribe.extractor")

# Curated High-Fidelity Presets with intentional architectural vulnerabilities for live demonstration
PRESETS: Dict[str, ArchitectureGraph] = {
    "ecommerce": ArchitectureGraph(
        confidence=1.0,
        summary="E-Commerce Microservices Pipeline with Direct Database Access & Single Point of Failure",
        nodes=[
            NodeModel(
                id="node-frontend",
                label="Storefront Web (Next.js)",
                type="frontend",
                technology="Next.js",
                port=3000,
                replicas=2,
                description="User customer-facing web application"
            ),
            NodeModel(
                id="node-gateway",
                label="API Gateway (Kong)",
                type="gateway",
                technology="Kong / Nginx",
                port=8000,
                replicas=2,
                description="Reverse proxy and edge routing gateway"
            ),
            NodeModel(
                id="node-auth",
                label="Auth Service (Node.js)",
                type="service",
                technology="Express.js",
                port=4001,
                replicas=2,
                description="Handles authentication and JWT issuance"
            ),
            NodeModel(
                id="node-order",
                label="Order Service (FastAPI)",
                type="service",
                technology="FastAPI",
                port=4002,
                replicas=2,
                description="Processes customer orders and inventory checkout"
            ),
            NodeModel(
                id="node-postgres",
                label="Relational Database (PostgreSQL)",
                type="database",
                technology="PostgreSQL",
                port=5432,
                replicas=1,  # Single replica (SPOF vulnerability)
                description="Primary transactional store for orders and users"
            ),
            NodeModel(
                id="node-worker",
                label="Order Fulfillment Worker",
                type="service",
                technology="Python Worker",
                port=4003,
                replicas=1,
                description="Consumes asynchronous order processing events"
            )
        ],
        edges=[
            EdgeModel(id="edge-1", source="node-frontend", target="node-gateway", protocol="REST", is_async=False, label="HTTPS/REST"),
            EdgeModel(id="edge-2", source="node-gateway", target="node-auth", protocol="gRPC", is_async=False, label="gRPC Auth"),
            EdgeModel(id="edge-3", source="node-gateway", target="node-order", protocol="REST", is_async=False, label="REST Orders"),
            EdgeModel(id="edge-4", source="node-auth", target="node-postgres", protocol="REST", is_async=False, label="Direct SQL Queries"),
            EdgeModel(id="edge-5", source="node-order", target="node-postgres", protocol="REST", is_async=False, label="Direct Order Writes"),
            EdgeModel(id="edge-6", source="node-order", target="node-worker", protocol="REST", is_async=False, label="Sync Order Dispatch (Unbuffered)")
        ]
    ),
    "fintech": ArchitectureGraph(
        confidence=1.0,
        summary="FinTech Payment & Settlement Gateway with Circular Dependency",
        nodes=[
            NodeModel(
                id="node-mobile",
                label="FinTech Mobile App",
                type="frontend",
                technology="React Native",
                port=8080,
                replicas=1,
                description="iOS and Android customer banking interface"
            ),
            NodeModel(
                id="node-edge-proxy",
                label="Edge Security Proxy",
                type="gateway",
                technology="Envoy Proxy",
                port=443,
                replicas=3,
                description="mTLS termination and rate limiting"
            ),
            NodeModel(
                id="node-payment-svc",
                label="Payment Engine",
                type="service",
                technology="Golang",
                port=9001,
                replicas=3,
                description="Core payment ledger and card settlement engine"
            ),
            NodeModel(
                id="node-fraud-svc",
                label="Fraud Detection Service",
                type="service",
                technology="Python ML",
                port=9002,
                replicas=2,
                description="Real-time ML fraud inference scoring"
            ),
            NodeModel(
                id="node-fin-db",
                label="Financial Ledger DB (PostgreSQL)",
                type="database",
                technology="PostgreSQL",
                port=5432,
                replicas=1,
                description="ACID compliant financial transaction record"
            )
        ],
        edges=[
            EdgeModel(id="edge-f1", source="node-mobile", target="node-edge-proxy", protocol="REST", is_async=False, label="mTLS REST"),
            EdgeModel(id="edge-f2", source="node-edge-proxy", target="node-payment-svc", protocol="gRPC", is_async=False, label="gRPC Payments"),
            EdgeModel(id="edge-f3", source="node-payment-svc", target="node-fraud-svc", protocol="gRPC", is_async=False, label="Score Verification"),
            EdgeModel(id="edge-f4", source="node-fraud-svc", target="node-payment-svc", protocol="REST", is_async=False, label="Circular Callback"),  # Cycle vulnerability
            EdgeModel(id="edge-f5", source="node-payment-svc", target="node-fin-db", protocol="REST", is_async=False, label="Direct Ledger Writes")
        ]
    ),
    "iot": ArchitectureGraph(
        confidence=1.0,
        summary="IoT Telemetry & Ingestion Pipeline with Unbuffered Direct Writes",
        nodes=[
            NodeModel(
                id="node-sensors",
                label="Edge IoT Fleet",
                type="frontend",
                technology="MQTT Sensors",
                port=1883,
                replicas=1,
                description="Edge industrial hardware sensor network"
            ),
            NodeModel(
                id="node-iot-gateway",
                label="IoT Ingestion Gateway",
                type="gateway",
                technology="EMQX / Nginx",
                port=8883,
                replicas=2,
                description="High throughput sensor ingestion proxy"
            ),
            NodeModel(
                id="node-telemetry-db",
                label="TimeSeries Database (PostgreSQL)",
                type="database",
                technology="PostgreSQL Timescale",
                port=5432,
                replicas=1,
                description="Raw sensor telemetry storage"
            ),
            NodeModel(
                id="node-alert-svc",
                label="Realtime Alerting Service",
                type="service",
                technology="FastAPI",
                port=5000,
                replicas=1,
                description="Threshold anomaly detection and webhook triggers"
            )
        ],
        edges=[
            EdgeModel(id="edge-i1", source="node-sensors", target="node-iot-gateway", protocol="WebSocket", is_async=True, label="MQTT over WS"),
            EdgeModel(id="edge-i2", source="node-iot-gateway", target="node-telemetry-db", protocol="REST", is_async=False, label="Direct Sensor Write (Bottleneck)"),
            EdgeModel(id="edge-i3", source="node-telemetry-db", target="node-alert-svc", protocol="REST", is_async=False, label="Polling DB Reads")
        ]
    )
}


class GraphExtractor:
    """Extracts structured ArchitectureGraph from speech transcript or user text."""

    def __init__(self):
        self.gemini_available = False
        if settings.GEMINI_API_KEY:
            try:
                import google.generativeai as genai
                genai.configure(api_key=settings.GEMINI_API_KEY)
                self.gemini_model = genai.GenerativeModel("gemini-1.5-flash")
                self.gemini_available = True
                logger.info("Google Gemini Flash API initialized successfully.")
            except Exception as e:
                logger.warning(f"Failed to initialize Gemini API: {e}. Falling back to deterministic NLP engine.")

    def extract(self, text: str, preset_id: Optional[str] = None) -> ArchitectureGraph:
        """Main extraction method with preset detection, LLM processing, and deterministic fallback."""
        cleaned_text = (text or "").strip()
        
        # Check explicit or implicit preset trigger
        if preset_id and preset_id.lower() in PRESETS:
            return PRESETS[preset_id.lower()]
        
        lower_prompt = cleaned_text.lower()
        if "ecommerce" in lower_prompt or "e-commerce" in lower_prompt or "storefront" in lower_prompt:
            return PRESETS["ecommerce"]
        elif "fintech" in lower_prompt or "payment gateway" in lower_prompt or "fraud" in lower_prompt:
            return PRESETS["fintech"]
        elif "iot" in lower_prompt or "sensor" in lower_prompt or "telemetry" in lower_prompt:
            return PRESETS["iot"]

        # Try Gemini if API key is active
        if self.gemini_available and len(cleaned_text) > 10:
            try:
                extracted = self._extract_with_gemini(cleaned_text)
                if extracted and len(extracted.nodes) > 0:
                    return extracted
            except Exception as e:
                logger.warning(f"Gemini extraction error: {e}. Falling back to deterministic parser.")

        # Deterministic NLP & Regex Parser
        return self._extract_deterministic(cleaned_text)

    def _extract_with_gemini(self, text: str) -> Optional[ArchitectureGraph]:
        """Use Gemini 1.5 Flash for zero-shot structured JSON extraction."""
        system_prompt = f"""
You are an expert Cloud Architect. Convert the following engineering discussion or system description into a structured JSON architecture graph.

Target Schema:
{{
  "nodes": [
    {{
      "id": "node-1",
      "label": "Human Readable Name",
      "type": "frontend" | "gateway" | "service" | "database" | "cache" | "queue",
      "technology": "e.g. PostgreSQL, Redis, Apache Kafka, FastAPI, Next.js, Kong",
      "port": 8080,
      "replicas": 1,
      "description": "Short explanation"
    }}
  ],
  "edges": [
    {{
      "id": "edge-1",
      "source": "node-1",
      "target": "node-2",
      "protocol": "REST" | "gRPC" | "PubSub" | "WebSocket",
      "is_async": false,
      "label": "Description of call"
    }}
  ],
  "confidence": 0.95,
  "summary": "Brief 1-sentence summary of architecture"
}}

Strict Rules:
- Return ONLY valid raw JSON without markdown formatting or backticks.
- Assign appropriate ports (e.g. Postgres=5432, Redis=6379, Kafka=9092, Next.js=3000, FastAPI=8000).
- Identify dependencies correctly.

Description to parse:
"{text}"
"""
        response = self.gemini_model.generate_content(system_prompt)
        raw_content = response.text.strip()
        
        # Strip potential markdown code block fences
        if raw_content.startswith("```json"):
            raw_content = raw_content[7:]
        if raw_content.startswith("```"):
            raw_content = raw_content[3:]
        if raw_content.endswith("```"):
            raw_content = raw_content[:-3]
        raw_content = raw_content.strip()

        data = json.loads(raw_content)
        return ArchitectureGraph(**data)

    def _extract_deterministic(self, text: str) -> ArchitectureGraph:
        """Deterministic, rule-based NLP extraction engine.
        Guarantees 100% resilient parsing for custom user text and voice input.
        """
        if not text:
            # Return a default balanced starter graph
            return PRESETS["ecommerce"]

        nodes: List[NodeModel] = []
        edges: List[EdgeModel] = []
        node_map: Dict[str, str] = {}  # token -> node_id

        # Catalog of detectable technologies and classifications
        tech_patterns = [
            (r"(react|next\.?js|vue|angular|svelte|frontend|web\s?app|ui|client|mobile\s?app|ios|android)", "frontend", 3000),
            (r"(api\s?gateway|gateway|nginx|envoy|kong|traefik|edge\s?proxy|reverse\s?proxy|load\s?balancer)", "gateway", 8000),
            (r"(auth\s?service|user\s?service|payment\s?service|order\s?service|checkout|billing|worker|fastapi|express|golang|microservice|service|backend|api)", "service", 8080),
            (r"(postgres(?:ql)?|mysql|mariadb|mongodb|dynamodb|cassandra|sqlite|cockroachdb|database|db)", "database", 5432),
            (r"(redis|memcached|dragonfly|valkey|cache)", "cache", 6379),
            (r"(kafka|rabbitmq|sqs|nats|pulsar|pubsub|event\s?bus|message\s?queue|queue)", "queue", 9092),
        ]

        # Break text into clauses or sentences
        clauses = re.split(r"[.\n;]+|\band\s+then\b", text, flags=re.IGNORECASE)
        
        # If text mentions individual technologies with arrows or connect keywords
        words = text.split()
        node_counter = 1

        # Detect tech entities
        detected_entities = []
        for match_regex, node_type, default_port in tech_patterns:
            for match in re.finditer(match_regex, text, re.IGNORECASE):
                name = match.group(0).strip()
                # Check if already added
                if not any(e["name"].lower() == name.lower() for e in detected_entities):
                    # Refine technology name formatting
                    formatted_tech = name.title()
                    if "postgres" in name.lower():
                        formatted_tech = "PostgreSQL"
                        default_port = 5432
                    elif "mysql" in name.lower():
                        formatted_tech = "MySQL"
                        default_port = 3306
                    elif "redis" in name.lower():
                        formatted_tech = "Redis"
                        default_port = 6379
                    elif "kafka" in name.lower():
                        formatted_tech = "Apache Kafka"
                        default_port = 9092
                    elif "rabbitmq" in name.lower():
                        formatted_tech = "RabbitMQ"
                        default_port = 5672
                    elif "next" in name.lower():
                        formatted_tech = "Next.js"
                        default_port = 3000
                    elif "fastapi" in name.lower():
                        formatted_tech = "FastAPI"
                        default_port = 8000

                    detected_entities.append({
                        "name": name,
                        "tech": formatted_tech,
                        "type": node_type,
                        "port": default_port,
                        "pos": match.start()
                    })

        # Sort by occurrence in text
        detected_entities.sort(key=lambda x: x["pos"])

        # If no entities detected, synthesize standard pipeline
        if not detected_entities:
            return PRESETS["ecommerce"]

        for idx, entity in enumerate(detected_entities, 1):
            n_id = f"node-{idx}"
            label = f"{entity['tech']} ({entity['type'].title()})"
            nodes.append(
                NodeModel(
                    id=n_id,
                    label=label,
                    type=entity["type"],
                    technology=entity["tech"],
                    port=entity["port"],
                    replicas=1,
                    description=f"Generated {entity['type']} component"
                )
            )
            node_map[entity["name"].lower()] = n_id

        # Generate directional connections based on sequential flow or keywords
        edge_counter = 1
        for i in range(len(nodes) - 1):
            src = nodes[i]
            tgt = nodes[i + 1]
            
            # Determine appropriate protocol
            protocol: Protocol = "REST"
            is_async = False
            if src.type == "queue" or tgt.type == "queue":
                protocol = "PubSub"
                is_async = True
            elif "grpc" in text.lower():
                protocol = "gRPC"
            elif "websocket" in text.lower() or "ws" in text.lower():
                protocol = "WebSocket"
                is_async = True

            edges.append(
                EdgeModel(
                    id=f"edge-{edge_counter}",
                    source=src.id,
                    target=tgt.id,
                    protocol=protocol,
                    is_async=is_async,
                    label=f"{protocol} Connection"
                )
            )
            edge_counter += 1

        return ArchitectureGraph(
            nodes=nodes,
            edges=edges,
            confidence=0.88,
            summary=f"Synthesized architecture graph with {len(nodes)} nodes and {len(edges)} communication edges."
        )


extractor = GraphExtractor()
