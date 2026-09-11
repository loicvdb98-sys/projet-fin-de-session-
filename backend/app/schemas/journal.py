from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class JournalCreate(BaseModel):
    session_id: int
    notes: str | None = Field(default=None, max_length=2000)
    fatigue: int = Field(default=5, ge=1, le=10)
    mood: str = Field(default="bien", min_length=2, max_length=30)
    pain: str | None = Field(default=None, max_length=255)


class JournalUpdate(BaseModel):
    notes: str | None = Field(default=None, max_length=2000)
    fatigue: int | None = Field(default=None, ge=1, le=10)
    mood: str | None = Field(default=None, min_length=2, max_length=30)
    pain: str | None = Field(default=None, max_length=255)
    coach_comment: str | None = Field(default=None, max_length=2000)


class JournalRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    session_id: int
    notes: str | None
    fatigue: int
    mood: str
    pain: str | None
    coach_comment: str | None
    created_at: datetime
    updated_at: datetime
