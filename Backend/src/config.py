from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Central app config. All values load from environment variables
    (or a local .env file during development). Never hardcode secrets here.
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"
    app_secret_key: str

    database_url: str

    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    invite_token_expire_hours: int = 48
    password_reset_token_expire_minutes: int = 30

    cors_allowed_origins: str = "http://localhost:5173"
    frontend_url: str = "http://localhost:5173"

    resend_api_key: str
    email_from_address: str

    storage_endpoint: str
    storage_access_key_id: str
    storage_secret_access_key: str
    storage_bucket_name: str

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_allowed_origins.split(",")]


settings = Settings()
