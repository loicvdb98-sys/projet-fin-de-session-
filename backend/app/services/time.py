from datetime import datetime, timezone


def is_past(value: datetime) -> bool:
    normalized = value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    return normalized <= datetime.now(timezone.utc)
