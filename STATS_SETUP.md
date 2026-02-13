# Bragging Rights – Stats Integration Setup Guide

This guide walks you through setting up the live scoreboard, Stats button, and Leagues page on your Bragging Rights site.

---

## Prerequisites

- Python 3.8 or higher installed
- Your Bragging Rights site deployed (or running locally)
- Admin access to your Bragging Rights site (to configure the Stats API URL)

---

## Part 1: Set Up the Stats Server (First-Time)

### Step 1.1: Install Python Dependencies

Open a terminal/command prompt and run:

```bash
cd C:\codekillabackup\AI_Website_Builder\projects\stats
pip install -r requirements.txt
```

If `pip` gives errors, try:

```bash
pip install flask requests schedule Pillow
```

### Step 1.2: Test the Harvester (Optional but Recommended)

Before running the server, manually harvest data once to verify everything works:

```bash
cd C:\codekillabackup\AI_Website_Builder\projects\stats
python main.py --leagues nba nfl nhl mlb
```

You should see output like:

```
  Saved: nba/teams.json
  Saved: nba/standings.json
  Saved: nba/scoreboard.json
  Saved: nfl/teams.json
  ...
Harvest complete. X files saved to ...
```

Data is saved in `stats/data/nba/`, `stats/data/nfl/`, etc.

### Step 1.3: Start the Stats Server

```bash
cd C:\codekillabackup\AI_Website_Builder\projects\stats
python serve.py
```

You should see:

```
Sports Stats Web Interface
http://localhost:5000
Harvest runs every 15 mins (and once at startup).
```

The server will:
- Run on **http://localhost:5000**
- Harvest data once at startup
- Harvest again every 15 minutes automatically
- Serve the web UI and JSON API

Keep this terminal window open while testing locally.

### Step 1.4: Verify the API

In a browser or with curl, try:

- **http://localhost:5000** – Stats web interface
- **http://localhost:5000/api/nba/scoreboard** – Should return JSON with today’s NBA games (or empty `events` if none)

---

## Part 2: Configure Bragging Rights (Local Testing)

### Step 2.1: Open Your Bragging Rights Site

Open your Bragging Rights site in a browser, e.g.:

- **http://localhost:5500** (if using Live Server)
- **http://127.0.0.1:8080** (if using another port)
- Or the folder path if opening `index.html` directly (note: `file://` may block some features)

### Step 2.2: Log In as Admin

Use your admin credentials. (From the codebase, the example is username `SolarBrone`, password `1323Ford` – change these for production.)

### Step 2.3: Go to Admin Panel

Click or navigate to **Admin** (or go to `admin.html`).

### Step 2.4: Set Stats API URL

Find the **Stats API URL** field and enter:

```
http://localhost:5000
```

Do **not** add a trailing slash. Click **Save Stats API**.

### Step 2.5: Test the Integration

1. Go back to the main page.
2. **Scoreboard** (left column) – Should show today’s games from NBA, NFL, NHL, MLB. If it says “Loading scores…” then “No games today”, the API is reachable but there may be no games for today.
3. **Leagues** (top nav) – Click it, then choose NBA (or any league). You should see Teams, Standings, Schedule, Scoreboard tabs.
4. **Stats button** – On each game card in the Games column, click **Stats**. If the game matches a scoreboard game by team names, a comparison modal should open.

---

## Part 3: Production Deployment

You have two main deployment patterns.

### Option A: Stats Server on Same Machine as Bragging Rights

If both run on the same server:

1. **Deploy Bragging Rights** – Static files (HTML, JS, CSS) to your web host (Netlify, Vercel, GitHub Pages, etc.).

2. **Run the Stats Server** – On a server (VPS, cloud VM, etc.) that is always on:
   - Copy the `stats` folder to the server.
   - Install Python and run:
     ```bash
     pip install flask requests schedule
     cd /path/to/stats
     python serve.py
     ```
   - Use a process manager (e.g. **systemd**, **pm2**, **supervisor**) so it restarts if it crashes and starts on boot. Example `systemd` unit:

     ```
     [Unit]
     Description=Bragging Rights Stats Server
     After=network.target

     [Service]
     Type=simple
     User=www-data
     WorkingDirectory=/path/to/stats
     ExecStart=/usr/bin/python3 serve.py
     Restart=always
     RestartSec=10

     [Install]
     WantedBy=multi-user.target
     ```

3. **Expose the Stats Server** – Use a reverse proxy (nginx, Caddy) or a cloud load balancer so the stats API is reachable at a public URL, e.g.:
   - `https://stats.yourdomain.com`
   - or `https://api.yourdomain.com/stats`

4. **Set Stats API URL in Admin** – On your live Bragging Rights site, go to Admin and set:
   ```
   https://stats.yourdomain.com
   ```
   (Use the exact URL where your stats API is hosted.)

### Option B: Stats Server on a Different Host (e.g. Heroku, Railway, Render)

1. **Create a new project** for the stats server on your host.

2. **Upload the stats folder** – Include:
   - `serve.py`
   - `main.py`
   - `config.py`
   - `loader.py`
   - `storage.py`
   - `harvester/` folder (with `__init__.py`, `espn_harvester.py`, etc.)
   - `requirements.txt` with: `flask`, `requests`, `schedule`

3. **Configure the host** – Set the start command to:
   ```
   python serve.py
   ```
   Ensure the app listens on the host’s port (often from `PORT` env var; you may need to change `app.run(port=5000)` to use that port).

4. **Get the public URL** – e.g. `https://your-stats-app.onrender.com` or `https://bragging-stats.herokuapp.com`.

5. **Set Stats API URL** – In Bragging Rights Admin, set that URL as the Stats API URL and save.

---

## Part 4: Production Checklist

- [ ] Stats server runs 24/7 (or at least when the site is in use)
- [ ] Stats API URL in Admin is correct and uses `https://` in production
- [ ] CORS is enabled on the stats server (already in `serve.py`)
- [ ] Firewall allows inbound traffic to the stats server port
- [ ] Admin password is changed from the default
- [ ] Odds API key is set if you use real betting odds
- [ ] Site URL is set in Admin for Facebook sharing

---

## Troubleshooting

### “Unable to load scores” or “No games today”

- **Stats API URL** – Confirm it’s set and matches where the stats server is running (no trailing slash).
- **Harvest** – Run `python main.py --leagues nba nfl nhl mlb` in the stats folder. Check `stats/data/*/scoreboard.json` for content.
- **CORS** – If Bragging Rights is on a different domain, ensure the stats server sends `Access-Control-Allow-Origin` (the current `serve.py` uses `*`).
- **No games** – Some leagues have no games on certain days; try another league or another day.

### Stats button says “No matching game found”

- Team names from the odds API may not exactly match ESPN (e.g. “LA Lakers” vs “Los Angeles Lakers”).
- Ensure today’s scoreboard has been harvested for the league you’re viewing.
- The odds API sport must map to a stats league (NBA, NFL, NHL, MLB).

### League page shows “Failed to load” or “No teams found”

- Stats API URL must be correct and the stats server reachable.
- Run `python main.py --leagues nba nfl nhl mlb` and confirm `stats/data/nba/teams.json` (etc.) exist and contain data.

### Server stops after closing the terminal

- Use a process manager (systemd, pm2, supervisor) so the stats server runs in the background and restarts automatically.

---

## File Reference

| Location | Purpose |
|----------|---------|
| `stats/main.py` | Command-line harvester |
| `stats/serve.py` | Flask server + JSON API + auto-harvest |
| `stats/data/` | Harvested JSON (teams, standings, scoreboard, etc.) |
| `feb12bragg/admin.html` | Admin panel with Stats API URL field |
| `feb12bragg/stats.js` | Scoreboard + Stats button logic |
| `feb12bragg/league.js` | Leagues page data loading |

---

## Quick Commands Reference

```bash
# Harvest all leagues (teams, standings, today's scoreboard)
cd C:\codekillabackup\AI_Website_Builder\projects\stats
python main.py --leagues nba nfl nhl mlb

# Harvest with schedule (for Leagues > Schedule tab)
python main.py --leagues nba nfl nhl mlb --types teams standings scoreboard schedule

# Start the stats server (leave running)
python serve.py
```
