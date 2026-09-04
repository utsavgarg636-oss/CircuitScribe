from typing import List, Literal, Optional, Dict, Any
from pydantic import BaseModel, Field

NodeType = Literal["frontend", "gateway", "service", "database", "cache", "queue"]
Protocol = Literal["REST", "gRPC", "PubSub", "WebSocket"]
Severity = Literal["error", "warning"]


class NodeModel(BaseModel):
    id: str = Field(..., description="Unique identifier for the node (e.g. 'node-1')")
    label: str = Field(..., description="Human readable display name (e.g. 'Auth Service')")
    type: NodeType = Field(..., description="Architectural category")
    technology: str = Field(..., description="Specific technology (e.g. 'PostgreSQL', 'Redis', 'FastAPI')")
    port: int = Field(8080, description="Network port for container deployment")
    replicas: int = Field(1, ge=1, description="Number of container instances or cluster nodes")
    description: Optional[str] = Field("", description="Functional description of the node")


class EdgeModel(BaseModel):
    id: str = Field(..., description="Unique identifier for the edge (e.g. 'edge-1')")
    source: str = Field(..., description="Source node id")
    target: str = Field(..., description="Target node id")
    protocol: Protocol = Field("REST", description="Communication protocol")
    is_async: bool = Field(False, description="Whether the connection is asynchronous/non-blocking")
    label: Optional[str] = Field(None, description="Optional label for edge display")


class ArchitectureGraph(BaseModel):
    nodes: List[NodeModel] = Field(default_factory=list, description="List of architecture nodes")
    edges: List[EdgeModel] = Field(default_factory=list, description="List of directional communication edges")
    confidence: float = Field(1.0, ge=0.0, le=1.0, description="Extraction confidence score")
    summary: Optional[str] = Field("", description="Architectural summary or pipeline description")


class LinterViolation(BaseModel):
    id: str = Field(..., description="Unique ID for violation instance")
    rule_name: str = Field(..., description="Name of the architectural audit rule")
    severity: Severity = Field("warning", description="Severity level ('error' or 'warning')")
    message: str = Field(..., description="Clear explanation of the design violation")
    target_node_id: str = Field(..., description="ID of the affected node")
    suggested_action: str = Field(..., description="Recommended engineering remediation")
    auto_fix_type: Optional[str] = Field(None, description="Auto-fix action discriminator")
    auto_fix_payload: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Metadata required for 1-Click Auto-Fix")


class ParseRequest(BaseModel):
    text: str = Field(..., description="Spoken transcript or natural language architecture description")
    preset_id: Optional[str] = Field(None, description="Optional preset key to force load")


class LintRequest(BaseModel):
    graph: ArchitectureGraph = Field(..., description="Architecture graph to audit")


class LintResponse(BaseModel):
    violations: List[LinterViolation] = Field(default_factory=list)
    is_clean: bool = Field(True, description="True if no errors or warnings exist")
    total_violations: int = Field(0)


class ExportRequest(BaseModel):
    graph: ArchitectureGraph = Field(..., description="Architecture graph to compile")


class ExportResponse(BaseModel):
    docker_compose_yaml: str = Field(..., description="Generated docker-compose.yml configuration")
    mermaid_diagram: str = Field(..., description="Generated Mermaid.js flowchart code")
    graph_json: Dict[str, Any] = Field(default_factory=dict, description="Normalized graph schema export")
