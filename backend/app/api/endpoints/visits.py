# app/api/endpoints/visits.py
from fastapi import APIRouter, Depends, Request, status, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct, cast, Date
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

from ...core.database import get_db
from ...models.models import Visit # Import the new Visit model
from ...schemas.schemas import VisitResponse, VisitCreate, VisitSummaryResponse, VisitAggregationItem, VisitListResponse # Updated import
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


@router.post("/visits/track", status_code=status.HTTP_201_CREATED, response_model=VisitResponse)
async def track_visit(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Track a new website visit.
    Automatically extracts IP, user agent, and referrer from the request.
    """
    ip_address = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("User-Agent", "unknown")
    page_url = str(request.url) # Full URL of the request
    referrer = request.headers.get("Referer") # Note: 'Referer' header is often misspelled
    
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


    return VisitSummaryResponse(
        total_visits=total_visits,
        unique_visitors=unique_visitors,
        mobile_visits=mobile_visits,
        desktop_visits=desktop_visits,
        bot_visits=bot_visits,
        human_visits=human_visits,
        visits_over_time=visits_over_time_data,
        visits_by_page=visits_by_page_data,
        visits_by_country=visits_by_country_data,
        visits_by_browser=visits_by_browser_data
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
