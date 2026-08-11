import sys
from pathlib import Path
import unittest
from unittest.mock import patch

import jwt

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.auth import _decode_token
from app.config import settings


class AuthTokenTests(unittest.TestCase):
    def test_decodes_legacy_hs256_token(self):
        previous_secret = settings.supabase_jwt_secret
        settings.supabase_jwt_secret = "test-secret"
        try:
            token = jwt.encode(
                {"sub": "user-1", "role": "authenticated"},
                "test-secret",
                algorithm="HS256",
            )
            self.assertEqual(_decode_token(token)["sub"], "user-1")
        finally:
            settings.supabase_jwt_secret = previous_secret

    def test_uses_supabase_jwks_for_non_hs256_token(self):
        previous_url = settings.supabase_url
        settings.supabase_url = "https://talent-graph.supabase.co"
        try:
            class SigningKey:
                key = "public-key"

            with patch("app.auth.PyJWKClient") as jwks:
                jwks.return_value.get_signing_key_from_jwt.return_value = SigningKey()
                with patch("app.auth.jwt.get_unverified_header", return_value={"alg": "ES256"}), patch(
                    "app.auth.jwt.decode", return_value={"sub": "user-1", "role": "authenticated"}
                ) as decode:
                    claims = _decode_token("signed-token")

            self.assertEqual(claims["sub"], "user-1")
            jwks.assert_called_once_with("https://talent-graph.supabase.co/auth/v1/.well-known/jwks.json")
            decode.assert_called_once_with("signed-token", "public-key", algorithms=["ES256"])
        finally:
            settings.supabase_url = previous_url


if __name__ == "__main__":
    unittest.main()
