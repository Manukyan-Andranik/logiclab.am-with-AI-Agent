"""
Re-canonicalize ip_address values in the `visits` table using the same
normalization rules as the live tracker (visits.py:_normalize_ip).

Run:
    python -m backend.scripts.backfill_visit_ips           # apply changes
    python -m backend.scripts.backfill_visit_ips --dry-run # preview only

Safe to run multiple times: rows already in canonical form are skipped.
Localhost / loopback / unspecified rows that slipped through old code are
deleted so they don't pollute "unique visitor" counts.
"""
from __future__ import annotations

import argparse
import ipaddress
import sys
from typing import Optional

# Make `app` importable when invoked as a script from the backend dir.
sys.path.insert(0, __file__.rsplit("/scripts/", 1)[0])

from app.core.database import SessionLocal  # type: ignore
from app.models.models import Visit  # type: ignore


def normalize_ip(raw: Optional[str]) -> Optional[str]:
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


def is_local(ip_str: str) -> bool:
    try:
        addr = ipaddress.ip_address(ip_str)
    except ValueError:
        return False
    return addr.is_loopback or addr.is_unspecified


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--batch-size", type=int, default=1000)
    args = parser.parse_args()

    db = SessionLocal()
    updated = 0
    deleted = 0
    unparseable = 0
    scanned = 0

    try:
        last_id = 0
        while True:
            batch = (
                db.query(Visit)
                .filter(Visit.id > last_id)
                .order_by(Visit.id.asc())
                .limit(args.batch_size)
                .all()
            )
            if not batch:
                break

            for v in batch:
                scanned += 1
                last_id = v.id
                original = v.ip_address or ""
                canonical = normalize_ip(original)

                if canonical is None:
                    unparseable += 1
                    continue

                if is_local(canonical):
                    deleted += 1
                    if not args.dry_run:
                        db.delete(v)
                    continue

                if canonical != original:
                    updated += 1
                    if not args.dry_run:
                        v.ip_address = canonical

            if not args.dry_run:
                db.commit()

        verb = "would" if args.dry_run else ""
        print(f"scanned     : {scanned}")
        print(f"{'rewrites    ' if not args.dry_run else 'would rewrite'}: {updated}")
        print(f"{'deleted     ' if not args.dry_run else 'would delete '}: {deleted}  (loopback/unspecified)")
        print(f"unparseable : {unparseable}  (left untouched)")
    finally:
        db.close()


if __name__ == "__main__":
    main()
