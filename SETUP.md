# Fixed Assets Register — GitHub + Google Sheets Setup

This package has three files:

| File | Purpose |
|---|---|
| `index.html` | The whole application. This is what you put on GitHub. |
| `Code.gs` | A Google Apps Script that lets `index.html` talk to a Google Sheet. |
| `SETUP.md` | This guide. |

The app itself always saves your work locally in your browser first (IndexedDB),
so you're never dependent on Google Sheets being reachable to keep working —
Sheets sync is your durable backup and your way of moving data between devices,
not a single point of failure.

---

## Part A — Put the app on GitHub

1. Create a new GitHub repository (public or private both work).
2. Upload `index.html` to the repository root.
3. In the repo, go to **Settings → Pages**.
4. Under **Source**, choose **Deploy from a branch**, pick your default branch
   (`main`) and the `/ (root)` folder, then **Save**.
5. GitHub gives you a URL like `https://<your-username>.github.io/<repo-name>/`.
   That's your live app. It can take a minute or two to go live the first time.

Do **not** put your Google Sheets secret (see Part B) into `index.html` before
uploading it — the file has no secrets baked in by design. You'll paste the
Web App URL and secret into the running app's own Admin screen later, and
they'll stay only in your browser's local storage.

---

## Part B — Create the Google Sheet + Apps Script bridge

A static GitHub Pages site can't talk to Google Sheets directly, so `Code.gs`
acts as a small bridge in between.

1. Go to [sheets.google.com](https://sheets.google.com) and create a new,
   blank spreadsheet. Name it something like **Fixed Assets Register Data**.
2. In that sheet, open **Extensions → Apps Script**.
3. Delete the placeholder code in `Code.gs` there, and paste in the contents
   of this package's `Code.gs` instead.
4. Near the top of the script, change this line to your own long random
   secret (treat it like a password — anyone who has it plus your Web App
   URL can read and write this sheet):
   ```js
   const SHARED_SECRET = 'CHANGE-ME-TO-A-LONG-RANDOM-SECRET';
   ```
   A quick way to generate one: [uuidgenerator.net](https://www.uuidgenerator.net/).
5. Click **Deploy → New deployment**.
   - Click the gear icon next to "Select type" and choose **Web app**.
   - **Execute as:** Me (your Google account).
   - **Who has access:** Anyone.
   - Click **Deploy**, then **Authorize access** and approve the permissions
     (this script only ever touches the one spreadsheet it's bound to).
6. Copy the **Web app URL** you're given — it looks like
   `https://script.google.com/macros/s/AKfycb.../exec`.

> **If you ever edit `Code.gs` later:** use **Deploy → Manage deployments →
> Edit → New version**, or the URL keeps serving the old code. This is the
> single most common gotcha with Apps Script web apps.

---

## Part C — Connect the app to the sheet

1. Open your live GitHub Pages URL from Part A.
2. Sign in (default administrator account: `admin` / `admin123` — change
   this immediately from **Administration → Users**).
3. Go to **Administration → Google Sheets Sync**.
4. Paste in the **Web App URL** from Part B, and the **Shared Secret** you
   set in `Code.gs`.
5. Click **Save Connection Settings**.
6. Click **Push to Google Sheets** once to write your current data (or an
   empty starting register) up to the sheet.

From here:
- **Push** whenever you want to back up / publish your current local data.
- **Pull** on another computer (or after someone else pushes) to bring the
  sheet's data down locally.
- Tick **"Automatically push a few seconds after every change"** if you
  want every save to also back itself up to the sheet without you having to
  remember — it's debounced, so rapid changes are batched into one push a
  few seconds after you stop.

---

## About data safety

- Local data lives in your browser's IndexedDB and survives closing the tab,
  restarting the browser, and restarting your computer. It does **not**
  survive clearing that browser's site data, or using a different browser
  or device — which is exactly what Push/Pull is for.
- A **Pull** replaces local data with whatever is currently in the sheet —
  the app warns you and asks to confirm before doing this. Push first if
  you're not sure your local copy is already backed up.
- Each record's full data is stored in a single JSON cell per row in the
  sheet (columns: `id`, `updatedAt`, `json`). This is deliberate: Google
  Sheets silently reformats things that look like dates or numbers when
  they're spread across normal columns, which is a classic way to corrupt
  data over time. Please don't hand-edit the `json` column directly — use
  Push/Pull instead.
- Multiple people using the app against the same sheet do **not** see each
  other's changes automatically (unlike the earlier Claude-hosted version) —
  everyone needs to Push and Pull explicitly. If two people both edit data
  locally before syncing, the second Push will overwrite the first, so for
  a small team the simplest safe habit is: Pull before you start working,
  Push when you're done.
