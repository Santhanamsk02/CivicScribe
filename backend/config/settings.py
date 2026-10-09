from functools import lru_cache

from pydantic_settings import (
    BaseSettings,
    SettingsConfigDict,
)


class Settings(BaseSettings):

    # =========================================================
    # APPLICATION
    # =========================================================

    app_name: str = "CivicScribe"

    app_version: str = "1.0.0"

    debug: bool = True

    # =========================================================
    # SUPABASE
    # =========================================================

    supabase_url: str

    supabase_key: str

    # =========================================================
    # CLOUDINARY
    # =========================================================

    cloudinary_cloud_name: str

    cloudinary_api_key: str

    cloudinary_api_secret: str

    # =========================================================
    # GROQ
    # =========================================================

    groq_api_key: str

    groq_model: str = (
        "openai/gpt-oss-20b"
    )

    groq_vision_model: str = (
        "qwen/qwen3.8-27b"
    )

    # =========================================================
    # NOTIFICATIONS
    # =========================================================

    telegram_bot_token: str | None = None

    sms_api_key: str | None = None

    sms_provider: str | None = None

    # =========================================================
    # CORS
    # =========================================================

    cors_origins: str = (
        "http://localhost:5173,"
        "http://127.0.0.1:5173"
    )

    @property
    def cors_origins_list(self) -> list[str]:

        return [
            origin.strip()
            for origin in self.cors_origins.split(",")
            if origin.strip()
        ]

    # =========================================================
    # PYDANTIC SETTINGS
    # =========================================================

    model_config = SettingsConfigDict(

        env_file=".env",

        env_file_encoding="utf-8",

        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:

    return Settings()


settings = get_settings()