from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ProgramCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=1000)
    weeks: int = Field(default=4, ge=1, le=52)
    sessions: list[dict] = Field(default_factory=list, max_length=30)


class ProgramRead(ProgramCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    created_at: datetime
