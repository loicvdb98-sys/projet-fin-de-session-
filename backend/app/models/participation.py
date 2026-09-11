from typing import TYPE_CHECKING

from sqlalchemy import Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base

if TYPE_CHECKING:
    from .session import Session
    from .user import User


class Participation(Base):
    __tablename__ = "participations"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    session_id: Mapped[int] = mapped_column(ForeignKey("sport_sessions.id"))
    status: Mapped[str] = mapped_column(Enum("inscrit", "present", "absent", name="participation_status"), default="inscrit")
    user: Mapped["User"] = relationship(back_populates="participations")
    session: Mapped["Session"] = relationship(back_populates="participations")
