# Deploying to Render (free tier)

This app is a single Node.js server: it serves the website **and** keeps every
phone in sync during the live auction. One Render service runs everything.

## 1. Push the code to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git
git push -u origin main
```

Keep the repository **private** — `data/myauctionkpl.json` contains the full
auction database.

## 2. Create the Render service

1. Go to https://dashboard.render.com → **New → Web Service**
2. Connect the GitHub repository
3. Render reads `render.yaml` automatically — confirm:
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
4. In **Environment**, set:
   - `ADMIN_PASSWORD` — a strong password (NOT `admin123`)
   - `ADMIN_EMAIL` — your email
5. Click **Create Web Service**. First deploy takes ~3 minutes.

Your site is live at `https://kpl-2026-auction.onrender.com` (name shown in
the service settings).

## 3. One-time setup on the live site

1. Open the site → **Admin** → sign in with your password
   (the verification code appears **on screen** until you either fix SMTP or
   enroll the authenticator app — see below)
2. In the Admin panel, scroll to **Authenticator App → Set Up** and scan the
   QR with Google Authenticator / Authy. Save the backup codes.
   After this, login = password + code from your phone. **No email needed.**

## 4. Free-tier habits (important on event day)

| Fact | What to do |
|---|---|
| Free services **sleep** after ~15 min without visitors (first load waits ~50s) | Create a free keep-alive ping at https://cron-job.org or https://uptimerobot.com → point it at `https://YOUR-SERVICE.onrender.com/api/health` every 10 minutes |
| Free tier **wipes the disk** on every restart/redeploy | After importing players or any important change, click **Export / Save JSON backup** in the app and keep the file. Re-uploading it restores everything |
| The repo copy of the database is only the **starting seed** | A redeploy resets the auction to the last committed state — fine before the event, dangerous during it. Don't redeploy mid-auction |

## 5. After the auction

The generated report `myauctionkpl.html` (auto-saved to `data/` on the server,
also downloadable from Export) is the printable final squads + budgets report.

---

### Why not Netlify + a separate relay?

The server already *is* the message relay — auction state lives in its memory
and is saved to disk. Splitting the site onto Netlify would add CORS setup,
two deploys and two places for secrets, without making anything faster.

### Scaling note

Viewers poll the state every 2.5 s; the payload is ~35 KB gzipped (inline
images are stripped from `/api/state` and served from cacheable endpoints).
That comfortably fits **100+ simultaneous viewers** on the free instance.
