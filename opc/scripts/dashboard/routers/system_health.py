"""System Health diagnostic router."""
from fastapi import APIRouter

from dashboard.services.system_health import SystemHealthService

router = APIRouter(prefix="/api/system-health", tags=["system-health"])
service = SystemHealthService()


@router.get("/report")
async def get_system_health_report():
    """Run full diagnostic across all 6 subsystems."""
    return await service.run_full_diagnostic()
