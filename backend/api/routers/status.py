from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def get_system_status():
    return {
        "status": "operational", 
        "version": "2.1.0",
        "services": ["QS Connect", "QS Research", "Omega"]
    }
