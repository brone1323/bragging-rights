"""
Sports Statistics Harvester - Main entry point.
Harvests NBA, NHL, NFL, MLB stats for website consumption.
"""

import argparse
import logging
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from config import DATA_DIR, LEAGUES
from harvester.espn_harvester import ESPNHarvester
from storage import StatsStorage


def setup_logging(verbose: bool = False) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


def run_harvest(
    leagues: list[str] | None = None,
    types: list[str] | None = None,
    output: Path | None = None,
    quiet: bool = False,
) -> int:
    """Run harvest programmatically. Returns number of files saved."""
    from storage import StatsStorage

    leagues = leagues or list(LEAGUES.keys())
    types = types or ["teams", "standings", "scoreboard", "schedule"]
    output = output or DATA_DIR
    if quiet:
        logging.getLogger().setLevel(logging.WARNING)

    harvester = ESPNHarvester(data_dir=output)
    storage = StatsStorage(data_dir=output)
    date = datetime.now()
    total_saved = 0

    def get_season_year(league_id: str) -> int:
        """ESPN uses season start year. NBA/NHL start Oct, NFL Sep, MLB Apr."""
        y, m = date.year, date.month
        if league_id in ("nba", "nhl"):
            return y if m >= 10 else y - 1  # Season starts Oct
        if league_id == "nfl":
            return y if m >= 9 else y - 1  # Season starts Sep
        if league_id == "mlb":
            return y if m >= 4 else y - 1  # Season starts Apr
        return y

    for league_id in leagues:
        if "teams" in types:
            data = harvester.harvest_teams(league_id)
            if data:
                storage.save_json(league_id, "teams", data)
                total_saved += 1

        if "standings" in types:
            season = get_season_year(league_id)
            data = harvester.harvest_standings(league_id, season)
            if data:
                storage.save_json(league_id, "standings", data)
                total_saved += 1

        if "schedule" in types:
            season = get_season_year(league_id)
            data = harvester.harvest_schedule(league_id, season)
            if data:
                storage.save_json(league_id, "schedule", data)
                total_saved += 1

    if "scoreboard" in types:
        for league_id in leagues:
            data = harvester.harvest_scoreboard(league_id, date)
            if data:
                date_str = date.strftime("%Y%m%d")
                storage.save_json(league_id, f"scoreboard_{date_str}", data)
                storage.save_json(league_id, "scoreboard", data)
                total_saved += 1

    if "news" in types:
        from harvester.news_fetcher import fetch_all_news

        all_news = fetch_all_news(limit_per_league=15, rewrite=True)
        for league_id, items in all_news.items():
            if items:
                storage.save_json(league_id, "news", items)
                total_saved += 1

    return total_saved


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Harvest sports statistics from NBA, NHL, NFL, MLB for website use."
    )
    parser.add_argument(
        "--leagues",
        nargs="+",
        choices=list(LEAGUES.keys()),
        default=list(LEAGUES.keys()),
        help="Leagues to harvest (default: all)",
    )
    parser.add_argument(
        "--types",
        nargs="+",
        choices=["teams", "standings", "scoreboard", "schedule", "game_summary", "news"],
        default=["teams", "standings", "scoreboard"],
        help="Data types to harvest (default: teams, standings, scoreboard)",
    )
    parser.add_argument(
        "--date",
        type=str,
        default=None,
        help="Date for scoreboard (YYYYMMDD). Default: today",
    )
    parser.add_argument(
        "--season",
        type=int,
        default=None,
        help="Season year for standings/schedule (default: current year)",
    )
    parser.add_argument(
        "--days",
        type=int,
        default=0,
        help="Harvest scoreboard for N days (0=today only)",
    )
    parser.add_argument(
        "--output",
        "-o",
        type=Path,
        default=DATA_DIR,
        help=f"Output directory (default: {DATA_DIR})",
    )
    parser.add_argument(
        "--sqlite",
        action="store_true",
        help="Also save to SQLite database",
    )
    parser.add_argument(
        "--event",
        type=str,
        help="Harvest a specific game summary by event ID (requires --types game_summary)",
    )
    parser.add_argument(
        "--max-summaries",
        type=int,
        default=10,
        help="Max game summaries to harvest per league when using game_summary (default: 10)",
    )
    parser.add_argument(
        "--no-rewrite",
        action="store_true",
        help="Skip LLM rewrite when harvesting news (store raw RSS only)",
    )
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Verbose output",
    )

    args = parser.parse_args()
    setup_logging(args.verbose)

    harvester = ESPNHarvester(data_dir=args.output)
    storage = StatsStorage(data_dir=args.output)

    date = datetime.now()
    if args.date:
        try:
            date = datetime.strptime(args.date, "%Y%m%d")
        except ValueError:
            logging.error("Invalid date format. Use YYYYMMDD")
            sys.exit(1)

    season = args.season or date.year
    total_saved = 0

    for league_id in args.leagues:
        # Teams
        if "teams" in args.types:
            data = harvester.harvest_teams(league_id)
            if data:
                storage.save_json(league_id, "teams", data)
                if args.sqlite:
                    storage.save_to_sqlite(league_id, "teams", data)
                total_saved += 1
                print(f"  Saved: {league_id}/teams.json")

        # Standings
        if "standings" in args.types:
            data = harvester.harvest_standings(league_id, season)
            if data:
                storage.save_json(league_id, "standings", data)
                if args.sqlite:
                    storage.save_to_sqlite(league_id, "standings", data)
                total_saved += 1
                print(f"  Saved: {league_id}/standings.json")

        # Schedule
        if "schedule" in args.types:
            data = harvester.harvest_schedule(league_id, season)
            if data:
                storage.save_json(league_id, "schedule", data)
                if args.sqlite:
                    storage.save_to_sqlite(league_id, "schedule", data)
                total_saved += 1
                print(f"  Saved: {league_id}/schedule.json")

    # Scoreboard - single date or date range
    if "scoreboard" in args.types:
        if args.days <= 0:
            for league_id in args.leagues:
                data = harvester.harvest_scoreboard(league_id, date)
                if data:
                    date_str = date.strftime("%Y%m%d")
                    storage.save_json(league_id, f"scoreboard_{date_str}", data)
                    storage.save_json(league_id, "scoreboard", data)  # current
                    if args.sqlite:
                        storage.save_to_sqlite(league_id, f"scoreboard_{date_str}", data)
                    total_saved += 1
                    print(f"  Saved: {league_id}/scoreboard.json ({date_str})")
        else:
            end_date = date + timedelta(days=args.days)
            for league_id in args.leagues:
                results = harvester.harvest_date_range(league_id, date, end_date)
                for i, data in enumerate(results):
                    d = date + timedelta(days=i)
                    date_str = d.strftime("%Y%m%d")
                    storage.save_json(league_id, f"scoreboard_{date_str}", data)
                    if args.sqlite:
                        storage.save_to_sqlite(league_id, f"scoreboard_{date_str}", data)
                    total_saved += 1
                # Latest as current scoreboard
                if results:
                    storage.save_json(league_id, "scoreboard", results[-1])
                print(f"  Saved: {league_id}/scoreboard ({len(results)} days)")

    # Game summaries (box scores, play-by-play) - per game or from today's scoreboard
    if "game_summary" in args.types:
        for league_id in args.leagues:
            if args.event:
                data = harvester.harvest_game_summary(league_id, args.event)
                if data:
                    storage.save_json(league_id, f"summary_{args.event}", data)
                    total_saved += 1
                    print(f"  Saved: {league_id}/summary_{args.event}.json")
            else:
                summaries = harvester.harvest_game_summaries_from_scoreboard(
                    league_id, date, max_games=args.max_summaries
                )
                event_ids = []
                for event_id, summary in summaries:
                    storage.save_json(league_id, f"summary_{event_id}", summary)
                    total_saved += 1
                    event_ids.append(event_id)
                if event_ids:
                    storage.save_json(
                        league_id,
                        "summaries_today",
                        {"event_ids": event_ids},
                    )
                    print(f"  Saved: {league_id} ({len(summaries)} game summaries)")

    # News (ESPN RSS + optional LLM rewrite)
    if "news" in args.types:
        from config import OPENAI_API_KEY
        from harvester.news_fetcher import fetch_all_news

        rewrite = not args.no_rewrite
        if rewrite and not OPENAI_API_KEY:
            print("  Note: OPENAI_API_KEY not set — storing raw RSS only. Set the env var for LLM rewrite.")
        all_news = fetch_all_news(limit_per_league=15, rewrite=rewrite)
        for league_id in args.leagues:
            items = all_news.get(league_id, [])
            if items:
                storage.save_json(league_id, "news", items)
                total_saved += 1
                print(f"  Saved: {league_id}/news.json ({len(items)} items, rewrite={rewrite})")

    print(f"\nHarvest complete. {total_saved} files saved to {args.output}")
    print("Data is ready for website consumption.")


if __name__ == "__main__":
    main()
