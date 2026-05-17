"""Optional non-blocking ASGI middleware that records every HTML page hit.

This is in addition to the explicit POST /visits/track call the browser
already makes. Enable by setting LOGICLAB_ANALYTICS_AUTOTRACK=1 and adding:

    from app.analytics.middleware import AnalyticsMiddleware
    app.add_middleware(AnalyticsMiddleware)

Design notes
------------
* The middleware NEVER blocks the response. It captures lightweight request
  metadata, builds a VisitInput, and dispatches the actual DB write to
  asyncio.create_task — the response returns the moment the handler finishes.
* Sampling: LOGICLAB_ANALYTICS_SAMPLE (default 1.0) — fraction of eligible
  requests to record.
* Skips: non-GET, status>=400 (configurable), excluded path prefixes,
  localhost traffic.
"""
from __future__ import annotations

import asyncio
import logging
import os
import random
from datetime import datetime, timezone

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from . import utils
from .service import VisitInput, record_visit

logger = logging.getLogger(__name__)

_ENABLED = os.environ.get("LOGICLAB_ANALYTICS_AUTOTRACK", "0") == "1"
_SAMPLE = float(os.environ.get("LOGICLAB_ANALYTICS_SAMPLE", "1.0"))
_TRACK_API = os.environ.get("LOGICLAB_ANALYTICS_TRACK_API", "0") == "1"


def _should_record(request: Request, response: Response) -> bool:
    if not _ENABLED:
        return False
    if request.method != "GET":
        return False
    if response.status_code >= 400:
        return False
    if _SAMPLE < 1.0 and random.random() > _SAMPLE:
        return False
    path = request.url.path
    if not _TRACK_API and path.startswith("/api/"):
        return False
    if utils.should_skip_path(path):
        return False
    return True


class AnalyticsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        try:
            if not _should_record(request, response):
                return response
            ip = utils.extract_client_ip(
                request.headers, request.client.host if request.client else None
            )
            if utils.is_localhost(ip, str(request.url)):
                return response

            payload = VisitInput(
                ip_address=ip,
                page_url=str(request.url),
                user_agent=request.headers.get("user-agent"),
                referrer=request.headers.get("referer"),
                method=request.method,
                status_code=response.status_code,
                country=request.headers.get("cf-ipcountry"),
                timestamp=datetime.now(timezone.utc),
            )
            # Fire-and-forget — never block the response on the DB write.
            asyncio.create_task(_record_async(payload))
        except Exception:
            logger.exception("AnalyticsMiddleware: failed to dispatch record_visit")
        return response


async def _record_async(payload: VisitInput) -> None:
    """Run the blocking SQLAlchemy write in a thread so we don't stall the loop."""
    try:
        await asyncio.to_thread(record_visit, payload, None)
    except Exception:
        logger.exception("AnalyticsMiddleware: record_visit failed")
