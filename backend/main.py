from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import sys

from .flows import router as flows_router
from .runner import router as runner_router
from .flow_runs import router as flow_runs_router
from .nodes import router as nodes_router
from .auth import router as auth_router
from .websocket import router as websocket_router
from .crews import router as crews_router
from .agents import router as agents_router
from .tasks import router as tasks_router
from .results import router as results_router
from .knowledge import router as knowledge_router
from .tools import router as tools_router
from .import_export import router as import_export_router

# Allow importing modules from the existing Streamlit app directory
sys.path.append(str(Path(__file__).resolve().parent.parent / "app"))
import db_utils

app = FastAPI(title="CrewAI Studio Backend")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    """Initialize the database on startup."""
    db_utils.initialize_db()


app.include_router(flows_router)
app.include_router(runner_router)
app.include_router(nodes_router)
app.include_router(flow_runs_router)
app.include_router(auth_router, prefix="/auth")
app.include_router(websocket_router)
app.include_router(crews_router, prefix="/crews")
app.include_router(agents_router, prefix="/agents")
app.include_router(tasks_router, prefix="/tasks")
app.include_router(results_router, prefix="/results")
app.include_router(knowledge_router, prefix="/knowledge")
app.include_router(tools_router, prefix="/tools")
app.include_router(import_export_router)


@app.get("/health")
def health() -> dict[str, str]:
    """Simple health check endpoint."""
    return {"status": "ok"}
