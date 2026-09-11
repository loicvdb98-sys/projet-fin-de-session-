from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class SessionBase(BaseModel):
    title: str = Field(min_length=1, max_length=150)
    description: str | None = None
    starts_at: datetime
    duration_minutes: int = Field(default=60, gt=0)
    capacity: int = Field(default=20, gt=0)


class SessionCreate(SessionBase):
    coach_id: int


class SessionUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    starts_at: datetime | None = None
    duration_minutes: int | None = Field(default=None, gt=0)
    capacity: int | None = Field(default=None, gt=0)


class SessionRead(SessionBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    coach_id: int
