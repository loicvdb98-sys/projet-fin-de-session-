"""Configuration de l'application, chargée depuis les variables d'environnement ou un fichier .env."""

from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Longueur minimale de la clé de signature des JWT (HS256 : au moins 256 bits conseillés).
MIN_SECRET_KEY_LENGTH = 32


class Settings(BaseSettings):
    """Paramètres globaux de l'application (base de données, JWT, CORS)."""

    database_url: str
    secret_key: str
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    allowed_origins: str = "http://localhost:4200,http://127.0.0.1:4200"
    # Origines supplémentaires acceptées par expression régulière, ex. le front ouvert depuis
    # un téléphone du réseau local : http://192\.168\.\d{1,3}\.\d{1,3}:4200 (vide = aucune).
    allowed_origin_regex: str | None = None

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @field_validator("secret_key")
    @classmethod
    def secret_key_is_long_enough(cls, value: str) -> str:
        """Refuse de démarrer avec une clé JWT trop courte, donc facile à deviner."""
        if len(value) < MIN_SECRET_KEY_LENGTH:
            raise ValueError(f"SECRET_KEY doit contenir au moins {MIN_SECRET_KEY_LENGTH} caractères (générez-en une avec : py -c \"import secrets; print(secrets.token_urlsafe(48))\")")
        return value

    @property
    def allowed_origins_list(self) -> list[str]:
        """Convertit la liste d'origines CORS (chaîne séparée par des virgules) en liste de chaînes."""
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    """Retourne l'instance unique des paramètres (mise en cache pour éviter de relire l'environnement)."""
    return Settings()
