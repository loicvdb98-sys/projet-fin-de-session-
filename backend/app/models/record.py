from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class PersonalRecord(Base):
    __tablename__ = "personal_records"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    exercise_name: Mapped[str] = mapped_column(String(120))
    value: Mapped[float] = mapped_column()
    unit: Mapped[str] = mapped_column(String(20))
    achieved_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    notes: Mapped[str | None] = mapped_column(String(255), nullable=True)
