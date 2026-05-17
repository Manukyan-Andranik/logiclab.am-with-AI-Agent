"""Pydantic schemas for the analytics module."""
from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Inputs
# ---------------------------------------------------------------------------
class VisitTrackPayload(BaseModel):
    """Body of POST /visits/track from the browser."""
    page_url: Optional[str] = None
    referrer: Optional[str] = None
    duration_ms: Optional[int] = None


class DateRange(BaseModel):
    start: Optional[datetime] = None
    end: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Outputs
# ---------------------------------------------------------------------------
class TimeseriesPoint(BaseModel):
    label: str
    count: int


class LabelCount(BaseModel):
    label: str
    count: int


class ClassBreakdown(BaseModel):
    human: int = 0
    verified_bot: int = 0
    suspicious_bot: int = 0


class OverviewResponse(BaseModel):
    range_start: Optional[datetime] = None
    range_end: Optional[datetime] = None
    today_visits: int = 0
    week_visits: int = 0
    month_visits: int = 0
    total_visits: int = 0
    unique_visitors: int = 0
    human_visits: int = 0
    bot_visits: int = 0
    human_pct: float = 0.0
    bot_pct: float = 0.0
    avg_visits_per_unique: float = 0.0
    classification: ClassBreakdown = Field(default_factory=ClassBreakdown)
    visits_over_time: List[TimeseriesPoint] = []
    unique_over_time: List[TimeseriesPoint] = []
    top_pages: List[LabelCount] = []
    top_referrers: List[LabelCount] = []
    top_countries: List[LabelCount] = []
    browsers: List[LabelCount] = []
    devices: List[LabelCount] = []
    operating_systems: List[LabelCount] = []


class VisitRow(BaseModel):
    id: int
    timestamp: datetime
    ip_address: str
    path: Optional[str] = None
    page_url: str
    method: Optional[str] = None
    status_code: Optional[int] = None
    referrer: Optional[str] = None
    referrer_host: Optional[str] = None
    user_agent: Optional[str] = None
    browser: Optional[str] = None
    os: Optional[str] = None
    device_type: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    visitor_class: Optional[str] = None
    is_bot: bool = False
    session_id: Optional[str] = None
    duration_ms: Optional[int] = None

    class Config:
        from_attributes = True


class VisitListResponse(BaseModel):
    data: List[VisitRow]
    total: int


class TopIPItem(BaseModel):
    ip_address: str
    count: int
    first_seen: datetime
    last_seen: datetime
    visitor_class: Optional[str] = None
    user_agent: Optional[str] = None


class TopIPResponse(BaseModel):
    data: List[TopIPItem]
    total: int


class BotActivityItem(BaseModel):
    user_agent: Optional[str]
    visitor_class: str
    count: int
    last_seen: datetime
    unique_ips: int


class BotActivityResponse(BaseModel):
    data: List[BotActivityItem]
    total: int


class RollupResult(BaseModel):
    days_processed: int
    daily_rows_upserted: int
    months_upserted: int
    raw_rows_pruned: int = 0
