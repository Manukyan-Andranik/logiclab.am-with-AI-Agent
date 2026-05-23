"""
In-memory per-IP rate limiting for sensitive endpoints.

Uses a sliding window per (scope, IP). Suitable for single-node or low worker count;
each Uvicorn worker maintains its own counters. Disable via RATE_LIMIT_ENABLED=false.

For multi-node production, replace the store with Redis (same interface).
"""

from __future__ import annotations

import logging
import threading
import time
from collections import defaultdict
from typing import Callable, Dict, List, Tuple

from fastapi import HTTPException, Request, status

from .config import settings

logger = logging.getLogger(__name__)

_lock = threading.Lock()
_hits: Dict[str, List[float]] = defaultdict(list)


def client_ip(request: Request) -> str:
    """Resolve client IP; honor first X-Forwarded-For hop when behind a proxy."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()[:64]
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def _prune_and_check(key: str, max_requests: int, window_seconds: int) -> Tuple[bool, int]:
    now = time.monotonic()
    window_start = now - window_seconds
    with _lock:
        bucket = [t for t in _hits[key] if t > window_start]
        if len(bucket) >= max_requests:
            retry_after = max(1, int(window_seconds - (now - bucket[0]) + 1))
            _hits[key] = bucket
            return False, retry_after
        bucket.append(now)
        _hits[key] = bucket
        return True, 0


def enforce_rate_limit(request: Request, scope: str, max_requests: int, window_seconds: int) -> None:
    """Raise HTTP 429 when the limit for this scope + IP is exceeded."""
    if not settings.RATE_LIMIT_ENABLED:
        return

    key = f"{scope}:{client_ip(request)}"
    allowed, retry_after = _prune_and_check(key, max_requests, window_seconds)
    if allowed:
        return

    logger.warning(
        "rate_limit_exceeded scope=%s ip=%s max=%s window_s=%s",
        scope,
        key.split(":", 1)[-1],
        max_requests,
        window_seconds,
    )
    raise HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail="Too many requests. Please try again later.",
        headers={"Retry-After": str(retry_after)},
    )


def rate_limit_dependency(
    scope: str,
    max_requests: int | None = None,
    window_seconds: int | None = None,
) -> Callable:
    """
    Factory for FastAPI Depends() — reads limits from settings by scope name.
    """

    async def _dependency(request: Request) -> None:
        limits = settings.rate_limit_for(scope)
        max_r = max_requests if max_requests is not None else limits[0]
        window = window_seconds if window_seconds is not None else limits[1]
        enforce_rate_limit(request, scope, max_r, window)

    return _dependency


# Pre-built dependencies for common scopes
rate_limit_auth_login = rate_limit_dependency("auth:login")
rate_limit_auth_register = rate_limit_dependency("auth:register")
rate_limit_auth_instructor_register = rate_limit_dependency("auth:instructor_register")
rate_limit_auth_password_reset = rate_limit_dependency("auth:password_reset")
rate_limit_upload = rate_limit_dependency("upload:file")
rate_limit_contact_submit = rate_limit_dependency("contact:submit")
rate_limit_logic_chat = rate_limit_dependency("logic:chat")
