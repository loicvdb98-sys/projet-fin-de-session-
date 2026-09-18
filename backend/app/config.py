"""Configuration de l'application, chargée depuis les variables d'environnement ou un fichier .env."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Paramètres globaux de l'application (base de données, JWT, CORS)."""

    database_url: str
    secret_key: str
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    allowed_origins: str = "http://localhost:4200,http://127.0.0.1:4200"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def allowed_origins_list(self) -> list[str]:
        """Convertit la liste d'origines CORS (chaîne séparée par des virgules) en liste de chaînes."""
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    """Retourne l'instance unique des paramètres (mise en cache pour éviter de relire l'environnement)."""
    return Settings()
