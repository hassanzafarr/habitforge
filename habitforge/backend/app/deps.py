from __future__ import annotations

import os
import time
from typing import Annotated, Any

import httpx
import jwt
import sentry_sdk
from fastapi import Depends, Header, HTTPException, status
from jwt import PyJWKClient

# Clerk issues RS256 JWTs. Verify via the Frontend API JWKS endpoint.
# Set HABITFORGE_CLERK_ISSUER to your instance's issuer URL, e.g.
#   https://clerk.your-domain.com
#   https://<slug>.clerk.accounts.dev
CLERK_ISSUER = os.getenv("HABITFORGE_CLERK_ISSUER", "").rstrip("/")
CLERK_JWKS_URL = os.getenv("HABITFORGE_CLERK_JWKS_URL") or (
    f"{CLERK_ISSUER}/.well-known/jwks.json" if CLERK_ISSUER else ""
)
# Optional: restrict tokens to a specific authorized party (your frontend origin).
CLERK_AUTHORIZED_PARTY = os.getenv("HABITFORGE_CLERK_AUTHORIZED_PARTY")

_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if not CLERK_JWKS_URL:
        raise HTTPException(
            status_code=500,
            detail="Clerk not configured: set HABITFORGE_CLERK_ISSUER.",
        )
    if _jwks_client is None:
        _jwks_client = PyJWKClient(CLERK_JWKS_URL, cache_keys=True)
    return _jwks_client


def _verify_token(token: str) -> dict[str, Any]:
    try:
        signing_key = _get_jwks_client().get_signing_key_from_jwt(token).key
        claims = jwt.decode(
            token,
            signing_key,
            algorithms=["RS256"],
            issuer=CLERK_ISSUER or None,
            options={"verify_aud": False},
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid token: {exc}"
        ) from exc

    # Clerk session tokens include `exp`, `nbf`, `iat`, `sub`, `azp`.
    now = int(time.time())
    if claims.get("nbf") and claims["nbf"] > now + 5:
        raise HTTPException(status_code=401, detail="Token not yet valid")
    if CLERK_AUTHORIZED_PARTY and claims.get("azp") != CLERK_AUTHORIZED_PARTY:
        raise HTTPException(status_code=401, detail="Unauthorized party")
    if not claims.get("sub"):
        raise HTTPException(status_code=401, detail="Token missing subject")
    return claims


async def get_current_user_id(
    authorization: Annotated[str | None, Header()] = None,
) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = authorization.split(" ", 1)[1].strip()
    claims = _verify_token(token)
    sentry_sdk.set_user({"id": claims["sub"]})
    return claims["sub"]


CurrentUser = Annotated[str, Depends(get_current_user_id)]
