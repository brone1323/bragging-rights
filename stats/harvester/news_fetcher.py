"""
Sports news fetcher and optional LLM rewriter.
Pulls headlines from ESPN RSS; optionally rewrites summaries for ethical use.
"""

import html
import hashlib
import logging
from datetime import datetime
from typing import Optional

import feedparser

from config import ESPN_RSS_FEEDS, OPENAI_API_KEY

logger = logging.getLogger(__name__)


def _rewrite_article_with_llm(title: str, summary: str) -> Optional[tuple[str, str]]:
    """
    Fully rewrite a sports news item into a standalone article.
    Returns (rewritten_title, rewritten_body) or None if no API key or on error.
    """
    if not OPENAI_API_KEY:
        return None
    combined = f"Headline: {title}\n\nSummary: {summary}"
    if not combined.strip():
        return None
    try:
        try:
            from openai import OpenAI
        except ImportError:
            logger.warning("openai package not installed; run pip install openai for LLM rewrite")
            return None

        client = OpenAI(api_key=OPENAI_API_KEY)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a sports journalist. Rewrite the following news into a standalone article. "
                        "Write a substantive paragraph of 3-5 sentences that covers the key facts. Do not be brief.\n"
                        "Output EXACTLY in this format:\n"
                        "HEADLINE:\n[your new headline]\n\nBODY:\n[One full paragraph, 3-5 sentences, fully rewritten in your own words. Use all facts from the source. No links, no attribution.]"
                    ),
                },
                {"role": "user", "content": combined[:2000]},
            ],
            max_tokens=350,
        )
        raw = (response.choices[0].message.content or "").strip()
        if not raw:
            return None

        rewritten_title = title
        rewritten_body = raw

        if "BODY:" in raw:
            parts = raw.split("BODY:", 1)
            headline_block = parts[0].strip()
            rewritten_title = headline_block.replace("HEADLINE:", "").strip().split("\n")[0].strip()
            rewritten_body = parts[1].strip()
        elif "HEADLINE:" in raw:
            rest = raw.split("HEADLINE:", 1)[1].strip()
            first_line = rest.split("\n")[0].strip()
            rewritten_title = first_line if first_line else title
            rewritten_body = "\n\n".join(rest.split("\n")[1:]).strip() if "\n" in rest else summary
        else:
            lines = raw.strip().split("\n")
            rewritten_title = lines[0].strip() if lines else title
            rewritten_body = "\n\n".join(lines[1:]).strip() if len(lines) > 1 else (lines[0] if lines else raw)

        return (rewritten_title or title, rewritten_body or summary)
    except Exception as e:
        logger.warning("LLM rewrite failed: %s", e)
        return None


def _extract_summary(entry) -> str:
    """Extract summary or description from feed entry."""
    summary = getattr(entry, "summary", None) or getattr(entry, "description", None)
    if not summary:
        return ""
    # Strip HTML tags (simple approach)
    text = html.unescape(summary)
    for tag in ("<", ">"):
        while tag in text:
            start = text.find("<")
            if start < 0:
                break
            end = text.find(">", start) + 1
            if end > 0:
                text = text[:start] + " " + text[end:]
            else:
                break
    return " ".join(text.split())


def _id_from_entry(entry, league_id: str) -> str:
    """Generate stable ID for deduplication."""
    link = getattr(entry, "link", "") or ""
    title = getattr(entry, "title", "") or ""
    raw = f"{league_id}:{link}:{title}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


def fetch_league_news(
    league_id: str,
    limit: int = 15,
    rewrite: bool = True,
) -> list[dict]:
    """
    Fetch news from ESPN RSS for a league.
    Returns list of items with title, link, summary, rewritten_summary (if rewrite enabled).
    """
    feed_url = ESPN_RSS_FEEDS.get(league_id)
    if not feed_url:
        return []

    try:
        feed = feedparser.parse(feed_url)
    except Exception as e:
        logger.error("RSS fetch failed for %s: %s", league_id, e)
        return []

    items = []
    for entry in feed.entries[:limit]:
        title = html.unescape(getattr(entry, "title", "") or "")
        link = getattr(entry, "link", "") or ""
        published = getattr(entry, "published_parsed", None)
        pub_date = datetime(*published[:6]).isoformat() if published else None

        summary = _extract_summary(entry)
        rewritten_title = None
        rewritten_body = None
        if rewrite and (title or summary):
            result = _rewrite_article_with_llm(title, summary)
            if result:
                rewritten_title, rewritten_body = result

        items.append({
            "id": _id_from_entry(entry, league_id),
            "title": title,
            "summary": summary,
            "rewritten_title": rewritten_title,
            "rewritten_body": rewritten_body,
            "published": pub_date,
        })

    return items


def fetch_all_news(limit_per_league: int = 10, rewrite: bool = True) -> dict[str, list[dict]]:
    """Fetch news for all leagues. Returns league_id -> list of items."""
    result = {}
    for league_id in ESPN_RSS_FEEDS:
        result[league_id] = fetch_league_news(league_id, limit=limit_per_league, rewrite=rewrite)
    return result
