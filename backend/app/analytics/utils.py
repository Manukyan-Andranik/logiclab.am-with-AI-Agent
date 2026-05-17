"""Pure helpers for analytics: UA parsing, IP normalization, bot classification.

All functions here are deterministic and have no DB / IO side-effects so they
can be called from middleware on the hot path.
"""
from __future__ import annotations

import hashlib
import ipaddress
import os
import re
import socket
from datetime import datetime, timezone
from typing import Optional, Tuple
from urllib.parse import urlparse

from ..models.models import VisitorClass


# ---------------------------------------------------------------------------
# IP handling
# ---------------------------------------------------------------------------
LOCALHOST_IPS = {"127.0.0.1", "::1", "0.0.0.0", "localhost"}

_IP_SALT = os.environ.get("LOGICLAB_IP_HASH_SALT", "logiclab-analytics-default-salt")
# When true, the raw IP is replaced with its /24 (v4) or /48 (v6) prefix on write.
ANONYMIZE_IPS = os.environ.get("LOGICLAB_ANONYMIZE_IPS", "0") == "1"


def normalize_ip(raw: Optional[str]) -> Optional[str]:
    """Strip noise, drop port, unwrap brackets, validate, return canonical form."""
    if not raw:
        return None
    s = raw.strip().strip('"').strip("'")
    if not s:
        return None
    if s.startswith("["):
        end = s.find("]")
        if end != -1:
            s = s[1:end]
    elif s.count(":") == 1:
        s = s.split(":", 1)[0]
    try:
        return str(ipaddress.ip_address(s))
    except ValueError:
        return None


def extract_client_ip(headers, fallback_host: Optional[str]) -> str:
    """Resolve the real client IP from proxy headers.

    Order: Cloudflare → X-Real-IP → X-Forwarded-For (left-most public) →
    ASGI client.
    """
    cf = headers.get("cf-connecting-ip") if hasattr(headers, "get") else None
    ip = normalize_ip(cf)
    if ip:
        return ip

    real_ip = headers.get("x-real-ip") if hasattr(headers, "get") else None
    ip = normalize_ip(real_ip)
    if ip:
        return ip

    fwd = headers.get("x-forwarded-for") if hasattr(headers, "get") else None
    if fwd:
        first_parseable: Optional[str] = None
        for candidate in fwd.split(","):
            n = normalize_ip(candidate)
            if not n:
                continue
            if first_parseable is None:
                first_parseable = n
            addr = ipaddress.ip_address(n)
            if not (addr.is_loopback or addr.is_private or addr.is_link_local):
                return n
        if first_parseable:
            return first_parseable

    ip = normalize_ip(fallback_host)
    return ip or "unknown"


def is_localhost(ip: Optional[str], url: Optional[str] = None) -> bool:
    if ip:
        c = ip.strip().lower()
        if c in LOCALHOST_IPS:
            return True
        try:
            addr = ipaddress.ip_address(c)
            if addr.is_loopback or addr.is_unspecified:
                return True
        except ValueError:
            pass
    if url:
        u = url.lower()
        if any(needle in u for needle in ("://localhost", "://127.0.0.1", "://[::1]", "://0.0.0.0")):
            return True
    return False


def anonymize_ip(ip: str) -> str:
    """Return the /24 (v4) or /48 (v6) prefix string.

    Used when LOGICLAB_ANONYMIZE_IPS=1 — preserves uniqueness for stats while
    avoiding storing individual IPs at rest.
    """
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        return ip
    if isinstance(addr, ipaddress.IPv4Address):
        net = ipaddress.ip_network(f"{ip}/24", strict=False)
        return str(net.network_address)
    net = ipaddress.ip_network(f"{ip}/48", strict=False)
    return str(net.network_address)


def hash_ip(ip: str) -> str:
    """Stable SHA-256(ip + salt) — used for unique-visitor counting that is
    safe to store even if raw IPs are dropped."""
    return hashlib.sha256(f"{ip}|{_IP_SALT}".encode("utf-8")).hexdigest()[:32]


def make_session_id(ip: str, user_agent: str, when: Optional[datetime] = None) -> str:
    """Cheap rolling session id = sha256(ip + UA + day-bucket).

    Same client on same day → same session id. Good enough for grouping
    sequential pageviews without cookies, while changing daily for privacy.
    """
    when = when or datetime.now(timezone.utc)
    day_bucket = when.strftime("%Y-%m-%d")
    raw = f"{ip}|{user_agent or ''}|{day_bucket}|{_IP_SALT}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:24]


# ---------------------------------------------------------------------------
# Referrer
# ---------------------------------------------------------------------------
def referrer_host(referrer: Optional[str]) -> str:
    if not referrer:
        return "(direct)"
    try:
        host = urlparse(referrer).hostname or "(direct)"
    except Exception:
        return "(direct)"
    return host.lower()


def normalize_path(page_url: Optional[str], max_len: int = 255) -> Tuple[Optional[str], Optional[str]]:
    """Return (path, query_string) from a full URL or relative path."""
    if not page_url:
        return None, None
    try:
        p = urlparse(page_url)
        path = (p.path or "/")[:max_len]
        qs = (p.query or None)
        if qs and len(qs) > 500:
            qs = qs[:500]
        return path, qs
    except Exception:
        return page_url[:max_len], None


# ---------------------------------------------------------------------------
# User-Agent parsing (pure regex, no third-party dep)
# ---------------------------------------------------------------------------
_BROWSER_PATTERNS = (
    ("Edge",      re.compile(r"Edg(?:e|A|iOS)?/", re.I)),
    ("Opera",     re.compile(r"OPR/|Opera/", re.I)),
    ("Chrome",    re.compile(r"Chrome/", re.I)),  # must come after Edge/Opera
    ("Firefox",   re.compile(r"Firefox/", re.I)),
    ("Safari",    re.compile(r"Safari/", re.I)),  # must come after Chrome
    ("IE",        re.compile(r"(MSIE |Trident/)", re.I)),
)

_OS_PATTERNS = (
    ("Windows",   re.compile(r"Windows NT", re.I)),
    ("Android",   re.compile(r"Android", re.I)),
    ("iOS",       re.compile(r"iPhone|iPad|iPod", re.I)),
    ("macOS",     re.compile(r"Mac OS X|Macintosh", re.I)),
    ("Linux",     re.compile(r"Linux", re.I)),
    ("ChromeOS",  re.compile(r"CrOS", re.I)),
)

_MOBILE_RE = re.compile(r"Mobi|Android|iPhone|iPod|Windows Phone", re.I)
_TABLET_RE = re.compile(r"iPad|Tablet|SM-T", re.I)


def parse_user_agent(ua: Optional[str]) -> Tuple[str, str, str]:
    """Return (browser, os, device_type). Cheap, regex only."""
    if not ua:
        return "Unknown", "Unknown", "unknown"

    browser = "Other"
    for name, pat in _BROWSER_PATTERNS:
        if pat.search(ua):
            browser = name
            break

    os_name = "Other"
    for name, pat in _OS_PATTERNS:
        if pat.search(ua):
            os_name = name
            break

    if _TABLET_RE.search(ua):
        device = "tablet"
    elif _MOBILE_RE.search(ua):
        device = "mobile"
    else:
        device = "desktop"

    return browser, os_name, device


# ---------------------------------------------------------------------------
# Bot classification
# ---------------------------------------------------------------------------
# Verified bots (officially documented UA tokens + reverse-DNS suffixes).
_VERIFIED_BOT_UAS = (
    "googlebot", "google-inspectiontool", "bingbot", "yandexbot", "duckduckbot",
    "baiduspider", "applebot", "facebookexternalhit", "facebot",
    "twitterbot", "linkedinbot", "slackbot", "telegrambot", "whatsapp",
    "discordbot", "pinterest", "redditbot",
)
# Reverse-DNS suffixes that constitute proof of a verified bot.
_VERIFIED_BOT_RDNS = {
    "googlebot":  ("googlebot.com", "google.com"),
    "bingbot":    ("search.msn.com",),
    "yandexbot":  ("yandex.ru", "yandex.net", "yandex.com"),
    "applebot":   ("applebot.apple.com",),
    "facebookexternalhit": ("facebook.com",),
}
# Generic "claims to be a bot" markers.
_BOT_MARKERS = (
    "bot", "spider", "crawler", "lighthouse", "headlesschrome",
    "phantomjs", "python-requests", "curl/", "wget/", "scrapy", "java/",
    "axios", "go-http-client", "okhttp", "node-fetch", "libwww-perl",
)
# Aggressive scrapers / known abusive tooling.
_SUSPICIOUS_UAS = (
    "ahrefsbot", "semrushbot", "mj12bot", "dotbot", "petalbot",
    "seznambot", "blexbot", "serpstatbot", "megaindex",
)


def _reverse_dns(ip: str) -> Optional[str]:
    try:
        host, _, _ = socket.gethostbyaddr(ip)
        return host.lower() if host else None
    except Exception:
        return None


def classify_visitor(
    user_agent: Optional[str],
    ip: Optional[str] = None,
    *,
    verify_rdns: bool = False,
) -> str:
    """Return one of VisitorClass values: human / verified_bot / suspicious_bot.

    `verify_rdns=True` performs a reverse-DNS lookup for the top crawlers
    (Googlebot, Bingbot, etc). This is a blocking syscall — DO NOT enable
    in the request-path middleware; only call it from the rollup job.
    """
    ua = (user_agent or "").lower()

    if any(m in ua for m in _SUSPICIOUS_UAS):
        return VisitorClass.SUSPICIOUS_BOT.value

    for token in _VERIFIED_BOT_UAS:
        if token in ua:
            if verify_rdns and ip:
                host = _reverse_dns(ip)
                if host and any(host.endswith(suffix) for suffix in _VERIFIED_BOT_RDNS.get(token, ())):
                    return VisitorClass.VERIFIED_BOT.value
                # Spoofed UA — looked like Googlebot but rDNS didn't match.
                return VisitorClass.SUSPICIOUS_BOT.value
            return VisitorClass.VERIFIED_BOT.value

    if any(m in ua for m in _BOT_MARKERS):
        return VisitorClass.SUSPICIOUS_BOT.value

    return VisitorClass.HUMAN.value


# ---------------------------------------------------------------------------
# Excluded paths (never tracked)
# ---------------------------------------------------------------------------
_EXCLUDED_PREFIXES = (
    "/uploads/", "/static/", "/health", "/openapi.json",
    "/api/visits/track",  # avoid recording the tracking call itself
    "/api/health",
)


def should_skip_path(path: Optional[str]) -> bool:
    if not path:
        return True
    for p in _EXCLUDED_PREFIXES:
        if path.startswith(p):
            return True
    return False
