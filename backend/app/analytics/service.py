"""Visit-recording service: the single write path used by the router,
middleware, and any background tracker.

Designed to be:
  * cheap on the hot path (no rDNS, no geo lookups)
  * crash-safe (DB errors logged, never raised to the caller — analytics
    must never break a user request)
  * deduplicating (same session + same path within DEDUP_SECONDS = 1 row)
"""
from __future__ import annotations

import logging
import os
import threading
import time
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from ..core.database import SessionLocal
from ..models.models import Visit, VisitorClass
from . import utils

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Burst dedupe — drop near-duplicate hits from the same session on the same
# path. Cheap LRU; per-process, that's fine: we just want to absorb the burst
# of double-fires from React StrictMode / SPA route changes.
# ---------------------------------------------------------------------------
DEDUP_SECONDS = float(os.environ.get("LOGICLAB_VISIT_DEDUP_SECONDS", "10"))
_dedup_lock = threading.Lock()
_dedup_recent: dict = {}
_DEDUP_MAX = 4096


def _dedup_seen(key: str) -> bool:
    now = time.monotonic()
    with _dedup_lock:
        last = _dedup_recent.get(key)
        if last is not None and (now - last) < DEDUP_SECONDS:
            _dedup_recent[key] = now
            return True
        if len(_dedup_recent) >= _DEDUP_MAX:
            cutoff = now - DEDUP_SECONDS * 5
            for k in [k for k, v in list(_dedup_recent.items()) if v < cutoff]:
                _dedup_recent.pop(k, None)
        _dedup_recent[key] = now
        return False


@dataclass
class VisitInput:
    """Everything record_visit() needs. Built by the router or middleware."""
    ip_address: str
    page_url: str
    user_agent: Optional[str] = None
    referrer: Optional[str] = None
    method: Optional[str] = None
    status_code: Optional[int] = None
    country: Optional[str] = None
    city: Optional[str] = None
    duration_ms: Optional[int] = None
    timestamp: Optional[datetime] = None


def build_visit(inp: VisitInput) -> Optional[Visit]:
    """Pure helper: turn a VisitInput into a `Visit` ORM object (unsaved).
    Returns None if the visit should be silently dropped."""
    if utils.is_localhost(inp.ip_address, inp.page_url):
        return None
    path, qs = utils.normalize_path(inp.page_url)
    if utils.should_skip_path(path):
        return None

    when = inp.timestamp or datetime.now(timezone.utc)
    browser, os_name, device = utils.parse_user_agent(inp.user_agent)
    vclass = utils.classify_visitor(inp.user_agent)  # no rDNS on hot path
    is_bot = vclass != VisitorClass.HUMAN.value

    ip_for_storage = utils.anonymize_ip(inp.ip_address) if utils.ANONYMIZE_IPS else inp.ip_address
    ip_hash = utils.hash_ip(inp.ip_address)
    session = utils.make_session_id(inp.ip_address, inp.user_agent or "", when)

    ref = inp.referrer
    ref_host = utils.referrer_host(ref)

    return Visit(
        timestamp=when,
        ip_address=ip_for_storage[:64],
        ip_hash=ip_hash,
        session_id=session,
        page_url=(inp.page_url or "")[:500],
        path=path,
        query_string=qs,
        method=(inp.method or None),
        status_code=inp.status_code,
        referrer=(ref or None) and ref[:500],
        referrer_host=ref_host[:255] if ref_host else None,
        user_agent=(inp.user_agent or None) and inp.user_agent[:500],
        browser=browser,
        os=os_name,
        device_type=device if vclass == VisitorClass.HUMAN.value else "bot",
        country=inp.country,
        city=inp.city,
        is_bot=is_bot,
        visitor_class=vclass,
        duration_ms=inp.duration_ms,
    )


def record_visit(inp: VisitInput, db: Optional[Session] = None) -> Optional[Visit]:
    """Persist a Visit. Crash-safe.

    Pass an existing `db` Session when called from a request handler; pass
    None when called from a BackgroundTask (we'll open and close our own).
    """
    visit = build_visit(inp)
    if visit is None:
        return None

    dedup_key = f"{visit.session_id}|{visit.path}"
    if _dedup_seen(dedup_key):
        return None

    owns_session = db is None
    session: Session = db or SessionLocal()
    try:
        session.add(visit)
        session.commit()
        if owns_session:
            return visit
        session.refresh(visit)
        return visit
    except SQLAlchemyError:
        try:
            session.rollback()
        except Exception:
            pass
        logger.exception("analytics.record_visit failed path=%s", visit.path)
        return None
    finally:
        if owns_session:
            try:
                session.close()
            except Exception:
                pass
