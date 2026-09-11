from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class NotificationCreate(BaseModel):
    title: str = Field(min_length=2, max_length=120)
    message: str = Field(min_length=2, max_length=1000)
    kind: str = Field(default="info", max_length=20)


class NotificationRead(NotificationCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    is_read: bool
    created_at: datetime
