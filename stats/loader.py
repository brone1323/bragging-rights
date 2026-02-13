"""
Data loader for website consumption.
Import this module to load harvested sports statistics.
"""

import json
from pathlib import Path
from typing import Any, Optional

from config import DATA_DIR


def get_data_dir(base_path: Optional[Path] = None) -> Path:
    """Get the data directory path."""
    return Path(base_path or DATA_DIR)


def load_league_data(
    league_id: str,
    data_type: str,
    data_dir: Optional[Path] = None,
) -> Optional[dict]:
    """
    Load harvested data for a league.
    Returns the full payload including harvested_at timestamp and data.

    Example:
        result = load_league_data("nba", "teams")
        teams = result["data"] if result else []
    """
    base = get_data_dir(data_dir)
    path = base / league_id / f"{data_type}.json"
    if not path.exists():
        return None
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def load_teams(league_id: str, data_dir: Optional[Path] = None) -> list[dict]:
    """Load teams for a league. Returns list of team objects."""
    payload = load_league_data(league_id, "teams", data_dir)
    if not payload:
        return []
    data = payload.get("data", {})
    teams = []
    for sport in data.get("sports", []):
        for league in sport.get("leagues", []):
            for item in league.get("teams", []):
                if "team" in item:
                    teams.append(item["team"])
    return teams


def load_standings(league_id: str, data_dir: Optional[Path] = None) -> Optional[dict]:
    """Load standings for a league."""
    payload = load_league_data(league_id, "standings", data_dir)
    return payload.get("data") if payload else None


def load_scoreboard(league_id: str, data_dir: Optional[Path] = None) -> Optional[dict]:
    """Load latest scoreboard (games) for a league."""
    payload = load_league_data(league_id, "scoreboard", data_dir)
    return payload.get("data") if payload else None


def load_schedule(league_id: str, data_dir: Optional[Path] = None) -> Optional[dict]:
    """Load schedule for a league."""
    payload = load_league_data(league_id, "schedule", data_dir)
    return payload.get("data") if payload else None


def load_game_summary(
    league_id: str, event_id: str, data_dir: Optional[Path] = None
) -> Optional[dict]:
    """Load game summary (box score, stats) for a specific game by event ID."""
    payload = load_league_data(league_id, f"summary_{event_id}", data_dir)
    return payload.get("data") if payload else None


def load_summaries_today(league_id: str, data_dir: Optional[Path] = None) -> list[str]:
    """Load list of event IDs for today's harvested game summaries."""
    payload = load_league_data(league_id, "summaries_today", data_dir)
    if not payload:
        return []
    return payload.get("data", {}).get("event_ids", [])


def load_all_leagues(data_type: str, data_dir: Optional[Path] = None) -> dict[str, Any]:
    """Load data type for all leagues. Returns league_id -> data."""
    base = get_data_dir(data_dir)
    result = {}
    for league_dir in base.iterdir():
        if league_dir.is_dir():
            payload = load_league_data(league_dir.name, data_type, data_dir)
            if payload:
                result[league_dir.name] = payload.get("data", payload)
    return result


def load_news(league_id: str, data_dir: Optional[Path] = None) -> list[dict]:
    """Load harvested news for a league. Returns list of news items."""
    payload = load_league_data(league_id, "news", data_dir)
    if not payload:
        return []
    data = payload.get("data", payload)
    return data if isinstance(data, list) else data.get("items", [])
