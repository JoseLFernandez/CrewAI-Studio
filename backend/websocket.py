from typing import Dict, List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()

class ConnectionManager:
    def __init__(self) -> None:
        self.connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, run_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self.connections.setdefault(run_id, []).append(websocket)

    def disconnect(self, run_id: str, websocket: WebSocket) -> None:
        conns = self.connections.get(run_id)
        if conns and websocket in conns:
            conns.remove(websocket)
            if not conns:
                del self.connections[run_id]

    async def broadcast(self, run_id: str, message: str) -> None:
        for ws in list(self.connections.get(run_id, [])):
            try:
                await ws.send_text(message)
            except WebSocketDisconnect:
                self.disconnect(run_id, ws)

manager = ConnectionManager()

async def broadcast_log(run_id: str, line: str) -> None:
    """Helper to send a log line to all connected clients."""
    await manager.broadcast(run_id, line)

@router.websocket("/ws/flow-runs/{run_id}")
async def websocket_logs(websocket: WebSocket, run_id: str) -> None:
    await manager.connect(run_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(run_id, websocket)
