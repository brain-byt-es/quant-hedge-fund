"""
QS Connect - Governance API Router

Handles strategy approvals, audit logs, and staging transitions.
"""

from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException
from loguru import logger
from pydantic import BaseModel

from api.routers.data import get_qs_client

router = APIRouter()

class ApprovalRequest(BaseModel):
    strategy_hash: str
    strategy_name: str
    stage: str # SHADOW, PAPER, CANARY, FULL
    rationale: str
    approved_by: str = "ADMIN"
    config_snapshot: Optional[Dict[str, Any]] = None

@router.post("/approve")
async def approve_strategy(request: ApprovalRequest):
    """Log a human approval for a strategy transition via Proxy."""
    client = get_qs_client()
    try:
        import json
        config_json = json.dumps(request.config_snapshot) if request.config_snapshot else "{}"

        # Use proxy execute
        client.execute("""
            INSERT INTO strategy_audit_log (strategy_hash, stage, approved_by, human_rationale, config_json, approved_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, [request.strategy_hash, request.stage, request.approved_by, request.rationale, config_json, datetime.now()])

        logger.info(f"Strategy {request.strategy_hash} approved for {request.stage} by {request.approved_by}")
        return {"status": "success", "strategy_hash": request.strategy_hash}
    except Exception as e:
        logger.error(f"Approval failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/audit-trail")
async def get_audit_trail(limit: int = 50):
    """Retrieve the immutable audit log via Proxy."""
    client = get_qs_client()
    try:
        df = client.query(f"SELECT * FROM strategy_audit_log ORDER BY approved_at DESC LIMIT {limit}")
        return df.to_dicts()
    except Exception as e:
        logger.error(f"Audit trail fetch failed: {e}")
        return []
