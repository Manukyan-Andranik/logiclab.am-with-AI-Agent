"""Read-side analytics queries.

Everything in this module is read-only and safe to call from admin endpoints
under heavy concurrency. We avoid SELECT * and never load full rows except
for the recent-visits and per-row listing endpoints.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import List, Optional, Tuple

from sqlalchemy import Date, Integer, and_, case, cast, distinct, func, or_, select
from sqlalchemy.orm import Session

from ..models.models import Visit, VisitDaily, VisitMonthly, VisitorClass
from .schemas import (
    BotActivityItem,
    BotActivityResponse,
    ClassBreakdown,
    LabelCount,
    OverviewResponse,
    TimeseriesPoint,
    TopIPItem,
    TopIPResponse,
    VisitListResponse,
    VisitRow,
)

_TOP_N = 10


def _scope(db: Session, start: Optional[datetime], end: Optional[datetime]):
    q = db.query(Visit)
    if start is not None:
        q = q.filter(Visit.timestamp >= start)
    if end is not None:
        q = q.filter(Visit.timestamp <= end)
    return q


def _label(v) -> str:
    return "" if v is None else str(v)


# ---------------------------------------------------------------------------
# Overview (combined dashboard payload)
# ---------------------------------------------------------------------------
def overview(
    db: Session,
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
) -> OverviewResponse:
    """Single payload that backs the admin dashboard overview."""
    now = datetime.now(timezone.utc)
    today_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    week_start = today_start - timedelta(days=6)
    month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)

    base = _scope(db, start, end)

    # Aggregate counters in a single query.
    row = base.with_entities(
        func.count(Visit.id).label("total"),
        func.count(distinct(func.coalesce(Visit.ip_hash, Visit.ip_address))).label("uniques"),
        func.coalesce(func.sum(case((Visit.is_bot.is_(True), 1), else_=0)), 0).label("bots"),
        func.coalesce(func.sum(case((Visit.is_bot.is_(False), 1), else_=0)), 0).label("humans"),
        func.coalesce(func.sum(case((Visit.visitor_class == VisitorClass.VERIFIED_BOT.value, 1), else_=0)), 0).label("verified_bots"),
        func.coalesce(func.sum(case((Visit.visitor_class == VisitorClass.SUSPICIOUS_BOT.value, 1), else_=0)), 0).label("suspicious_bots"),
        func.coalesce(func.sum(case((Visit.visitor_class == VisitorClass.HUMAN.value, 1), else_=0)), 0).label("humans_class"),
    ).one()

    total = int(row.total or 0)
    uniques = int(row.uniques or 0)
    bots = int(row.bots or 0)
    humans = int(row.humans or 0)

    today_visits = db.query(func.count(Visit.id)).filter(Visit.timestamp >= today_start).scalar() or 0
    week_visits = db.query(func.count(Visit.id)).filter(Visit.timestamp >= week_start).scalar() or 0
    month_visits = db.query(func.count(Visit.id)).filter(Visit.timestamp >= month_start).scalar() or 0

    human_pct = round((humans / total * 100), 1) if total else 0.0
    bot_pct = round((bots / total * 100), 1) if total else 0.0
    avg_per_unique = round((total / uniques), 2) if uniques else 0.0

    # --- timeseries: visits over time, unique over time ---
    day_col = cast(Visit.timestamp, Date)

    visits_ts = (
        base.with_entities(day_col.label("d"), func.count(Visit.id).label("c"))
        .group_by(day_col).order_by(day_col).all()
    )
    unique_ts = (
        base.with_entities(
            day_col.label("d"),
            func.count(distinct(func.coalesce(Visit.ip_hash, Visit.ip_address))).label("c"),
        ).group_by(day_col).order_by(day_col).all()
    )

    # --- top-N breakdowns ---
    def _topn(col, label_fn=_label, n=_TOP_N, where=None):
        q = base.with_entities(col.label("k"), func.count(Visit.id).label("c"))
        if where is not None:
            q = q.filter(where)
        q = q.group_by(col).order_by(func.count(Visit.id).desc()).limit(n)
        return [LabelCount(label=label_fn(r.k), count=int(r.c)) for r in q.all()]

    top_pages       = _topn(Visit.path, where=Visit.path.isnot(None))
    top_referrers   = _topn(Visit.referrer_host, where=Visit.referrer_host.isnot(None))
    top_countries   = _topn(Visit.country, where=Visit.country.isnot(None))
    browsers        = _topn(Visit.browser, where=Visit.browser.isnot(None))
    devices         = _topn(Visit.device_type, where=Visit.device_type.isnot(None))
    oses            = _topn(Visit.os, where=Visit.os.isnot(None))

    return OverviewResponse(
        range_start=start, range_end=end,
        today_visits=int(today_visits), week_visits=int(week_visits), month_visits=int(month_visits),
        total_visits=total, unique_visitors=uniques,
        human_visits=humans, bot_visits=bots,
        human_pct=human_pct, bot_pct=bot_pct, avg_visits_per_unique=avg_per_unique,
        classification=ClassBreakdown(
            human=int(row.humans_class or 0),
            verified_bot=int(row.verified_bots or 0),
            suspicious_bot=int(row.suspicious_bots or 0),
        ),
        visits_over_time=[TimeseriesPoint(label=str(r.d), count=int(r.c)) for r in visits_ts],
        unique_over_time=[TimeseriesPoint(label=str(r.d), count=int(r.c)) for r in unique_ts],
        top_pages=top_pages, top_referrers=top_referrers, top_countries=top_countries,
        browsers=browsers, devices=devices, operating_systems=oses,
    )


# ---------------------------------------------------------------------------
# Listings
# ---------------------------------------------------------------------------
def list_visits(
    db: Session,
    *,
    skip: int = 0,
    limit: int = 100,
    visitor_class: Optional[str] = None,
    is_bot: Optional[bool] = None,
    search: Optional[str] = None,
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
) -> VisitListResponse:
    q = _scope(db, start, end)
    if visitor_class:
        q = q.filter(Visit.visitor_class == visitor_class)
    if is_bot is not None:
        q = q.filter(Visit.is_bot == is_bot)
    if search:
        s = f"%{search.lower()}%"
        q = q.filter(or_(
            Visit.ip_address.ilike(s),
            Visit.page_url.ilike(s),
            Visit.path.ilike(s),
            Visit.user_agent.ilike(s),
        ))
    total = q.count()
    rows = q.order_by(Visit.timestamp.desc()).offset(skip).limit(min(limit, 500)).all()
    return VisitListResponse(data=[VisitRow.model_validate(r) for r in rows], total=total)


def top_ips(
    db: Session,
    *,
    limit: int = 50,
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    visitor_class: Optional[str] = None,
) -> TopIPResponse:
    q = _scope(db, start, end)
    if visitor_class:
        q = q.filter(Visit.visitor_class == visitor_class)
    rows = (
        q.with_entities(
            Visit.ip_address.label("ip"),
            func.count(Visit.id).label("c"),
            func.min(Visit.timestamp).label("first"),
            func.max(Visit.timestamp).label("last"),
            func.max(Visit.visitor_class).label("vc"),
            func.max(Visit.user_agent).label("ua"),
        )
        .group_by(Visit.ip_address)
        .order_by(func.count(Visit.id).desc())
        .limit(min(limit, 500))
        .all()
    )
    items = [
        TopIPItem(
            ip_address=r.ip or "unknown",
            count=int(r.c),
            first_seen=r.first,
            last_seen=r.last,
            visitor_class=r.vc,
            user_agent=r.ua,
        )
        for r in rows
    ]
    return TopIPResponse(data=items, total=len(items))


def bot_activity(
    db: Session,
    *,
    limit: int = 100,
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
) -> BotActivityResponse:
    q = _scope(db, start, end).filter(Visit.is_bot.is_(True))
    rows = (
        q.with_entities(
            Visit.user_agent.label("ua"),
            func.coalesce(Visit.visitor_class, VisitorClass.SUSPICIOUS_BOT.value).label("vc"),
            func.count(Visit.id).label("c"),
            func.max(Visit.timestamp).label("last"),
            func.count(distinct(Visit.ip_address)).label("ips"),
        )
        .group_by(Visit.user_agent, Visit.visitor_class)
        .order_by(func.count(Visit.id).desc())
        .limit(min(limit, 500))
        .all()
    )
    items = [
        BotActivityItem(
            user_agent=r.ua, visitor_class=r.vc, count=int(r.c),
            last_seen=r.last, unique_ips=int(r.ips),
        )
        for r in rows
    ]
    return BotActivityResponse(data=items, total=len(items))


def top_pages(
    db: Session, *, limit: int = 20,
    start: Optional[datetime] = None, end: Optional[datetime] = None,
) -> List[LabelCount]:
    rows = (
        _scope(db, start, end)
        .with_entities(Visit.path.label("k"), func.count(Visit.id).label("c"))
        .filter(Visit.path.isnot(None))
        .group_by(Visit.path)
        .order_by(func.count(Visit.id).desc())
        .limit(min(limit, 200))
        .all()
    )
    return [LabelCount(label=_label(r.k), count=int(r.c)) for r in rows]


# ---------------------------------------------------------------------------
# Rollup (raw → VisitDaily → VisitMonthly)
# ---------------------------------------------------------------------------
def rollup_daily(db: Session, days_back: int = 30, retention_days: Optional[int] = None) -> Tuple[int, int, int]:
    """Upsert per-day rows for the last `days_back` days.
    Returns (days_processed, daily_rows_upserted, raw_pruned).
    """
    today = datetime.now(timezone.utc).date()
    start = today - timedelta(days=days_back)
    end = today + timedelta(days=1)

    day_col = cast(Visit.timestamp, Date).label("day")
    agg = (
        db.query(
            day_col,
            func.count(Visit.id).label("total"),
            func.count(distinct(func.coalesce(Visit.ip_hash, Visit.ip_address))).label("uniques"),
            func.coalesce(func.sum(case((Visit.is_bot.is_(True), 1), else_=0)), 0).label("bots"),
            func.coalesce(func.sum(case((Visit.is_bot.is_(False), 1), else_=0)), 0).label("humans"),
        )
        .filter(Visit.timestamp >= start, Visit.timestamp < end)
        .group_by(day_col)
        .all()
    )

    upserted = 0
    for r in agg:
        d: date = r.day if isinstance(r.day, date) else date.fromisoformat(str(r.day))
        existing = (
            db.query(VisitDaily)
            .filter(VisitDaily.day == d, VisitDaily.path.is_(None), VisitDaily.visitor_class.is_(None))
            .first()
        )
        if existing is None:
            db.add(VisitDaily(
                day=d, path=None, visitor_class=None,
                total_visits=int(r.total or 0), unique_visitors=int(r.uniques or 0),
                bot_visits=int(r.bots or 0), human_visits=int(r.humans or 0),
            ))
        else:
            existing.total_visits = int(r.total or 0)
            existing.unique_visitors = int(r.uniques or 0)
            existing.bot_visits = int(r.bots or 0)
            existing.human_visits = int(r.humans or 0)
        upserted += 1

    pruned = 0
    if retention_days and retention_days > 0:
        cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
        pruned = (
            db.query(Visit)
            .filter(Visit.timestamp < cutoff)
            .delete(synchronize_session=False)
        )

    db.commit()
    return len(agg), upserted, int(pruned or 0)


def rollup_monthly(db: Session, months_back: int = 12) -> int:
    today = datetime.now(timezone.utc).date()
    first_of_this_month = today.replace(day=1)
    # walk back N months
    months = []
    y, m = first_of_this_month.year, first_of_this_month.month
    for _ in range(months_back + 1):
        months.append(date(y, m, 1))
        m -= 1
        if m == 0:
            m = 12
            y -= 1

    upserted = 0
    for first in months:
        if first.month == 12:
            nxt = date(first.year + 1, 1, 1)
        else:
            nxt = date(first.year, first.month + 1, 1)
        agg = (
            db.query(
                func.coalesce(func.sum(VisitDaily.total_visits), 0),
                func.coalesce(func.sum(VisitDaily.unique_visitors), 0),
                func.coalesce(func.sum(VisitDaily.bot_visits), 0),
                func.coalesce(func.sum(VisitDaily.human_visits), 0),
            )
            .filter(
                VisitDaily.day >= first, VisitDaily.day < nxt,
                VisitDaily.path.is_(None), VisitDaily.visitor_class.is_(None),
            )
            .one()
        )
        total, uniques, bots, humans = (int(x or 0) for x in agg)
        existing = db.query(VisitMonthly).filter(VisitMonthly.month == first).first()
        if existing is None:
            db.add(VisitMonthly(
                month=first, total_visits=total, unique_visitors=uniques,
                bot_visits=bots, human_visits=humans,
            ))
        else:
            existing.total_visits = total
            existing.unique_visitors = uniques
            existing.bot_visits = bots
            existing.human_visits = humans
        upserted += 1
    db.commit()
    return upserted
