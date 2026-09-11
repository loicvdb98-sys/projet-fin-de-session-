from pydantic import BaseModel


class StatisticsRead(BaseModel):
    total_sessions: int
    upcoming_sessions: int
    total_participations: int
    attended_sessions: int
    total_performances: int
    average_score: float | None
