from fastapi import APIRouter
from api.routers.data import get_qs_client

router = APIRouter()

@router.get("/")
async def get_system_status():
    """Get general system status."""
    return {"status": "operational", "version": "1.0.0"}

@router.get("/logs")
def get_system_logs(limit: int = 50):
    """Get recent execution logs from the database."""
    try:
        client = get_qs_client()
        # Access db_manager directly via client (a bit of a reach-around, but standard for this architecture)
        # Assuming client exposes it or we add a wrapper. 
        # Client has `_db_manager`. I should probably expose `get_logs` in Client.
        # But `Client` is "Data Client". 
        # Let's add `get_logs` to Client class first.
        logs = client.get_system_logs(limit)
        return logs.to_dicts()
    except Exception as e:
        return {"error": str(e)}
