"""
Configuration for the sports statistics harvester.
"""

import os
from pathlib import Path

# ESPN API base URLs (no API key required)
ESPN_BASE_URL = "https://site.api.espn.com/apis/site/v2/sports"
ESPN_CORE_URL = "https://sports.core.api.espn.com/v2/sports"

# ESPN RSS feeds for sports news (league_id -> feed URL)
ESPN_RSS_FEEDS = {
    "nba": "https://www.espn.com/espn/rss/nba/news",
    "nfl": "https://www.espn.com/espn/rss/nfl/news",
    "nhl": "https://www.espn.com/espn/rss/nhl/news",
    "mlb": "https://www.espn.com/espn/rss/mlb/news",
}

# Optional: OpenAI API key for rewriting headlines (set OPENAI_API_KEY env var)
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")

# League configurations: sport/league path for ESPN API
LEAGUES = {
    "nba": {"sport": "basketball", "league": "nba", "name": "NBA"},
    "nhl": {"sport": "hockey", "league": "nhl", "name": "NHL"},
    "nfl": {"sport": "football", "league": "nfl", "name": "NFL"},
    "mlb": {"sport": "baseball", "league": "mlb", "name": "MLB"},
}

# Data types to harvest
DATA_TYPES = ["teams", "standings", "scoreboard", "schedule", "game_summary"]

# Default output directory for harvested data (website-consumable)
DATA_DIR = Path(__file__).parent / "data"

# Request settings
REQUEST_TIMEOUT = 30
REQUEST_DELAY = 0.5  # Seconds between requests to be respectful to API
