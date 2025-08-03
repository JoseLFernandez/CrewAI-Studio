from fastapi import FastAPI
from pathlib import Path
import sys

from .flows import router as flows_router
from .runner import router as runner_router
from .nodes import router as nodes_router

# Allow importing modules from the existing Streamlit app directory
sys.path.append(str(Path(__file__).resolve().parent.parent / "app"))
import db_utils

app = FastAPI(title="CrewAI Studio Backend")


@app.on_event("startup")
def startup() -> None:
    """Initialize the database on startup."""
    db_utils.initialize_db()


app.include_router(flows_router)
app.include_router(runner_router)
app.include_router(nodes_router)
