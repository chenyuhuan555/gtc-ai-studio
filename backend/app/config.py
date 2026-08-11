"""应用配置。从环境变量 / .env 读取，缺省值保证本地零配置可运行。"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./gtc.db"
    deepseek_api_key: str = ""
    deepseek_model: str = "deepseek-chat"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    supabase_url: str = ""
    supabase_anon_key: str = ""
    sync_auth_disabled: bool = False
    supabase_jwt_secret: str = ""
    gtca_allowed_user_ids: str = ""

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def allowed_user_ids(self) -> set[str]:
        return {value.strip() for value in self.gtca_allowed_user_ids.split(",") if value.strip()}


settings = Settings()
