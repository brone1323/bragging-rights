"""
Storage layer for harvested sports statistics.
Saves data as JSON files for easy consumption by websites.
"""

import json
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

from config import DATA_DIR


class StatsStorage:
    """Stores harvested stats as JSON (website-friendly) and optionally SQLite."""

    def __init__(self, data_dir: Optional[Path] = None):
        self.data_dir = Path(data_dir or DATA_DIR)
        self.data_dir.mkdir(parents=True, exist_ok=True)

    def _league_dir(self, league_id: str) -> Path:
        """Get or create league-specific directory."""
        path = self.data_dir / league_id
        path.mkdir(parents=True, exist_ok=True)
        return path

    def save_json(
        self,
        league_id: str,
        data_type: str,
        data: Any,
        timestamp: Optional[datetime] = None,
    ) -> Path:
        """
        Save harvested data as JSON file.
        Structure: data/{league}/{data_type}.json
        Also saves timestamped copy: data/{league}/{data_type}_{timestamp}.json
        """
        league_dir = self._league_dir(league_id)
        timestamp = timestamp or datetime.now()
        ts_str = timestamp.strftime("%Y%m%d_%H%M%S")

        # Always write the "current" file (latest harvest)
        current_path = league_dir / f"{data_type}.json"
        payload = {
            "league": league_id,
            "data_type": data_type,
            "harvested_at": timestamp.isoformat(),
            "data": data,
        }
        with open(current_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2, ensure_ascii=False)

        # Archive copy for base types only (skip dated/summary types)
        base_types = ("teams", "standings", "scoreboard", "schedule")
        if data_type in base_types and not data_type.startswith("summary_"):
            archive_path = league_dir / f"{data_type}_{ts_str}.json"
            with open(archive_path, "w", encoding="utf-8") as f:
                json.dump(payload, f, indent=2, ensure_ascii=False)

        return current_path

    def load_json(self, league_id: str, data_type: str) -> Optional[dict]:
        """Load most recent harvested data for a league."""
        path = self.data_dir / league_id / f"{data_type}.json"
        if not path.exists():
            return None
        with open(path, encoding="utf-8") as f:
            return json.load(f)

    def save_to_sqlite(
        self,
        league_id: str,
        data_type: str,
        data: Any,
        timestamp: Optional[datetime] = None,
    ) -> Path:
        """
        Save to SQLite for structured querying.
        Useful for website backends that need SQL access.
        """
        db_path = self.data_dir / "stats.db"
        timestamp = timestamp or datetime.now()

        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        try:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS harvests (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    league TEXT NOT NULL,
                    data_type TEXT NOT NULL,
                    harvested_at TEXT NOT NULL,
                    data_json TEXT NOT NULL,
                    UNIQUE(league, data_type)
                )
            """)
            conn.execute(
                """
                INSERT OR REPLACE INTO harvests (league, data_type, harvested_at, data_json)
                VALUES (?, ?, ?, ?)
                """,
                (league_id, data_type, timestamp.isoformat(), json.dumps(data)),
            )
            conn.commit()
        finally:
            conn.close()

        return db_path

    def get_website_data_path(self) -> Path:
        """Return the data directory path for website consumption."""
        return self.data_dir
