# app/api/endpoints/visits.py
"""Visit tracking + admin analytics endpoints.

Two route groups live here:

  * Legacy `/visits/...` endpoints — kept bit-compatible with the existing
    admin UI so nothing breaks during the upgrade.
  * New `/admin/analytics/...` endpoints — the modern, indexed, aggregated
    payloads driven by `app/analytics/queries.py`.
"""
from __future__ import annotations

import csv
import io
import json
import logging
from datetime import date, datetime, timedelta, timezone
from typing import Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy import Date, Integer, cast, distinct, func
from sqlalchemy.orm import Session

from ...analytics import queries as aq
from ...analytics import utils as au
from ...analytics.schemas import (
    BotActivityResponse,
    OverviewResponse,
    RollupResult,
    TopIPResponse,
    VisitListResponse as AnalyticsVisitListResponse,
    VisitRow,
    VisitTrackPayload,
)
from ...analytics.service import VisitInput, record_visit
from ...core.database import get_db
from ...models.models import Visit, VisitorClass
from ...schemas.schemas import (
    DailyVisitGroup,
    DailyVisitorBreakdownItem,
    RecentVisitItem,
    VisitAggregationItem,
    VisitListResponse,
    VisitResponse,
    VisitSummaryResponse,
    VisitorBreakdownItem,
)
from ..deps import get_current_admin

logger = logging.getLogger(__name__)
router = APIRouter()


# ===========================================================================
# Tracking
# ===========================================================================
@router.post(
    "/visits/track",
    status_code=status.HTTP_201_CREATED,
    response_model=Optional[VisitResponse],
)
async def track_visit(
    request: Request,
    response: Response,
    background_tasks: BackgroundTasks,
    payload: Optional[VisitTrackPayload] = None,
    db: Session = Depends(get_db),
):
    """Record a single page view.

    The DB write is dispatched as a background task so the browser sees a
    near-instant 202. Localhost / excluded paths short-circuit before the
    DB session is touched.
    """
    ip = au.extract_client_ip(request.headers, request.client.host if request.client else None)
    referer = request.headers.get("Referer") or request.headers.get("referer")
    page_url = (payload.page_url if payload and payload.page_url else referer) or str(request.url)

    if au.is_localhost(ip, page_url):
        response.status_code = status.HTTP_204_NO_CONTENT
        return None

    inp = VisitInput(
        ip_address=ip,
        page_url=page_url,
        user_agent=request.headers.get("User-Agent") or request.headers.get("user-agent"),
        referrer=(payload.referrer if payload and payload.referrer else referer),
        method="GET",
        status_code=200,
        country=request.headers.get("cf-ipcountry"),
        duration_ms=(payload.duration_ms if payload else None),
        timestamp=datetime.now(timezone.utc),
    )
    # Background write: response returns immediately.
    background_tasks.add_task(record_visit, inp, None)
    response.status_code = status.HTTP_202_ACCEPTED
    return None


# ===========================================================================
# Legacy admin endpoints (kept for back-compat with the current AdminVisits UI)
# ===========================================================================
def _scope(db: Session, start: Optional[datetime], end: Optional[datetime]):
    q = db.query(Visit)
    if start is not None:
        q = q.filter(Visit.timestamp >= start)
    if end is not None:
        q = q.filter(Visit.timestamp <= end)
    return q


def _label(v) -> str:
    return "" if v is None else str(v)


@router.get("/visits/stats/summary", response_model=VisitSummaryResponse)
async def get_visit_summary(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    """Back-compat dashboard payload."""
    base = _scope(db, start_date, end_date)

    row = base.with_entities(
        func.count(Visit.id).label("total"),
        func.count(distinct(func.coalesce(Visit.ip_hash, Visit.ip_address))).label("uniques"),
        func.coalesce(func.sum(cast(Visit.is_bot, Integer)), 0).label("bots"),
    ).one()
    total_visits = int(row.total or 0)
    unique_visitors = int(row.uniques or 0)
    bot_visits = int(row.bots or 0)
    human_visits = total_visits - bot_visits

    mobile_visits = base.filter(Visit.device_type.in_(("mobile", "tablet"))).count()
    # Fall back to UA scan for pre-upgrade rows where device_type is NULL.
    if mobile_visits == 0:
        mobile_visits = base.filter(
            (Visit.user_agent.ilike("%mobi%"))
            | (Visit.user_agent.ilike("%android%"))
            | (Visit.user_agent.ilike("%iphone%"))
            | (Visit.user_agent.ilike("%ipad%"))
            | (Visit.user_agent.ilike("%windows phone%"))
        ).count()
    desktop_visits = total_visits - mobile_visits

    day_col = cast(Visit.timestamp, Date)
    visits_over_time_rows = (
        base.with_entities(day_col.label("label"), func.count(Visit.id).label("count"))
        .group_by(day_col).order_by(day_col).all()
    )
    visits_over_time = [VisitAggregationItem(label=_label(r.label), count=int(r.count)) for r in visits_over_time_rows]

    week_col = func.date_trunc("week", Visit.timestamp)
    weeks = (
        base.with_entities(week_col.label("label"), func.count(Visit.id).label("count"))
        .group_by(week_col).order_by(week_col).all()
    )
    visits_by_week = [
        VisitAggregationItem(
            label=r.label.strftime("%Y-%m-%d") if r.label else "",
            count=int(r.count),
        ) for r in weeks
    ]

    month_col = func.date_trunc("month", Visit.timestamp)
    months = (
        base.with_entities(month_col.label("label"), func.count(Visit.id).label("count"))
        .group_by(month_col).order_by(month_col).all()
    )
    visits_by_month = [
        VisitAggregationItem(
            label=r.label.strftime("%Y-%m") if r.label else "",
            count=int(r.count),
        ) for r in months
    ]

    pages = (
        base.with_entities(
            func.coalesce(Visit.path, Visit.page_url).label("label"),
            func.count(Visit.id).label("count"),
        )
        .group_by(func.coalesce(Visit.path, Visit.page_url))
        .order_by(func.count(Visit.id).desc()).limit(10).all()
    )
    visits_by_page = [VisitAggregationItem(label=_label(r.label), count=int(r.count)) for r in pages]

    countries = (
        base.with_entities(Visit.country.label("label"), func.count(Visit.id).label("count"))
        .filter(Visit.country.isnot(None))
        .group_by(Visit.country).order_by(func.count(Visit.id).desc()).limit(10).all()
    )
    visits_by_country = [VisitAggregationItem(label=_label(r.label), count=int(r.count)) for r in countries]

    browser_rows = (
        base.with_entities(
            Visit.browser.label("label"),
            func.count(Visit.id).label("count"),
        )
        .group_by(Visit.browser).order_by(func.count(Visit.id).desc()).all()
    )
    visits_by_browser = [
        VisitAggregationItem(label=_label(r.label) or "Other", count=int(r.count))
        for r in browser_rows
    ]

    visitor_rows = (
        base.with_entities(
            Visit.ip_address.label("ip"),
            func.count(Visit.id).label("c"),
            func.min(Visit.timestamp).label("first"),
            func.max(Visit.timestamp).label("last"),
            func.max(Visit.user_agent).label("ua"),
        )
        .group_by(Visit.ip_address).order_by(func.count(Visit.id).desc()).limit(50).all()
    )
    visits_per_unique = [
        VisitorBreakdownItem(
            ip_address=r.ip or "unknown", count=int(r.c),
            first_seen=r.first, last_seen=r.last, user_agent=r.ua,
        ) for r in visitor_rows
    ]

    recent_rows = base.order_by(Visit.timestamp.desc()).limit(25).all()
    recent_visits = [
        RecentVisitItem(
            timestamp=v.timestamp, page_url=v.page_url or "",
            ip_address=v.ip_address or "unknown", is_bot=bool(v.is_bot),
        ) for v in recent_rows
    ]

    return VisitSummaryResponse(
        total_visits=total_visits, unique_visitors=unique_visitors,
        mobile_visits=mobile_visits, desktop_visits=desktop_visits,
        bot_visits=bot_visits, human_visits=human_visits,
        avg_visits_per_unique=round(total_visits / unique_visitors, 2) if unique_visitors else 0.0,
        visits_over_time=visits_over_time, visits_by_week=visits_by_week,
        visits_by_month=visits_by_month, visits_by_page=visits_by_page,
        visits_by_country=visits_by_country, visits_by_browser=visits_by_browser,
        visits_per_unique=visits_per_unique, recent_visits=recent_visits,
    )


@router.get("/visits/stats/by-path", response_model=List[VisitAggregationItem])
async def get_visits_by_path(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    rows = (
        _scope(db, start_date, end_date)
        .with_entities(
            func.coalesce(Visit.path, Visit.page_url).label("label"),
            func.count(Visit.id).label("count"),
        )
        .group_by(func.coalesce(Visit.path, Visit.page_url))
        .order_by(func.count(Visit.id).desc())
        .limit(limit).all()
    )
    return [VisitAggregationItem(label=_label(r.label), count=int(r.count)) for r in rows]


@router.get("/visits/stats/by-date", response_model=List[VisitAggregationItem])
async def get_visits_by_date(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    day_col = cast(Visit.timestamp, Date)
    rows = (
        _scope(db, start_date, end_date)
        .with_entities(day_col.label("label"), func.count(Visit.id).label("count"))
        .group_by(day_col).order_by(day_col).all()
    )
    return [VisitAggregationItem(label=_label(r.label), count=int(r.count)) for r in rows]


@router.get("/visits/stats/by-day", response_model=List[DailyVisitGroup])
async def get_visits_by_day(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    is_bot: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    day_col = cast(Visit.timestamp, Date)
    q = _scope(db, start_date, end_date)
    if is_bot is not None:
        q = q.filter(Visit.is_bot == is_bot)

    rows = (
        q.with_entities(
            day_col.label("day"),
            Visit.ip_address.label("ip"),
            func.count(Visit.id).label("c"),
            func.min(Visit.timestamp).label("first"),
            func.max(Visit.timestamp).label("last"),
            func.max(Visit.user_agent).label("ua"),
            func.max(cast(Visit.is_bot, Integer)).label("bot"),
        )
        .group_by(day_col, Visit.ip_address)
        .order_by(day_col.desc(), func.count(Visit.id).desc()).all()
    )

    grouped: Dict[str, DailyVisitGroup] = {}
    for r in rows:
        key = _label(r.day)
        g = grouped.get(key)
        if g is None:
            g = DailyVisitGroup(date=key, unique_visitors=0, total_visits=0, visitors=[])
            grouped[key] = g
        g.visitors.append(DailyVisitorBreakdownItem(
            ip_address=r.ip or "unknown", count=int(r.c),
            first_seen=r.first, last_seen=r.last, user_agent=r.ua, is_bot=bool(r.bot),
        ))
        g.unique_visitors += 1
        g.total_visits += int(r.c)
    return list(grouped.values())


@router.get("/visits", response_model=VisitListResponse)
async def get_visits(
    skip: int = 0,
    limit: int = 100,
    is_bot: Optional[bool] = None,
    search: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    q = _scope(db, start_date, end_date)
    if is_bot is not None:
        q = q.filter(Visit.is_bot == is_bot)
    if search:
        s = f"%{search.lower()}%"
        q = q.filter(
            (Visit.ip_address.ilike(s))
            | (Visit.page_url.ilike(s))
            | (Visit.path.ilike(s))
            | (Visit.user_agent.ilike(s))
        )
    total = q.count()
    rows = q.order_by(Visit.timestamp.desc()).offset(skip).limit(min(limit, 500)).all()
    return VisitListResponse(data=[VisitResponse.model_validate(v) for v in rows], total=total)


@router.delete("/visits/clear", status_code=status.HTTP_204_NO_CONTENT)
async def clear_old_visits(
    before_date: datetime = Query(..., description="Delete visits before this date"),
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    try:
        db.query(Visit).filter(Visit.timestamp < before_date).delete(synchronize_session=False)
        db.commit()
    except Exception as e:  # pragma: no cover
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to clear old visits: {e}")
    return None


# ===========================================================================
# NEW: /admin/analytics/*
# ===========================================================================
analytics_router = APIRouter(prefix="/admin/analytics", tags=["Analytics"])


@analytics_router.get("/overview", response_model=OverviewResponse)
async def analytics_overview(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    return aq.overview(db, start_date, end_date)


@analytics_router.get("/visits", response_model=AnalyticsVisitListResponse)
async def analytics_visits(
    skip: int = 0,
    limit: int = 100,
    visitor_class: Optional[str] = Query(None, description="human|verified_bot|suspicious_bot"),
    is_bot: Optional[bool] = None,
    search: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    return aq.list_visits(
        db, skip=skip, limit=limit, visitor_class=visitor_class, is_bot=is_bot,
        search=search, start=start_date, end=end_date,
    )


@analytics_router.get("/pages")
async def analytics_pages(
    limit: int = 20,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    return {"data": aq.top_pages(db, limit=limit, start=start_date, end=end_date)}


@analytics_router.get("/bots", response_model=BotActivityResponse)
async def analytics_bots(
    limit: int = 100,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    return aq.bot_activity(db, limit=limit, start=start_date, end=end_date)


@analytics_router.get("/unique", response_model=TopIPResponse)
async def analytics_unique(
    limit: int = 50,
    visitor_class: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    return aq.top_ips(db, limit=limit, start=start_date, end=end_date, visitor_class=visitor_class)


@analytics_router.get("/export")
async def analytics_export(
    format: str = Query("csv", pattern="^(csv|json)$"),
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    visitor_class: Optional[str] = None,
    limit: int = Query(10000, le=100000),
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    """Stream analytics rows as CSV or JSON."""
    listing = aq.list_visits(
        db, skip=0, limit=limit, visitor_class=visitor_class,
        start=start_date, end=end_date,
    )
    fname = f"visits-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}.{format}"

    if format == "json":
        payload = json.dumps([r.model_dump(mode="json") for r in listing.data], default=str)
        return StreamingResponse(
            iter([payload]),
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="{fname}"'},
        )

    buf = io.StringIO()
    cols = [
        "id", "timestamp", "ip_address", "path", "page_url", "method", "status_code",
        "referrer_host", "referrer", "browser", "os", "device_type", "country", "city",
        "visitor_class", "is_bot", "session_id", "duration_ms",
    ]
    writer = csv.DictWriter(buf, fieldnames=cols)
    writer.writeheader()
    for row in listing.data:
        d = row.model_dump(mode="json")
        writer.writerow({c: d.get(c, "") for c in cols})
    csv_bytes = buf.getvalue()
    return StreamingResponse(
        iter([csv_bytes]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )


@analytics_router.post("/rollup", response_model=RollupResult)
async def analytics_rollup(
    days_back: int = Query(30, ge=1, le=365),
    months_back: int = Query(12, ge=1, le=60),
    retention_days: Optional[int] = Query(None, ge=30, le=3650,
                                          description="If set, delete raw visits older than this"),
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    """Materialize VisitDaily + VisitMonthly aggregates. Safe to run from cron."""
    days, daily, pruned = aq.rollup_daily(db, days_back=days_back, retention_days=retention_days)
    months = aq.rollup_monthly(db, months_back=months_back)
    return RollupResult(
        days_processed=days, daily_rows_upserted=daily,
        months_upserted=months, raw_rows_pruned=pruned,
    )
