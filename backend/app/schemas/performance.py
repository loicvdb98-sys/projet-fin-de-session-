from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class PerformanceCreate(BaseModel):
    user_id: int
    session_id: int
    score: float = Field(ge=0)
    notes: str | None = None


class PerformanceRead(PerformanceCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    recorded_at: datetime


class PerformanceUpdate(BaseModel):
    score: float | None = Field(default=None, ge=0)
    notes: str | None = None
