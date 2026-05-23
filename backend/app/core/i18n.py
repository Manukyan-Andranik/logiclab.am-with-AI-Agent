"""Helpers for multilingual JSON title fields stored in the DB."""


def localized_label(value) -> str:
    """Pick hy → en → ru, then any other value; coerce to a plain string."""
    if value is None:
        return ""
    if isinstance(value, dict):
        for lang in ("hy", "en", "ru"):
            v = (value.get(lang) or "").strip()
            if v:
                return v
        for v in value.values():
            if v:
                return str(v).strip()
        return ""
    return str(value).strip()
