from fastapi import APIRouter, BackgroundTasks, WebSocket
from app.services.qs_connect import qs_connect
import asyncio

router = APIRouter()

@router.post("/refresh")
async def refresh_data(background_tasks: BackgroundTasks):
    """
    Triggers the nightly data ingestion pipeline (Async).
    """
    status = qs_connect.get_status()
    if status["status"] == "running":
        return {"message": "Pipeline already running", "status": status}
    
    background_tasks.add_task(qs_connect.run_ingestion_pipeline)
    return {"message": "Ingestion started", "status": "started"}

@router.get("/status")
async def get_ingestion_status():
    return qs_connect.get_status()

@router.websocket("/ws/status")
async def websocket_status(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            status = qs_connect.get_status()
            await websocket.send_json(status)
            await asyncio.sleep(1) # Send update every second
    except Exception:
        pass
