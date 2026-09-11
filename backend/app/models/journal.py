from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class TrainingJournal(Base):
    __tablename__ = "training_journals"
    __table_args__ = (UniqueConstraint("user_id", "session_id", name="UQ_Journal_User_Session"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("sport_sessions.id", ondelete="CASCADE"), index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    fatigue: Mapped[int] = mapped_column(Integer, default=5)
    mood: Mapped[str] = mapped_column(String(30), default="bien")
    pain: Mapped[str | None] = mapped_column(String(255), nullable=True)
    coach_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
