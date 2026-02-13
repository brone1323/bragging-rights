"""
ESPN API harvester for NBA, NHL, NFL, and MLB statistics.
Uses undocumented ESPN API - no authentication required.
"""

import json
import logging
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Optional

import requests

from config import (
    ESPN_BASE_URL,
    ESPN_CORE_URL,
    LEAGUES,
    REQUEST_DELAY,
    REQUEST_TIMEOUT,
)

logger = logging.getLogger(__name__)


class ESPNHarvester:
    """Harvests sports statistics from ESPN API for all major US leagues."""

    def __init__(self, data_dir: Optional[Path] = None):
        self.base_url = ESPN_BASE_URL
        self.data_dir = data_dir or Path(__file__).parent.parent / "data"
        self.session = requests.Session()
        self.session.headers.update(
            {
                "User-Agent": "SportsStatsHarvester/1.0 (Website Builder)",
                "Accept": "application/json",
            }
        )

    def _fetch(self, url: str) -> Optional[dict[str, Any]]:
        """Fetch JSON from URL with error handling."""
        try:
            response = self.session.get(url, timeout=REQUEST_TIMEOUT)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error("Request failed for %s: %s", url, e)
            return None
        except json.JSONDecodeError as e:
            logger.error("Invalid JSON from %s: %s", url, e)
            return None

    def _get_league_path(self, league_id: str) -> str:
        """Get sport/league path for ESPN API."""
        if league_id not in LEAGUES:
            raise ValueError(f"Unknown league: {league_id}. Use: {list(LEAGUES.keys())}")
        cfg = LEAGUES[league_id]
        return f"{cfg['sport']}/{cfg['league']}"

    def harvest_teams(self, league_id: str) -> Optional[dict]:
        """Harvest all teams for a league."""
        path = self._get_league_path(league_id)
        url = f"{self.base_url}/{path}/teams"
        logger.info("Harvesting teams for %s", league_id.upper())
        data = self._fetch(url)
        time.sleep(REQUEST_DELAY)
        return data

    def harvest_standings(self, league_id: str, season: Optional[int] = None) -> Optional[dict]:
        """Harvest standings for a league."""
        path = self._get_league_path(league_id)
        url = f"{self.base_url}/{path}/standings"
        if season:
            url += f"?season={season}"
        logger.info("Harvesting standings for %s (season=%s)", league_id.upper(), season)
        data = self._fetch(url)
        time.sleep(REQUEST_DELAY)
        return data

    def harvest_scoreboard(
        self, league_id: str, date: Optional[datetime] = None
    ) -> Optional[dict]:
        """Harvest scoreboard (games) for a league on a given date."""
        path = self._get_league_path(league_id)
        url = f"{self.base_url}/{path}/scoreboard"
        if date:
            date_str = date.strftime("%Y%m%d")
            url += f"?dates={date_str}"
        logger.info("Harvesting scoreboard for %s (date=%s)", league_id.upper(), date)
        data = self._fetch(url)
        time.sleep(REQUEST_DELAY)
        return data

    def harvest_schedule(
        self,
        league_id: str,
        season: Optional[int] = None,
        limit: int = 100,
    ) -> Optional[dict]:
        """Harvest schedule for a league. Uses scoreboard endpoint - ESPN returns 500 with season param, so we omit it."""
        path = self._get_league_path(league_id)
        url = f"{self.base_url}/{path}/scoreboard?limit={limit}"
        logger.info("Harvesting schedule for %s", league_id.upper())
        data = self._fetch(url)
        time.sleep(REQUEST_DELAY)
        return data

    def harvest_game_summary(
        self, league_id: str, event_id: str
    ) -> Optional[dict]:
        """Harvest game summary (box score, play-by-play, stats) for a single game."""
        path = self._get_league_path(league_id)
        url = f"{self.base_url}/{path}/summary?event={event_id}"
        logger.info("Harvesting game summary for %s event %s", league_id.upper(), event_id)
        data = self._fetch(url)
        time.sleep(REQUEST_DELAY)
        return data

    def harvest_game_summaries_from_scoreboard(
        self,
        league_id: str,
        date: Optional[datetime] = None,
        max_games: int = 20,
    ) -> list[tuple[str, dict]]:
        """Harvest summaries for all games on a scoreboard. Returns list of (event_id, summary)."""
        scoreboard = self.harvest_scoreboard(league_id, date)
        if not scoreboard:
            return []
        events = scoreboard.get("events", [])
        result = []
        for event in events[:max_games]:
            event_id = event.get("id")
            if event_id:
                event_id_str = str(event_id)
                summary = self.harvest_game_summary(league_id, event_id_str)
                if summary:
                    result.append((event_id_str, summary))
        return result

    def fetch_team_detail(
        self, league_id: str, team_id: str, season: Optional[int] = None
    ) -> Optional[dict]:
        """Fetch team detail with roster and record (live, not harvested)."""
        path = self._get_league_path(league_id)
        url = f"{self.base_url}/{path}/teams/{team_id}?enable=roster,stats"
        if season:
            url += f"&season={season}"
        return self._fetch(url)

    def fetch_team_statistics(
        self, league_id: str, team_id: str, season: Optional[int] = None
    ) -> Optional[dict]:
        """Fetch team statistics with full stat breakdown (live)."""
        path = self._get_league_path(league_id)
        url = f"{self.base_url}/{path}/teams/{team_id}/statistics"
        if season:
            url += f"?season={season}"
        return self._fetch(url)

    def fetch_athlete_info(
        self, league_id: str, player_id: str, season: Optional[int] = None
    ) -> Optional[dict]:
        """Fetch athlete/player info (name, headshot, team, etc.) from sports.core."""
        if league_id not in LEAGUES:
            return None
        cfg = LEAGUES[league_id]
        sport = cfg["sport"]
        league = cfg["league"]
        season = season or datetime.now().year
        url = f"{ESPN_CORE_URL}/{sport}/leagues/{league}/seasons/{season}/athletes/{player_id}"
        return self._fetch(url)

    def fetch_player_statistics(
        self,
        league_id: str,
        player_id: str,
        season: Optional[int] = None,
        season_type: int = 2,
    ) -> Optional[dict]:
        """Fetch player stats with league rankings from sports.core API (live)."""
        if league_id not in LEAGUES:
            return None
        cfg = LEAGUES[league_id]
        sport = cfg["sport"]
        league = cfg["league"]
        season = season or datetime.now().year
        url = f"{ESPN_CORE_URL}/{sport}/leagues/{league}/seasons/{season}/types/{season_type}/athletes/{player_id}/statistics"
        return self._fetch(url)

    def harvest_date_range(
        self,
        league_id: str,
        start_date: datetime,
        end_date: datetime,
    ) -> list[dict]:
        """Harvest scoreboards for a date range."""
        results = []
        current = start_date
        while current <= end_date:
            data = self.harvest_scoreboard(league_id, current)
            if data:
                results.append(data)
            current += timedelta(days=1)
        return results

    def harvest_all_leagues(
        self,
        data_types: list[str] | None = None,
        date: Optional[datetime] = None,
        season: Optional[int] = None,
    ) -> dict[str, dict[str, Any]]:
        """
        Harvest specified data types for all leagues.
        Returns dict: league_id -> data_type -> data
        """
        data_types = data_types or ["teams", "standings", "scoreboard"]
        date = date or datetime.now()
        all_data: dict[str, dict[str, Any]] = {}

        for league_id in LEAGUES:
            all_data[league_id] = {}
            league_season = season or date.year

            if "teams" in data_types:
                data = self.harvest_teams(league_id)
                if data:
                    all_data[league_id]["teams"] = data

            if "standings" in data_types:
                data = self.harvest_standings(league_id, league_season)
                if data:
                    all_data[league_id]["standings"] = data

            if "scoreboard" in data_types:
                data = self.harvest_scoreboard(league_id, date)
                if data:
                    all_data[league_id]["scoreboard"] = data

            if "schedule" in data_types:
                data = self.harvest_schedule(league_id, league_season)
                if data:
                    all_data[league_id]["schedule"] = data

        return all_data
