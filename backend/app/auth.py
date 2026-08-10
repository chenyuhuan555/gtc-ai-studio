"""GTC API authentication and product-level access boundary."""
import jwt
from fastapi import Header, HTTPException

from app.config import settings


def require_gtc_user(authorization: str | None = Header(default=None)) -> str:
    """Validate a Supabase Auth JWT and optionally restrict it to GTC users."""
    if settings.sync_auth_disabled:
        return "local-development"
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="需要登录后才能访问 GTC 数据")
    if not settings.supabase_jwt_secret:
        raise HTTPException(status_code=503, detail="服务未配置 Supabase JWT Secret")

    token = authorization.removeprefix("Bearer ").strip()
    try:
        claims = jwt.decode(token, settings.supabase_jwt_secret, algorithms=["HS256"])
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="登录凭证无效") from exc

    if claims.get("role") != "authenticated":
        raise HTTPException(status_code=403, detail="无权访问 GTC 数据")
    user_id = str(claims.get("sub") or "")
    if not user_id:
        raise HTTPException(status_code=401, detail="登录凭证缺少用户身份")
    if settings.allowed_user_ids and user_id not in settings.allowed_user_ids:
        raise HTTPException(status_code=403, detail="该账号未加入 GTC AI Studio")
    return user_id
