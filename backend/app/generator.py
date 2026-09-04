import re
from typing import Dict, Any, List
from app.schemas import ArchitectureGraph, NodeModel, EdgeModel, ExportResponse

try:
    import yaml
    def dump_yaml(data: Dict[str, Any]) -> str:
        return yaml.dump(data, sort_keys=False, default_flow_style=False)
except ImportError:
    def dump_yaml(data: Any, indent: int = 0) -> str:
        """Pure-Python YAML dumper fallback."""
        lines = []
        spaces = "  " * indent
        if isinstance(data, dict):
            for k, v in data.items():
                if isinstance(v, (dict, list)):
                    lines.append(f"{spaces}{k}:")
                    lines.append(dump_yaml(v, indent + 1))
                else:
                    val_str = f'"{v}"' if isinstance(v, str) and (":" in v or " " in v or not v) else str(v)
                    lines.append(f"{spaces}{k}: {val_str}")
        elif isinstance(data, list):
            for item in data:
                if isinstance(item, (dict, list)):
                    lines.append(f"{spaces}-")
                    lines.append(dump_yaml(item, indent + 1))
                else:
                    val_str = f'"{item}"' if isinstance(item, str) and (":" in item or " " in item or not item) else str(item)
                    lines.append(f"{spaces}- {val_str}")
        return "\n".join(lines)



class CodeGenerator:
    """Compiles ArchitectureGraph models into docker-compose.yml and Mermaid.js diagrams."""

    def generate_all(self, graph: ArchitectureGraph) -> ExportResponse:
        """Generate both docker-compose.yml and Mermaid flowchart."""
        docker_compose = self.generate_docker_compose(graph)
        mermaid = self.generate_mermaid(graph)
        graph_json = graph.model_dump()

        return ExportResponse(
            docker_compose_yaml=docker_compose,
            mermaid_diagram=mermaid,
            graph_json=graph_json
        )

    def _sanitize_name(self, text: str) -> str:
        """Generate valid docker service name."""
        s = re.sub(r"[^a-zA-Z0-9_-]", "-", text.lower())
        s = re.sub(r"-+", "-", s).strip("-")
        return s or "service"

    def generate_docker_compose(self, graph: ArchitectureGraph) -> str:
        """Translate graph nodes and edges into a production-grade docker-compose.yml file."""
        services: Dict[str, Any] = {}
        volumes: Dict[str, Any] = {}
        
        # Build dependency lookup
        downstream_map: Dict[str, List[str]] = {}
        for edge in graph.edges:
            downstream_map.setdefault(edge.source, []).append(edge.target)

        node_name_map: Dict[str, str] = {}
        for node in graph.nodes:
            svc_name = self._sanitize_name(f"{node.technology}-{node.id[-4:]}" if len(node.id) > 4 else f"{node.technology}-{node.id}")
            node_name_map[node.id] = svc_name

        for node in graph.nodes:
            svc_name = node_name_map[node.id]
            tech_lower = node.technology.lower()
            node_type = node.type
            
            # Find dependencies
            depends_on = [node_name_map[t_id] for t_id in downstream_map.get(node.id, []) if t_id in node_name_map and node_name_map[t_id] != svc_name]

            # 1. Database Nodes
            if node_type == "database":
                if "postgres" in tech_lower or "timescale" in tech_lower:
                    vol_name = f"{svc_name}_data"
                    volumes[vol_name] = {"driver": "local"}
                    services[svc_name] = {
                        "image": "postgres:16-alpine",
                        "container_name": svc_name,
                        "restart": "unless-stopped",
                        "environment": {
                            "POSTGRES_USER": "circuit_user",
                            "POSTGRES_PASSWORD": "circuit_password_secure",
                            "POSTGRES_DB": "circuit_db"
                        },
                        "ports": [f"{node.port}:5432"],
                        "volumes": [f"{vol_name}:/var/lib/postgresql/data"],
                        "healthcheck": {
                            "test": ["CMD-SHELL", "pg_isready -U circuit_user -d circuit_db"],
                            "interval": "10s",
                            "timeout": "5s",
                            "retries": 5
                        },
                        "networks": ["circuit_mesh"]
                    }
                    if node.replicas > 1:
                        services[svc_name]["deploy"] = {
                            "replicas": node.replicas,
                            "resources": {"limits": {"cpus": "1.0", "memory": "1G"}}
                        }

                elif "mysql" in tech_lower or "mariadb" in tech_lower:
                    vol_name = f"{svc_name}_data"
                    volumes[vol_name] = {"driver": "local"}
                    services[svc_name] = {
                        "image": "mysql:8.0",
                        "container_name": svc_name,
                        "restart": "unless-stopped",
                        "environment": {
                            "MYSQL_ROOT_PASSWORD": "root_password_secure",
                            "MYSQL_DATABASE": "circuit_db",
                            "MYSQL_USER": "circuit_user",
                            "MYSQL_PASSWORD": "circuit_password_secure"
                        },
                        "ports": [f"{node.port}:3306"],
                        "volumes": [f"{vol_name}:/var/lib/mysql"],
                        "networks": ["circuit_mesh"]
                    }
                elif "mongo" in tech_lower:
                    vol_name = f"{svc_name}_data"
                    volumes[vol_name] = {"driver": "local"}
                    services[svc_name] = {
                        "image": "mongo:7.0",
                        "container_name": svc_name,
                        "restart": "unless-stopped",
                        "ports": [f"{node.port}:27017"],
                        "volumes": [f"{vol_name}:/data/db"],
                        "networks": ["circuit_mesh"]
                    }
                else:
                    services[svc_name] = {
                        "image": "postgres:16-alpine",
                        "container_name": svc_name,
                        "ports": [f"{node.port}:5432"],
                        "networks": ["circuit_mesh"]
                    }

            # 2. Cache Nodes
            elif node_type == "cache":
                if "redis" in tech_lower:
                    vol_name = f"{svc_name}_data"
                    volumes[vol_name] = {"driver": "local"}
                    services[svc_name] = {
                        "image": "redis:7.2-alpine",
                        "container_name": svc_name,
                        "restart": "unless-stopped",
                        "command": "redis-server --appendonly yes --requirepass redis_password_secure",
                        "ports": [f"{node.port}:6379"],
                        "volumes": [f"{vol_name}:/data"],
                        "healthcheck": {
                            "test": ["CMD", "redis-cli", "ping"],
                            "interval": "5s",
                            "timeout": "3s",
                            "retries": 3
                        },
                        "networks": ["circuit_mesh"]
                    }
                elif "memcached" in tech_lower:
                    services[svc_name] = {
                        "image": "memcached:alpine",
                        "container_name": svc_name,
                        "ports": [f"{node.port}:11211"],
                        "networks": ["circuit_mesh"]
                    }

            # 3. Queue Nodes
            elif node_type == "queue":
                if "kafka" in tech_lower:
                    services[svc_name] = {
                        "image": "bitnami/kafka:3.7",
                        "container_name": svc_name,
                        "restart": "unless-stopped",
                        "environment": {
                            "KAFKA_CFG_NODE_ID": "0",
                            "KAFKA_CFG_PROCESS_ROLES": "controller,broker",
                            "KAFKA_CFG_LISTENERS": "PLAINTEXT://:9092,CONTROLLER://:9093",
                            "KAFKA_CFG_LISTENER_SECURITY_PROTOCOL_MAP": "CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT",
                            "KAFKA_CFG_CONTROLLER_QUORUM_VOTERS": "0@localhost:9093",
                            "KAFKA_CFG_CONTROLLER_LISTENER_NAMES": "CONTROLLER",
                            "KAFKA_CFG_AUTO_CREATE_TOPICS_ENABLE": "true"
                        },
                        "ports": [f"{node.port}:9092"],
                        "networks": ["circuit_mesh"]
                    }
                elif "rabbitmq" in tech_lower:
                    services[svc_name] = {
                        "image": "rabbitmq:3.12-management-alpine",
                        "container_name": svc_name,
                        "ports": [f"{node.port}:5672", "15672:15672"],
                        "networks": ["circuit_mesh"]
                    }

            # 4. Gateway Nodes
            elif node_type == "gateway":
                services[svc_name] = {
                    "image": "nginx:alpine",
                    "container_name": svc_name,
                    "restart": "unless-stopped",
                    "ports": [f"{node.port}:80"],
                    "depends_on": depends_on,
                    "networks": ["circuit_mesh"]
                }

            # 5. Frontend Nodes
            elif node_type == "frontend":
                services[svc_name] = {
                    "image": "node:20-alpine",
                    "container_name": svc_name,
                    "working_dir": "/app",
                    "command": "npm start",
                    "environment": {
                        "NODE_ENV": "production",
                        "PORT": str(node.port)
                    },
                    "ports": [f"{node.port}:{node.port}"],
                    "depends_on": depends_on,
                    "networks": ["circuit_mesh"]
                }

            # 6. Service / Worker Nodes
            else:
                env_vars = {
                    "PORT": str(node.port),
                    "NODE_ENV": "production",
                    "SERVICE_NAME": node.label
                }
                # Inject connection strings for downstream nodes
                for target_id in downstream_map.get(node.id, []):
                    target_node = next((n for n in graph.nodes if n.id == target_id), None)
                    if target_node:
                        t_name = node_name_map[target_id]
                        if target_node.type == "database":
                            env_vars["DATABASE_URL"] = f"postgresql://circuit_user:circuit_password_secure@{t_name}:5432/circuit_db"
                        elif target_node.type == "cache":
                            env_vars["REDIS_URL"] = f"redis://:redis_password_secure@{t_name}:6379/0"
                        elif target_node.type == "queue":
                            env_vars["KAFKA_BROKERS"] = f"{t_name}:9092"

                services[svc_name] = {
                    "build": {
                        "context": f"./services/{svc_name}",
                        "dockerfile": "Dockerfile"
                    },
                    "container_name": svc_name,
                    "restart": "unless-stopped",
                    "environment": env_vars,
                    "ports": [f"{node.port}:{node.port}"],
                    "depends_on": depends_on,
                    "networks": ["circuit_mesh"]
                }
                if node.replicas > 1:
                    services[svc_name]["deploy"] = {
                        "replicas": node.replicas
                    }

        compose_dict = {
            "version": "3.8",
            "services": services,
            "networks": {
                "circuit_mesh": {
                    "driver": "bridge"
                }
            }
        }
        if volumes:
            compose_dict["volumes"] = volumes

        header_comment = (
            "# ====================================================================\n"
            "# CircuitScribe Generated Production Docker Compose Configuration\n"
            f"# Total Components: {len(graph.nodes)} | Communication Edges: {len(graph.edges)}\n"
            "# Deterministically compiled with healthchecks, networks, and secrets\n"
            "# ====================================================================\n\n"
        )

        yaml_content = dump_yaml(compose_dict)
        return header_comment + yaml_content

    def generate_mermaid(self, graph: ArchitectureGraph) -> str:
        """Compile graph into Mermaid.js flowchart with styling classes."""
        lines = ["flowchart TD", ""]

        # Class styles for node types
        lines.append("    %% Styling Definitions")
        lines.append("    classDef frontend fill:#0284c7,stroke:#38bdf8,stroke-width:2px,color:#ffffff,rx:8,ry:8;")
        lines.append("    classDef gateway fill:#4f46e5,stroke:#818cf8,stroke-width:2px,color:#ffffff,rx:8,ry:8;")
        lines.append("    classDef service fill:#0f766e,stroke:#2dd4bf,stroke-width:2px,color:#ffffff,rx:8,ry:8;")
        lines.append("    classDef database fill:#065f46,stroke:#34d399,stroke-width:2px,color:#ffffff,rx:4,ry:4;")
        lines.append("    classDef cache fill:#b45309,stroke:#fbbf24,stroke-width:2px,color:#ffffff,rx:8,ry:8;")
        lines.append("    classDef queue fill:#6b21a8,stroke:#c084fc,stroke-width:2px,color:#ffffff,rx:8,ry:8;")
        lines.append("")

        # Nodes
        lines.append("    %% Architecture Nodes")
        for node in graph.nodes:
            safe_id = re.sub(r"[^a-zA-Z0-9_]", "_", node.id)
            label_text = f"<b>{node.label}</b><br/><i>{node.technology} (Port {node.port})</i>"
            
            if node.type == "database":
                lines.append(f'    {safe_id}[("{label_text}")]')
            elif node.type == "queue":
                lines.append(f'    {safe_id}>"{label_text}"]')
            else:
                lines.append(f'    {safe_id}["{label_text}"]')

        lines.append("")
        # Node class assignments
        lines.append("    %% Class Assignments")
        for node in graph.nodes:
            safe_id = re.sub(r"[^a-zA-Z0-9_]", "_", node.id)
            lines.append(f"    class {safe_id} {node.type};")

        lines.append("")
        # Edges
        lines.append("    %% Communication Edges")
        for edge in graph.edges:
            src = re.sub(r"[^a-zA-Z0-9_]", "_", edge.source)
            tgt = re.sub(r"[^a-zA-Z0-9_]", "_", edge.target)
            protocol_badge = f"{edge.protocol}" + (" [Async]" if edge.is_async else "")
            
            if edge.is_async or edge.protocol == "PubSub":
                lines.append(f"    {src} -.->|{protocol_badge}| {tgt}")
            else:
                lines.append(f"    {src} -->|{protocol_badge}| {tgt}")

        return "\n".join(lines)


generator = CodeGenerator()
