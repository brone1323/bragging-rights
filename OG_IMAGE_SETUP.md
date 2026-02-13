# Poll Share Image (OG Image) Setup

When you share a poll to Facebook, Twitter, or other social platforms, they fetch an **og:image** to show a preview. Bragging Rights can generate a custom image showing the actual poll question and options instead of a generic link.

---

## Option A: Deploy to Vercel (Recommended)

Vercel provides a serverless `/api/og-image` endpoint that generates the poll image on demand.

### Steps

1. **Install Vercel CLI** (optional, for local testing):
   ```bash
   npm i -g vercel
   ```

2. **Deploy your Bragging Rights project**:
   - Push your code to GitHub
   - Connect the repo at [vercel.com](https://vercel.com)
   - Or run `vercel` in the project folder

3. **Deploy** – Vercel will:
   - Serve your static files
   - Run the `api/og-image.tsx` function when `/api/og-image` is requested

4. **Test**: Visit  
   `https://your-site.vercel.app/api/og-image?question=Who+Wins&opts=Team+A,Team+B`  
   You should see a 1200×630 PNG with the poll content.

5. **Share a poll** – When someone shares a poll link, Facebook will request that URL and show the generated image.

---

## Option B: Use the Stats Server

If you run the stats server (Python/Flask), it also has an `/api/og-image` endpoint.

### Steps

1. **Install Pillow** in the stats project:
   ```bash
   cd C:\codekillabackup\AI_Website_Builder\projects\stats
   pip install Pillow
   ```

2. **Serve Bragging Rights from the stats server** (so both are same origin):
   - Add a route in `serve.py` to serve the Bragging Rights static files
   - Or use a reverse proxy (nginx, Caddy) so `bragging-rights.online` serves static files and `/api/*` proxies to the stats server

3. **Test**: If your stats server is at `http://localhost:5000`, visit:  
   `http://localhost:5000/api/og-image?question=Test&opts=A,B`

---

## Option C: Static Hosting Only (No Image)

If you host on a purely static host (GitHub Pages, etc.) with no serverless support:

- The `og:image` meta tag will point to `/api/og-image`, which won’t exist
- Facebook will fall back to no image (or a generic one)
- **Solution**: Deploy to Vercel or use the stats server so `/api/og-image` is available

---

## Verifying

1. Share a poll link (e.g. from the Share on Facebook button)
2. In the share dialog, you should see a preview image with:
   - "BRAGGING RIGHTS" header
   - The poll question
   - Numbered options
   - "Vote at Bragging Rights" footer

3. Use [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) – paste your poll URL and click "Scrape Again" to refresh Facebook’s cache.
