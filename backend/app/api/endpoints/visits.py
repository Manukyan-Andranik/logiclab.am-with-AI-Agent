# app/api/endpoints/visits.py
from fastapi import APIRouter, Depends, Request, Response, status, Query, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct, cast, Date, Integer
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

from ...core.database import get_db
from ...models.models import Visit # Import the new Visit model
from ...schemas.schemas import (
    VisitResponse,
    VisitCreate,
    VisitSummaryResponse,
    VisitAggregationItem,
    VisitListResponse,
    VisitorBreakdownItem,
    RecentVisitItem,
    DailyVisitorBreakdownItem,
    DailyVisitGroup,
)

LOCALHOST_IPS = {"127.0.0.1", "::1", "0.0.0.0", "localhost"}


def _is_localhost(ip_address: Optional[str], page_url: Optional[str]) -> bool:
    if ip_address and ip_address.strip().lower() in LOCALHOST_IPS:
        return True
    if page_url:
        url = page_url.lower()
        if "://localhost" in url or "://127.0.0.1" in url or "://[::1]" in url or "://0.0.0.0" in url:
            return True
    return False
from ..deps import get_current_admin # Assuming admin access for summary, but not for tracking

router = APIRouter()


def _visits_query(db: Session, start_date: Optional[datetime], end_date: Optional[datetime]):
    """Fresh query each time — reusing one Query after .with_entities() breaks subsequent filters."""
    q = db.query(Visit)
    if start_date is not None:
        q = q.filter(Visit.timestamp >= start_date)
    if end_date is not None:
        q = q.filter(Visit.timestamp <= end_date)
    return q


def _agg_label(value: Any) -> str:
    if value is None:
        return ""
    return str(value)


class VisitTrackPayload(BaseModel):
    page_url: Optional[str] = None
    referrer: Optional[str] = None


@router.post("/visits/track", status_code=status.HTTP_201_CREATED, response_model=Optional[VisitResponse])
async def track_visit(
    request: Request,
    response: Response,
    payload: Optional[VisitTrackPayload] = None,
    db: Session = Depends(get_db)
):
    """
    Track a new website visit.
    Client should send the page URL it is on (window.location.href). Falls back to
    the request URL / Referer header if not supplied.
    """
    # X-Forwarded-For takes precedence when behind a proxy
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        ip_address = forwarded_for.split(",")[0].strip()
    elif request.client:
        ip_address = request.client.host
    else:
        ip_address = "unknown"

    user_agent = request.headers.get("User-Agent", "unknown")
    header_referer = request.headers.get("Referer")
    page_url = (payload.page_url if payload and payload.page_url else header_referer) or str(request.url)
    referrer = (payload.referrer if payload and payload.referrer else header_referer)
    
    # Skip localhost / development traffic — never persisted.
    if _is_localhost(ip_address, page_url):
        response.status_code = status.HTTP_204_NO_CONTENT
        return None

    # Simple bot detection (can be improved)
    is_bot = any(bot_string in user_agent.lower() for bot_string in ["bot", "spider", "crawler", "lighthouse"])

    # Basic IP geolocation (placeholder, requires external service for accuracy)
    # For a real application, integrate with a geo-IP service like MaxMind GeoLite2
    country = None
    city = None

    new_visit = Visit(
        ip_address=ip_address,
        page_url=page_url,
        user_agent=user_agent,
        referrer=referrer,
        is_bot=is_bot,
        country=country,
        city=city
    )
    
    db.add(new_visit)
    db.commit()
    db.refresh(new_visit)
    
    return new_visit

@router.get("/visits/stats/summary", response_model=VisitSummaryResponse)
async def get_visit_summary(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin) # Admin only for analytics
):
    """
    Get a summary of website visit statistics (Admin only).
    Filters by date range if provided.
    """
    total_visits = _visits_query(db, start_date, end_date).count()

    unique_visitors = (
        _visits_query(db, start_date, end_date)
        .with_entities(func.count(distinct(Visit.ip_address)))
        .scalar()
        or 0
    )

    bot_visits = _visits_query(db, start_date, end_date).filter(Visit.is_bot == True).count()
    human_visits = total_visits - bot_visits

    mobile_visits = (
        _visits_query(db, start_date, end_date)
        .filter(
            (Visit.user_agent.ilike("%mobi%"))
            | (Visit.user_agent.ilike("%android%"))
            | (Visit.user_agent.ilike("%iphone%"))
            | (Visit.user_agent.ilike("%ipad%"))
            | (Visit.user_agent.ilike("%windows phone%"))
        )
        .count()
    )
    desktop_visits = total_visits - mobile_visits

    day_col = cast(Visit.timestamp, Date)
    visits_over_time = (
        _visits_query(db, start_date, end_date)
        .with_entities(day_col.label("label"), func.count(Visit.id).label("count"))
        .group_by(day_col)
        .order_by(day_col)
        .all()
    )
    visits_over_time_data = [
        VisitAggregationItem(label=_agg_label(v.label), count=v.count) for v in visits_over_time
    ]

    # Weekly aggregation (ISO week starting Monday)
    week_col = func.date_trunc("week", Visit.timestamp)
    visits_by_week_rows = (
        _visits_query(db, start_date, end_date)
        .with_entities(week_col.label("label"), func.count(Visit.id).label("count"))
        .group_by(week_col)
        .order_by(week_col)
        .all()
    )
    visits_by_week_data = [
        VisitAggregationItem(
            label=v.label.strftime("%Y-%m-%d") if v.label else "",
            count=v.count,
        )
        for v in visits_by_week_rows
    ]

    # Monthly aggregation
    month_col = func.date_trunc("month", Visit.timestamp)
    visits_by_month_rows = (
        _visits_query(db, start_date, end_date)
        .with_entities(month_col.label("label"), func.count(Visit.id).label("count"))
        .group_by(month_col)
        .order_by(month_col)
        .all()
    )
    visits_by_month_data = [
        VisitAggregationItem(
            label=v.label.strftime("%Y-%m") if v.label else "",
            count=v.count,
        )
        for v in visits_by_month_rows
    ]

    visits_by_page = (
        _visits_query(db, start_date, end_date)
        .with_entities(Visit.page_url.label("label"), func.count(Visit.id).label("count"))
        .group_by(Visit.page_url)
        .order_by(func.count(Visit.id).desc())
        .limit(10)
        .all()
    )
    visits_by_page_data = [
        VisitAggregationItem(label=_agg_label(v.label), count=v.count) for v in visits_by_page
    ]

    visits_by_country = (
        _visits_query(db, start_date, end_date)
        .with_entities(Visit.country.label("label"), func.count(Visit.id).label("count"))
        .filter(Visit.country.isnot(None))
        .group_by(Visit.country)
        .order_by(func.count(Visit.id).desc())
        .limit(10)
        .all()
    )
    visits_by_country_data = [
        VisitAggregationItem(label=_agg_label(v.label), count=v.count) for v in visits_by_country
    ]

    visits_by_browser_raw = (
        _visits_query(db, start_date, end_date)
        .with_entities(Visit.user_agent.label("user_agent"), func.count(Visit.id).label("count"))
        .group_by(Visit.user_agent)
        .order_by(func.count(Visit.id).desc())
        .all()
    )
    
    browser_counts = {}
    for v in visits_by_browser_raw:
        browser_name = "Other"
        ua = v.user_agent.lower() if v.user_agent else ""
        if "chrome" in ua and "edge" not in ua:
            browser_name = "Chrome"
        elif "firefox" in ua:
            browser_name = "Firefox"
        elif "safari" in ua and "chrome" not in ua:
            browser_name = "Safari"
        elif "edge" in ua:
            browser_name = "Edge"
        elif "opera" in ua:
            browser_name = "Opera"
        
        browser_counts[browser_name] = browser_counts.get(browser_name, 0) + v.count
    
    visits_by_browser_data = [
        VisitAggregationItem(label=name, count=count) for name, count in browser_counts.items()
    ]
    visits_by_browser_data.sort(key=lambda x: x.count, reverse=True)


    # Per-unique-visitor breakdown: count, first/last seen, latest user agent
    visitor_rows = (
        _visits_query(db, start_date, end_date)
        .with_entities(
            Visit.ip_address.label("ip_address"),
            func.count(Visit.id).label("count"),
            func.min(Visit.timestamp).label("first_seen"),
            func.max(Visit.timestamp).label("last_seen"),
            func.max(Visit.user_agent).label("user_agent"),
        )
        .group_by(Visit.ip_address)
        .order_by(func.count(Visit.id).desc())
        .limit(50)
        .all()
    )
    visits_per_unique_data = [
        VisitorBreakdownItem(
            ip_address=row.ip_address or "unknown",
            count=row.count,
            first_seen=row.first_seen,
            last_seen=row.last_seen,
            user_agent=row.user_agent,
        )
        for row in visitor_rows
    ]

    # Recent visits — most recent 25 with date/time
    recent_rows = (
        _visits_query(db, start_date, end_date)
        .order_by(Visit.timestamp.desc())
        .limit(25)
        .all()
    )
    recent_visits_data = [
        RecentVisitItem(
            timestamp=v.timestamp,
            page_url=v.page_url or "",
            ip_address=v.ip_address or "unknown",
            is_bot=bool(v.is_bot),
        )
        for v in recent_rows
    ]

    avg_visits_per_unique = (total_visits / unique_visitors) if unique_visitors else 0.0

    return VisitSummaryResponse(
        total_visits=total_visits,
        unique_visitors=unique_visitors,
        mobile_visits=mobile_visits,
        desktop_visits=desktop_visits,
        bot_visits=bot_visits,
        human_visits=human_visits,
        avg_visits_per_unique=round(avg_visits_per_unique, 2),
        visits_over_time=visits_over_time_data,
        visits_by_week=visits_by_week_data,
        visits_by_month=visits_by_month_data,
        visits_by_page=visits_by_page_data,
        visits_by_country=visits_by_country_data,
        visits_by_browser=visits_by_browser_data,
        visits_per_unique=visits_per_unique_data,
        recent_visits=recent_visits_data,
    )

@router.get("/visits/stats/by-path", response_model=List[VisitAggregationItem])
async def get_visits_by_path(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Get visits grouped by page path (Admin only)"""
    q = _visits_query(db, start_date, end_date)
    visits_by_path = (
        q.with_entities(Visit.page_url.label("label"), func.count(Visit.id).label("count"))
        .group_by(Visit.page_url)
        .order_by(func.count(Visit.id).desc())
        .limit(limit)
        .all()
    )

    return [VisitAggregationItem(label=_agg_label(item.label), count=item.count) for item in visits_by_path]

@router.get("/visits/stats/by-date", response_model=List[VisitAggregationItem])
async def get_visits_by_date(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Get visits grouped by date (Admin only)"""
    day_col = cast(Visit.timestamp, Date)
    visits_by_date = (
        _visits_query(db, start_date, end_date)
        .with_entities(day_col.label("label"), func.count(Visit.id).label("count"))
        .group_by(day_col)
        .order_by(day_col)
        .all()
    )

    return [VisitAggregationItem(label=_agg_label(item.label), count=item.count) for item in visits_by_date]

@router.get("/visits/stats/by-day", response_model=List[DailyVisitGroup])
async def get_visits_by_day(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    is_bot: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """
    Visits grouped by day. For each day returns the unique visitors that day
    (deduplicated by IP) and how many visits each one made that day. Used by
    the admin Visits page in place of a per-visit list.
    """
    day_col = cast(Visit.timestamp, Date)
    q = _visits_query(db, start_date, end_date)
    if is_bot is not None:
        q = q.filter(Visit.is_bot == is_bot)

    rows = (
        q.with_entities(
            day_col.label("day"),
            Visit.ip_address.label("ip_address"),
            func.count(Visit.id).label("count"),
            func.min(Visit.timestamp).label("first_seen"),
            func.max(Visit.timestamp).label("last_seen"),
            func.max(Visit.user_agent).label("user_agent"),
            func.max(cast(Visit.is_bot, Integer)).label("is_bot"),
        )
        .group_by(day_col, Visit.ip_address)
        .order_by(day_col.desc(), func.count(Visit.id).desc())
        .all()
    )

    grouped: Dict[str, DailyVisitGroup] = {}
    for r in rows:
        day_label = _agg_label(r.day)
        group = grouped.get(day_label)
        if group is None:
            group = DailyVisitGroup(
                date=day_label,
                unique_visitors=0,
                total_visits=0,
                visitors=[],
            )
            grouped[day_label] = group
        group.visitors.append(
            DailyVisitorBreakdownItem(
                ip_address=r.ip_address or "unknown",
                count=r.count,
                first_seen=r.first_seen,
                last_seen=r.last_seen,
                user_agent=r.user_agent,
                is_bot=bool(r.is_bot),
            )
        )
        group.unique_visitors += 1
        group.total_visits += r.count

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
    current_admin = Depends(get_current_admin)
):
    """Get individual visit records (Admin only)"""
    query = db.query(Visit)
    
    if is_bot is not None:
        query = query.filter(Visit.is_bot == is_bot)
    
    if start_date:
        query = query.filter(Visit.timestamp >= start_date)
    if end_date:
        query = query.filter(Visit.timestamp <= end_date)
    
    if search:
        search_term = f"%{search.lower()}%"
        query = query.filter(
            (Visit.ip_address.ilike(search_term)) |
            (Visit.page_url.ilike(search_term)) |
            (Visit.user_agent.ilike(search_term))
        )
            
    total = query.count()
    visits = query.order_by(Visit.timestamp.desc()).offset(skip).limit(limit).all()
    
    return VisitListResponse(data=[VisitResponse.model_validate(v) for v in visits], total=total)

@router.delete("/visits/clear", status_code=status.HTTP_204_NO_CONTENT)
async def clear_old_visits(
    before_date: datetime = Query(..., description="Delete visits before this date"),
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Delete visit records older than a specified date (Admin only)"""
    try:
        db.query(Visit).filter(Visit.timestamp < before_date).delete(synchronize_session=False)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear old visits: {str(e)}"
        )
    return None
