"""
Sports Stats Web Server - Browse harvested data.
Run: python serve.py
Open: http://localhost:5000
Harvests data every 15 mins when server is running.

API endpoints (JSON) for Bragging Rights integration:
  GET /api/<league>/scoreboard
  GET /api/<league>/teams
  GET /api/<league>/standings
  GET /api/<league>/schedule
  GET /api/<league>/matchup/<event_id>
"""

import sys
import threading
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from datetime import datetime

from flask import Flask, render_template, abort, request, jsonify, Response
from io import BytesIO
from config import DATA_DIR, LEAGUES
from loader import (
    load_teams,
    load_standings,
    load_scoreboard,
    load_schedule,
    load_news,
)
from harvester.espn_harvester import ESPNHarvester

app = Flask(__name__, template_folder="templates", static_folder="static")

# CORS for Bragging Rights (and other cross-origin consumers)
@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response

harvester = ESPNHarvester()

# Harvest scheduler (runs every 15 mins when server is up)
def _scheduled_harvest_job():
    import main
    try:
        n = main.run_harvest(quiet=True)
        app.logger.info("Scheduled harvest: %d files saved", n)
    except Exception as e:
        app.logger.warning("Scheduled harvest failed: %s", e)


def _run_scheduler():
    import schedule
    import time
    schedule.every(15).minutes.do(_scheduled_harvest_job)
    _scheduled_harvest_job()  # run once at startup
    while True:
        schedule.run_pending()
        time.sleep(60)


def get_league_info(league_id: str):
    """Get league display info."""
    return LEAGUES.get(league_id, {"name": league_id.upper()})


# --- OG Image for Bragging Rights poll sharing ---
@app.route("/api/og-image")
def api_og_image():
    """Generate a PNG image of poll question + options for Facebook/social previews."""
    try:
        from PIL import Image, ImageDraw, ImageFont

        question = request.args.get("question") or request.args.get("q") or "Bragging Rights Poll"
        opts_param = request.args.get("opts") or request.args.get("options") or ""
        options = [s.strip() for s in opts_param.split(",") if s.strip()] if opts_param else []

        w, h = 1200, 630
        img = Image.new("RGB", (w, h), color=(16, 22, 36))
        draw = ImageDraw.Draw(img)

        try:
            font_lg = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 44)
            font_md = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 26)
        except OSError:
            font_lg = font_md = ImageFont.load_default()

        y = 50
        draw.text((w // 2, y), "BRAGGING RIGHTS", fill=(63, 167, 255), font=font_md, anchor="mt")
        y += 55
        for line in _wrap_text(question, 45)[:3]:
            draw.text((w // 2, y), line, fill=(230, 233, 240), font=font_lg, anchor="mt")
            y += 50
        y += 25
        for i, opt in enumerate(options[:6]):
            draw.rectangle([(100, y), (w - 100, y + 45)], fill=(34, 44, 74))
            draw.text((130, y + 22), f"{i + 1}. {opt[:50]}", fill=(230, 233, 240), font=font_md)
            y += 55
        y += 20
        draw.text((w // 2, y), "Vote at Bragging Rights", fill=(63, 167, 255), font=font_md, anchor="mt")

        buf = BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)
        return Response(buf.read(), mimetype="image/png", headers={"Cache-Control": "public, max-age=86400"})
    except Exception as e:
        app.logger.warning("OG image generation failed: %s", e)
        abort(500)


def _wrap_text(text: str, max_chars: int) -> list[str]:
    words = text.split()
    lines, current = [], ""
    for w in words:
        if len(current) + len(w) + 1 <= max_chars:
            current = f"{current} {w}".strip() if current else w
        else:
            if current:
                lines.append(current)
            current = w
    if current:
        lines.append(current)
    return lines


# --- Harvest trigger (for UptimeRobot / cron to keep alive + refresh data) ---
@app.route("/api/harvest")
def api_harvest():
    """Trigger harvest on demand. Ping this URL every 10-15 min to refresh stats and keep Render alive."""
    import main
    try:
        n = main.run_harvest(quiet=True)
        return jsonify({"ok": True, "files_saved": n})
    except Exception as e:
        app.logger.exception("Harvest failed")
        return jsonify({"ok": False, "error": str(e)}), 500


# --- JSON API for Bragging Rights ---
@app.route("/api/leagues")
def api_leagues():
    return jsonify(LEAGUES)


@app.route("/api/<league_id>/scoreboard")
def api_scoreboard(league_id: str):
    if league_id not in LEAGUES:
        abort(404)
    date_str = request.args.get("date")  # YYYYMMDD
    if date_str:
        try:
            dt = datetime.strptime(date_str, "%Y%m%d")
            data = harvester.harvest_scoreboard(league_id, dt)
            return jsonify(data or {"events": []})
        except ValueError:
            pass
    data = load_scoreboard(league_id)
    return jsonify(data or {"events": []})


@app.route("/api/<league_id>/teams")
def api_teams(league_id: str):
    if league_id not in LEAGUES:
        abort(404)
    team_list = load_teams(league_id)
    return jsonify(team_list)


@app.route("/api/<league_id>/standings")
def api_standings(league_id: str):
    if league_id not in LEAGUES:
        abort(404)
    data = load_standings(league_id)
    return jsonify(data or {})


@app.route("/api/<league_id>/schedule")
def api_schedule(league_id: str):
    if league_id not in LEAGUES:
        abort(404)
    data = load_schedule(league_id)
    return jsonify(data or {"events": []})


@app.route("/api/<league_id>/matchup/<event_id>")
def api_matchup(league_id: str, event_id: str):
    if league_id not in LEAGUES:
        abort(404)
    season = request.args.get("season", type=int) or datetime.now().year
    summary = harvester.harvest_game_summary(league_id, event_id)
    if not summary:
        return jsonify({"error": "Game not found"}), 404
    box = summary.get("boxscore", {})
    comps = box.get("teams", [])
    if not comps:
        header = summary.get("header", {})
        comps = (header.get("competitions") or [{}])[0].get("competitors", [])
    teams_data = []
    for t in comps:
        team = t.get("team", t) if isinstance(t.get("team"), dict) else (t if isinstance(t, dict) else {})
        team_id = team.get("id") or t.get("id")
        standing_summary = ""
        cats = []
        if team_id:
            stats = harvester.fetch_team_statistics(league_id, team_id, season)
            if stats:
                res = stats.get("results", {})
                cats = (res.get("stats", {}).get("categories", [])) or []
                standing_summary = res.get("team", {}).get("standingSummary", "") or ""
        teams_data.append({"team": team, "stat_categories": cats, "standing_summary": standing_summary})
    while len(teams_data) < 2:
        teams_data.append({"team": {}, "stat_categories": [], "standing_summary": ""})
    team_a, team_b = teams_data[0], teams_data[1]
    comparison = []
    stats_a = {s["name"]: {"display": s.get("displayValue", ""), "label": s.get("shortDisplayName") or s.get("displayName", s["name"])}
               for cat in team_a.get("stat_categories", []) for s in cat.get("stats", [])}
    stats_b = {s["name"]: {"display": s.get("displayValue", ""), "label": s.get("shortDisplayName") or s.get("displayName", s["name"])}
               for cat in team_b.get("stat_categories", []) for s in cat.get("stats", [])}
    for name in sorted(stats_a.keys() & stats_b.keys()):
        comparison.append({"label": stats_a[name]["label"], "a": stats_a[name]["display"], "b": stats_b[name]["display"]})
    game_comparison = []
    stat_map = {
        "fieldGoalsMade-fieldGoalsAttempted": ("FG", "fg"), "fieldGoalPct": ("FG %", "pct"),
        "threePointFieldGoalsMade-threePointFieldGoalsAttempted": ("3PT", "fg"), "threePointFieldGoalPct": ("3PT %", "pct"),
        "freeThrowsMade-freeThrowsAttempted": ("FT", "fg"), "freeThrowPct": ("FT %", "pct"),
        "totalRebounds": ("Rebounds", "num"), "offensiveRebounds": ("Off. Rebounds", "num"),
        "assists": ("Assists", "num"), "steals": ("Steals", "num"), "blocks": ("Blocks", "num"),
        "turnovers": ("Turnovers", "num"), "fouls": ("Fouls", "num"),
    }
    game_stats_a = {s["name"]: {"display": s.get("displayValue", ""), "label": s.get("label") or s.get("abbreviation", s["name"])}
                    for s in (comps[0].get("statistics", []) if len(comps) > 0 else [])}
    game_stats_b = {s["name"]: {"display": s.get("displayValue", ""), "label": s.get("label") or s.get("abbreviation", s["name"])}
                    for s in (comps[1].get("statistics", []) if len(comps) > 1 else [])}
    for stat_name, (label, fmt) in stat_map.items():
        va = game_stats_a.get(stat_name, {}).get("display", "")
        vb = game_stats_b.get(stat_name, {}).get("display", "")
        if not va and not vb:
            continue
        def _parse_val(v, f):
            if f == "pct":
                try:
                    return float("".join(c for c in str(v) if c.isdigit() or c == "."))
                except (ValueError, TypeError):
                    return 0
            if f == "fg" and "-" in str(v):
                parts = str(v).split("-")
                try:
                    return float(parts[0]) / max(1, float(parts[1])) * 100 if len(parts) == 2 else 0
                except (ValueError, TypeError):
                    return 0
            try:
                return float("".join(c for c in str(v) if c.isdigit() or c == "."))
            except (ValueError, TypeError):
                return 0
        na, nb = _parse_val(va, fmt), _parse_val(vb, fmt)
        total = na + nb
        pct_a = (na / total * 100) if total > 0 else 50
        pct_b = (nb / total * 100) if total > 0 else 50
        game_comparison.append({"label": label, "a": va, "b": vb, "pct_a": pct_a, "pct_b": pct_b})
    return jsonify({
        "league_id": league_id,
        "event_id": event_id,
        "team_a": team_a,
        "team_b": team_b,
        "comparison": comparison,
        "game_comparison": game_comparison,
        "game_info": summary.get("gameInfo", {}),
    })


@app.route("/")
def index():
    """Home - league selector and overview."""
    return render_template("index.html", leagues=LEAGUES)


@app.route("/<league_id>/")
@app.route("/<league_id>/teams")
def teams(league_id: str):
    """Teams view."""
    if league_id not in LEAGUES:
        abort(404)
    team_list = load_teams(league_id)
    return render_template(
        "teams.html",
        league_id=league_id,
        league_name=get_league_info(league_id)["name"],
        teams=team_list,
    )


@app.route("/<league_id>/standings")
def standings(league_id: str):
    """Standings view."""
    if league_id not in LEAGUES:
        abort(404)
    data = load_standings(league_id)
    return render_template(
        "standings.html",
        league_id=league_id,
        league_name=get_league_info(league_id)["name"],
        standings=data,
    )


@app.route("/<league_id>/matchup/<event_id>")
def matchup(league_id: str, event_id: str):
    """Matchup: game details + side-by-side team stats comparison."""
    if league_id not in LEAGUES:
        abort(404)
    season = request.args.get("season", type=int) or datetime.now().year
    summary = harvester.harvest_game_summary(league_id, event_id)
    if not summary:
        abort(404)
    box = summary.get("boxscore", {})
    comps = box.get("teams", [])
    if not comps:
        header = summary.get("header", {})
        comps = (header.get("competitions") or [{}])[0].get("competitors", [])
    teams_data = []
    for t in comps:
        team = t.get("team", t) if isinstance(t.get("team"), dict) else (t if isinstance(t, dict) else {})
        team_id = team.get("id") or t.get("id")
        standing_summary = ""
        cats = []
        if team_id:
            stats = harvester.fetch_team_statistics(league_id, team_id, season)
            if stats:
                res = stats.get("results", {})
                cats = (res.get("stats", {}).get("categories", [])) or []
                standing_summary = res.get("team", {}).get("standingSummary", "") or ""
        teams_data.append({"team": team, "stat_categories": cats, "standing_summary": standing_summary})
    while len(teams_data) < 2:
        teams_data.append({"team": {}, "stat_categories": [], "standing_summary": ""})
    team_a, team_b = teams_data[0], teams_data[1]
    comparison = []
    stats_a = {}
    for cat in team_a.get("stat_categories", []):
        for s in cat.get("stats", []):
            stats_a[s["name"]] = {"display": s.get("displayValue", ""), "label": s.get("shortDisplayName") or s.get("displayName", s["name"])}
    stats_b = {}
    for cat in team_b.get("stat_categories", []):
        for s in cat.get("stats", []):
            stats_b[s["name"]] = {"display": s.get("displayValue", ""), "label": s.get("shortDisplayName") or s.get("displayName", s["name"])}
    for name in sorted(stats_a.keys() & stats_b.keys()):
        comparison.append({"label": stats_a[name]["label"], "a": stats_a[name]["display"], "b": stats_b[name]["display"]})

    # Game stats (During/After) from boxscore - with numeric values for bar charts
    game_comparison = []
    stat_map = {
        "fieldGoalsMade-fieldGoalsAttempted": ("FG", "fg"),
        "fieldGoalPct": ("FG %", "pct"),
        "threePointFieldGoalsMade-threePointFieldGoalsAttempted": ("3PT", "fg"),
        "threePointFieldGoalPct": ("3PT %", "pct"),
        "freeThrowsMade-freeThrowsAttempted": ("FT", "fg"),
        "freeThrowPct": ("FT %", "pct"),
        "totalRebounds": ("Rebounds", "num"),
        "offensiveRebounds": ("Off. Rebounds", "num"),
        "assists": ("Assists", "num"),
        "steals": ("Steals", "num"),
        "blocks": ("Blocks", "num"),
        "turnovers": ("Turnovers", "num"),
        "fouls": ("Fouls", "num"),
    }
    game_stats_a = {}
    game_stats_b = {}
    for i, t in enumerate(comps[:2]):
        gs = {s["name"]: {"display": s.get("displayValue", ""), "label": s.get("label") or s.get("abbreviation", s["name"])}
            for s in t.get("statistics", [])}
        if i == 0:
            game_stats_a = gs
        else:
            game_stats_b = gs
    for stat_name, (label, fmt) in stat_map.items():
        va, vb = game_stats_a.get(stat_name, {}).get("display", ""), game_stats_b.get(stat_name, {}).get("display", "")
        if not va and not vb:
            continue
        def _parse_val(v, f):
            if f == "pct":
                try:
                    return float("".join(c for c in str(v) if c.isdigit() or c == "."))
                except (ValueError, TypeError):
                    return 0
            if f == "fg" and "-" in str(v):
                parts = str(v).split("-")
                try:
                    return float(parts[0]) / max(1, float(parts[1])) * 100 if len(parts) == 2 else 0
                except (ValueError, TypeError):
                    return 0
            try:
                return float("".join(c for c in str(v) if c.isdigit() or c == "."))
            except (ValueError, TypeError):
                return 0
        na, nb = _parse_val(va, fmt), _parse_val(vb, fmt)
        total = na + nb
        pct_a = (na / total * 100) if total > 0 else 50
        pct_b = (nb / total * 100) if total > 0 else 50
        game_comparison.append({"label": label, "a": va, "b": vb, "pct_a": pct_a, "pct_b": pct_b})

    game_info = summary.get("gameInfo", {})
    return render_template(
        "matchup.html",
        league_id=league_id,
        league_name=get_league_info(league_id)["name"],
        event_id=event_id,
        team_a=team_a,
        team_b=team_b,
        comparison=comparison,
        game_comparison=game_comparison,
        game_info=game_info,
        season=season,
    )


@app.route("/<league_id>/scoreboard")
def scoreboard(league_id: str):
    """Scoreboard view - today's games."""
    if league_id not in LEAGUES:
        abort(404)
    data = load_scoreboard(league_id)
    events = data.get("events", []) if data else []
    day_info = data.get("day", {}) if data else {}
    return render_template(
        "scoreboard.html",
        league_id=league_id,
        league_name=get_league_info(league_id)["name"],
        events=events,
        day=day_info,
    )


@app.errorhandler(404)
def not_found(e):
    return render_template("404.html"), 404


@app.route("/<league_id>/news")
def news(league_id: str):
    """Sports news - ESPN RSS headlines, optionally rewritten via LLM."""
    if league_id not in LEAGUES:
        abort(404)
    items = load_news(league_id)
    # If no stored news, fetch live (no rewrite to avoid LLM call on page load)
    if not items:
        from harvester.news_fetcher import fetch_league_news

        items = fetch_league_news(league_id, limit=15, rewrite=False)
    return render_template(
        "news.html",
        league_id=league_id,
        league_name=get_league_info(league_id)["name"],
        items=items,
    )


@app.route("/<league_id>/schedule")
def schedule(league_id: str):
    """Schedule view."""
    if league_id not in LEAGUES:
        abort(404)
    data = load_schedule(league_id)
    events = data.get("events", []) if data else []
    return render_template(
        "schedule.html",
        league_id=league_id,
        league_name=get_league_info(league_id)["name"],
        events=events,
    )


@app.route("/<league_id>/team/<team_id>")
def team_detail(league_id: str, team_id: str):
    """Team detail: record, stats with rankings, roster."""
    if league_id not in LEAGUES:
        abort(404)
    season = request.args.get("season", type=int) or datetime.now().year
    team_data = harvester.fetch_team_detail(league_id, team_id, season)
    team_stats = harvester.fetch_team_statistics(league_id, team_id, season)
    if not team_data or "team" not in team_data:
        abort(404)
    team = team_data["team"]
    record = team.get("record", {})
    athletes = team.get("athletes", [])
    stats_result = team_stats.get("results", {}) if team_stats else {}
    stat_categories = stats_result.get("stats", {}).get("categories", [])
    return render_template(
        "team_detail.html",
        league_id=league_id,
        league_name=get_league_info(league_id)["name"],
        team=team,
        record=record,
        athletes=athletes,
        stat_categories=stat_categories,
        standing_summary=stats_result.get("team", {}).get("standingSummary", ""),
        season=season,
    )


@app.route("/<league_id>/player/<player_id>")
def player_detail(league_id: str, player_id: str):
    """Player detail: stats with league rankings, historical seasons."""
    if league_id not in LEAGUES:
        abort(404)
    season = request.args.get("season", type=int) or datetime.now().year
    player_info = harvester.fetch_athlete_info(league_id, player_id, season)
    stats_data = harvester.fetch_player_statistics(league_id, player_id, season)
    if not stats_data and not player_info:
        abort(404)
    splits = stats_data.get("splits", {}) if stats_data else {}
    categories = splits.get("categories", []) if splits else []
    player_info = player_info or {"id": player_id, "displayName": "Player"}
    return render_template(
        "player_detail.html",
        league_id=league_id,
        league_name=get_league_info(league_id)["name"],
        player_id=player_id,
        player_info=player_info,
        stat_categories=categories,
        season=season,
    )


# Start scheduler when module loads (for gunicorn/Render)
scheduler_thread = threading.Thread(target=_run_scheduler, daemon=True)
scheduler_thread.start()

if __name__ == "__main__":
    import os
    print("Sports Stats Web Interface")
    print("http://localhost:5000")
    print("Harvest runs every 15 mins (and once at startup).\n")
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, port=port)
