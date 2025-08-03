from fastapi import FastAPI
from pathlib import Path
import sys

from .flows import router as flows_router

# Allow importing modules from the existing Streamlit app directory
sys.path.append(str(Path(__file__).resolve().parent.parent / "app"))
import db_utils

app = FastAPI(title="CrewAI Studio Backend")


@app.on_event("startup")
def startup() -> None:
    """Initialize the database on startup."""
    db_utils.initialize_db()


app.include_router(flows_router)
