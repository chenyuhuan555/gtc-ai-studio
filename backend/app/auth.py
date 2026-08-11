"""GTC API authentication and product-level access boundary."""
import jwt
from fastapi import Header, HTTPException
from jwt import PyJWKClient

from app.config import settings


_JWKS_ALGORITHMS = {"RS256", "RS384", "RS512", "ES256", "ES384", "ES512", "EdDSA"}


def _decode_token(token: str) -> dict:
    """Decode legacy HS256 tokens or tokens signed by Supabase JWT signing keys."""
    algorithm = jwt.get_unverified_header(token).get("alg")
    if algorithm == "HS256":
        return jwt.decode(token, settings.supabase_jwt_secret, algorithms=["HS256"])
    if algorithm not in _JWKS_ALGORITHMS:
        raise jwt.InvalidAlgorithmError("unsupported JWT signing algorithm")
    if not settings.supabase_url:
        raise jwt.PyJWTError("Supabase URL is required for JWT signing keys")

    jwks_url = f"{settings.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
    signing_key = PyJWKClient(jwks_url).get_signing_key_from_jwt(token)
    return jwt.decode(token, signing_key.key, algorithms=[algorithm])


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
        claims = _decode_token(token)
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
