from datetime import datetime, timezone

from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def health():
    return {
        "status": "ok",
        "service": "menusmart-python-service",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
