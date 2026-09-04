# CircuitScribe ⚡

> **Autonomous Spoken Engineering Ingestion • NetworkX Graph Linter • Deterministic Docker Compose Compiler**

CircuitScribe translates spoken discussions or text descriptions into interactive React Flow diagrams, audits distributed systems architecture using a NetworkX graph linter (4 core resilience rules), and compiles them into production-ready `docker-compose.yml` and Mermaid.js diagrams with **1-Click Auto-Fix** capabilities.

---

## 🚀 Key Features

1. **Voice-to-Architecture (Web Speech API + Gemini Flash / Regex)**:
   - Speak naturally into the microphone or submit system architecture prompts.
   - Automatically parses multi-tier topologies (Frontend, Gateways, Microservices, Databases, Caches, Message Queues).
   - Zero-dependency client & server deterministic fallback parsers ensure 100% fail-safe live demos even without LLM API keys.

2. **NetworkX Architectural Graph Linter**:
   - **Rule 1: Single Point of Failure (SPOF)** — Flags single-replica databases/caches with high incoming traffic.
   - **Rule 2: Missing Cache Layer** — Flags relational databases receiving direct read traffic without Redis/Memcached.
   - **Rule 3: Unbuffered Direct Write** — Flags synchronous REST edges connecting Gateways to Databases or background workers.
   - **Rule 4: Circular Synchronous Dependency** — Detects distributed deadlock cycles using `nx.simple_cycles`.

3. **1-Click Auto-Fix**:
   - One click dynamically injects recommended components (e.g., Redis or Kafka), scales replicas, re-wires edges, auto-formats layout via Dagre, and resolves violations in real time.

4. **Deterministic Docker Compose & Mermaid Compiler**:
   - Generates production-grade `docker-compose.yml` with real images (`postgres:16-alpine`, `redis:7.2-alpine`, `bitnami/kafka:3.7`, `nginx:alpine`), networks, volumes, environment connection strings, and healthchecks.
   - Compiles styled Mermaid.js flowchart markdown with copy and download utilities.

---

## 📂 Repository Structure

```
circuitscribe/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app with CORS, healthcheck, routes
│   │   ├── config.py            # Settings & env loading with resilient fallback
│   │   ├── schemas.py           # Pydantic v2 schemas for Nodes, Edges, Graphs, Linters
│   │   ├── extractor.py         # Gemini API + deterministic regex NLP fallback
│   │   ├── linter.py            # NetworkX graph analysis & 4 core architectural rules
│   │   └── generator.py         # Jinja2-style docker-compose.yml & Mermaid.js compiler
│   ├── requirements.txt
│   ├── Procfile                 # Render / Railway deployment
│   ├── render.yaml              # Render Blueprint specification
│   ├── Dockerfile
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx       # Root layout with dark glass theme & Outfit/Mono fonts
    │   │   ├── page.tsx         # Workspace layout (Canvas, Ingestion, Linter Panel)
    │   │   └── globals.css      # Tailwind & React Flow custom canvas styles
    │   ├── components/
    │   │   ├── Canvas.tsx       # @xyflow/react canvas with Dagre auto-layout
    │   │   ├── CustomNodes.tsx  # Service, DB, Cache, Queue, Gateway styled nodes
    │   │   ├── VoiceInput.tsx   # Web Speech API capture + presets
    │   │   ├── LinterPanel.tsx  # Violations drawer with 1-Click Auto-Fix
    │   │   └── CodeModal.tsx    # Syntax-highlighted docker-compose & Mermaid viewer
    │   ├── store/
    │   │   └── graphStore.ts    # Zustand store syncing canvas state & linter fixes
    │   └── lib/
    │       └── api.ts           # Resilient API client with offline local engine
    ├── package.json
    ├── tailwind.config.ts
    ├── tsconfig.json
    └── vercel.json
```

---

## 🛠️ Quick Start Instructions

### 1. Run Backend (FastAPI)
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
# source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Backend API will be available at: `http://localhost:8000` (Docs: `http://localhost:8000/docs`).

### 2. Run Frontend (Next.js 14)
```bash
cd frontend
npm install
npm run dev
```
Frontend Web App will be available at: `http://localhost:3000`.

---

## 🌐 Cloud Deployment

- **Frontend (Vercel)**: Connect repository to Vercel. Set root directory to `frontend`. Configure `NEXT_PUBLIC_API_URL`.
- **Backend (Render / Railway)**: Connect repository to Render. Use `backend/render.yaml` or set root directory to `backend` with start command `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
