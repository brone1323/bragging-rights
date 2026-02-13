# Deploy Stats Server for Bragging Rights

The **Live Scores** column, **Leagues** page, and **Stats** button need a Stats API server running 24/7. Here’s how to host it on Render (free tier).

---

## Step 1: Create a GitHub Repo for Stats

1. Create a new repo on GitHub (e.g. `bragging-rights-stats`).
2. In the stats folder, init git (if needed), add, commit, push:

```bash
cd C:\codekillabackup\AI_Website_Builder\projects\stats
git init
git add .
git commit -m "Stats server for Bragging Rights"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/bragging-rights-stats.git
git push -u origin main
```

---

## Step 2: Deploy to Render

1. Go to [render.com](https://render.com) and sign up (free).
2. **New** → **Web Service**
3. Connect your `bragging-rights-stats` repo (or use the one that contains the stats folder).
4. If the stats folder is in a subfolder (e.g. `projects/stats`), set **Root Directory** to that path.
5. Render should detect the Python app. If not, set:
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn serve:app --bind 0.0.0.0:$PORT`
6. Choose **Free** instance type.
7. Click **Create Web Service**.

After deployment you’ll get a URL like `https://bragging-rights-stats.onrender.com`.

---

## Step 3: Set the Stats URL in Bragging Rights

1. Open `config.js` in the Bragging Rights project.
2. Add your Render URL:

```javascript
window.BRAG_CONFIG.statsApiUrl = 'https://bragging-rights-stats.onrender.com';
```

3. Commit and push to deploy Bragging Rights to Vercel:

```bash
cd c:\codekillabackup\AI_Website_Builder\projects\feb12bragg
git add config.js
git commit -m "Add Stats API URL"
git push
```

---

## Step 4: Optional – Test Locally First

```bash
cd C:\codekillabackup\AI_Website_Builder\projects\stats
pip install -r requirements.txt
python main.py --leagues nba nfl nhl mlb
python serve.py
```

Then in Bragging Rights Admin, set **Stats API URL** to `http://localhost:5000` (this overrides `config.js` for your browser).

---

## Render Free Tier Notes

- The service spins down after ~15 minutes of no traffic.
- First request after spin-down can take 30–60 seconds while it starts.
- Data is harvested on startup and about every 15 minutes while running.
