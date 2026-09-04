import logging
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.schemas import (
    ParseRequest,
    LintRequest,
    LintResponse,
    ExportRequest,
    ExportResponse,
    ArchitectureGraph
)
from app.extractor import extractor, PRESETS
from app.linter import linter
from app.generator import generator

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("circuitscribe.main")

# Initialize FastAPI app
app = FastAPI(
    title="CircuitScribe API",
    description="Autonomous NLP-to-React Flow Architecture Generator, NetworkX Graph Linter, and Docker Compose Compiler",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration
origins = settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Open CORS for seamless local and cloud client connectivity
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint for container orchestrators and uptime monitoring."""
    return {
        "status": "healthy",
        "service": "CircuitScribe API",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "gemini_active": extractor.gemini_available
    }


@app.get("/", tags=["Root"])
async def root():
    """Root info endpoint."""
    return {
        "name": "CircuitScribe API",
        "description": "Voice-to-Architecture, NetworkX Linter & Docker Compose Compiler",
        "health": "/health",
        "docs": "/docs"
    }


@app.post("/api/parse", response_model=ArchitectureGraph, tags=["Parser"])
async def parse_prompt(request: ParseRequest):
    """Extract structured ArchitectureGraph from natural language or speech transcript."""
    try:
        graph = extractor.extract(text=request.text, preset_id=request.preset_id)
        return graph
    except Exception as e:
        logger.error(f"Error parsing prompt: {e}", exc_info=True)
        # Fallback guarantee to e-commerce preset so frontend never crashes
        return PRESETS["ecommerce"]


@app.post("/api/lint", response_model=LintResponse, tags=["Linter"])
async def lint_graph(request: LintRequest):
    """Audit an architecture graph against 4 distributed systems rules using NetworkX."""
    try:
        response = linter.lint(request.graph)
        return response
    except Exception as e:
        logger.error(f"Error linting graph: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Graph linter analysis failed: {str(e)}"
        )


@app.post("/api/export", response_model=ExportResponse, tags=["Compiler"])
async def export_artifacts(request: ExportRequest):
    """Compile graph into deployable docker-compose.yml and Mermaid.js diagram."""
    try:
        export_result = generator.generate_all(request.graph)
        return export_result
    except Exception as e:
        logger.error(f"Error exporting code: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Code generation failed: {str(e)}"
        )
