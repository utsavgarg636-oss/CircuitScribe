import os
from typing import List, Union
import json

try:
    from pydantic_settings import BaseSettings, SettingsConfigDict
    from pydantic import field_validator

    class Settings(BaseSettings):
        """Application settings with environment variable support."""
        PORT: int = 8000
        ENVIRONMENT: str = "development"
        CORS_ORIGINS: Union[List[str], str] = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "https://circuitscribe.vercel.app",
            "*"
        ]
        
        # LLM API Keys (Optional with local deterministic fallbacks)
        GEMINI_API_KEY: str = ""
        OPENAI_API_KEY: str = ""

        @field_validator("CORS_ORIGINS", mode="before")
        @classmethod
        def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
            if isinstance(v, str) and not v.startswith("["):
                return [i.strip() for i in v.split(",")]
            elif isinstance(v, str) and v.startswith("["):
                try:
                    return json.loads(v)
                except Exception:
                    return [v]
            return v

        model_config = SettingsConfigDict(
            env_file=".env",
            env_file_encoding="utf-8",
            extra="ignore"
        )

    settings = Settings()

except ImportError:
    # Resilient fallback if pydantic-settings package is not pre-installed
    class FallbackSettings:
        PORT: int = int(os.getenv("PORT", "8000"))
        ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
        CORS_ORIGINS: List[str] = ["*"]
        GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
        OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")

    settings = FallbackSettings()  # type: ignore
