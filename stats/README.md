# Sports Statistics Harvester

A Python application that harvests sports statistics from **NBA**, **NHL**, **NFL**, and **MLB** for use on websites. Data is stored as JSON (and optionally SQLite) in a structure ready for frontend consumption.

## Features

- **Free & No API Key**: Uses ESPN's public API (no authentication required)
- **Four Leagues**: NBA, NHL, NFL, MLB
- **Data Types**:
  - **Teams** – Rosters, logos, colors, links
  - **Standings** – Division/conference standings
  - **Scoreboard** – Games, scores, schedules
  - **Schedule** – Upcoming and past games
  - **Game summary** – Box scores, player stats, play-by-play for individual games
- **Website-Ready Output**: JSON files organized by league, easy to load via fetch/import

## Installation

```bash
cd projects/stats
pip install -r requirements.txt
```

## Usage

### Harvest All Leagues (teams, standings, today's scoreboard)

```bash
python main.py
```

### Harvest Specific Leagues

```bash
python main.py --leagues nba nhl
```

### Harvest Specific Data Types

```bash
python main.py --types teams standings scoreboard schedule
```

### Harvest Scoreboard for a Date Range

```bash
python main.py --types scoreboard --days 7
```

### Harvest for a Specific Date

```bash
python main.py --types scoreboard --date 20250201
```

### Harvest Game Summaries (Box Scores)

```bash
python main.py --types game_summary
# Or a specific game by event ID:
python main.py --types game_summary --event 401704974 --leagues nba
```

### Harvest Sports News (ESPN RSS + Optional LLM Rewrite)

```bash
# Raw RSS only:
python main.py --types news --no-rewrite

# With LLM rewrite (set OPENAI_API_KEY first):
export OPENAI_API_KEY=sk-...
python main.py --types news
```

### Save to SQLite (for backend queries)

```bash
python main.py --sqlite
```

### Full Options

```
python main.py --help
```

## Output Structure

```
data/
├── nba/
│   ├── teams.json
│   ├── standings.json
│   ├── scoreboard.json
│   └── schedule.json
├── nhl/
│   └── ...
├── nfl/
│   └── ...
├── mlb/
│   └── ...
└── stats.db          # if --sqlite
```

Each JSON file includes:

- `league` – League ID
- `data_type` – Type of data
- `harvested_at` – ISO timestamp
- `data` – The actual stats from ESPN

## Using Data in Your Website

### Option 1: Load from JSON (Node/Python/any backend)

```python
from loader import load_teams, load_scoreboard, load_standings

# Load NBA teams
teams = load_teams("nba")

# Load today's NHL scoreboard
games = load_scoreboard("nhl")

# Load MLB standings
standings = load_standings("mlb")
```

### Option 2: Static JSON files

If your site is static, point your frontend to the `data/` directory and fetch files:

```
GET /data/nba/teams.json
GET /data/nfl/scoreboard.json
```

### Option 3: SQLite

Use `--sqlite` and query `harvests` table:

```sql
SELECT data_json FROM harvests WHERE league = 'nba' AND data_type = 'teams';
```

## Web Interface

View harvested data in a browser:

```bash
python serve.py
```

Then open **http://localhost:5000** to browse teams, standings, scoreboard, and schedule by league.

- **Auto-harvest every 15 mins** – Data refreshes automatically while the server runs
- **Click any matchup** on the scoreboard → Team stats comparison (PPG, RPG, FG%, etc.)
- **Click any team** → Team page with record, stats, and roster
- **Click any player** → Player page with stats and **league rankings** (e.g. "9th in PPG")
- **News** – ESPN RSS headlines; optional LLM rewrite for ethical use (set `OPENAI_API_KEY`)
- Use **Previous/Next season** on team and player pages for historical data

## Scheduling (Cron / Task Scheduler)

To keep data fresh, run the harvester on a schedule:

**Linux/Mac (cron)**:
```cron
0 * * * * cd /path/to/stats && python main.py
```

**Windows Task Scheduler**: Create a task that runs `python main.py` hourly.

## Requirements

- Python 3.10+
- `requests`
