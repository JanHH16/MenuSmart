from datetime import UTC, datetime

from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def health():
    return {
        "status": "ok",
        "service": "menusmart-python-service",
        "timestamp": datetime.now(UTC).isoformat(),
    }
