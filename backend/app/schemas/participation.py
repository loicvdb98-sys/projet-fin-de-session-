from pydantic import BaseModel, ConfigDict


class ParticipationCreate(BaseModel):
    user_id: int
    session_id: int


class ParticipationUpdate(BaseModel):
    status: str


class ParticipationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    session_id: int
    status: str
