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

    def test_verifies_token_with_supabase_auth_when_local_keys_fail(self):
        previous_url = settings.supabase_url
        previous_key = settings.supabase_anon_key
        settings.supabase_url = "https://talent-graph.supabase.co"
        settings.supabase_anon_key = "anon-key"
        try:
            with patch("app.auth.jwt.get_unverified_header", side_effect=jwt.InvalidTokenError()), patch(
                "app.auth.httpx.get"
            ) as get:
                get.return_value.raise_for_status.return_value = None
                get.return_value.json.return_value = {"id": "user-1"}
                claims = _decode_token("signed-token")

            self.assertEqual(claims, {"sub": "user-1", "role": "authenticated"})
            get.assert_called_once_with(
                "https://talent-graph.supabase.co/auth/v1/user",
                headers={"apikey": "anon-key", "Authorization": "Bearer signed-token"},
                timeout=10,
            )
        finally:
            settings.supabase_url = previous_url
            settings.supabase_anon_key = previous_key


if __name__ == "__main__":
    unittest.main()
