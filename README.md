# V(A) Timetable — with real background push notifications

This version actually wakes your phone up with a notification even if
the app is fully closed and your phone is locked — because there's now
a small real backend (a scheduled GitHub Action) sending the
notification from the outside, the same way any real app does it.

It takes about 15–20 minutes to set up, once, and it's completely free.

## How it works, in plain terms

- Your phone subscribes to push notifications through your browser
  (this is a real, standard web feature — the same one every "allow
  notifications" website uses).
- That subscription, plus your to-do list, gets quietly synced to a
  private GitHub repository you own.
- A GitHub Action (a free scheduled script) wakes up twice a day,
  checks your synced data against the two rules you asked for, and — if
  a condition is met — sends a real push notification straight to your
  phone through Google/Apple's push service. This works even if the
  app itself hasn't been opened in days.

## Step 1 — Create your GitHub repo

1. Go to https://github.com/new
2. Name it anything (e.g. `timetable-app`), keep it **Private**, create it
3. Upload every file in this folder to it, keeping the folder structure
   (drag-and-drop on the repo's page works, or use `git push` if you're
   comfortable with git)

## Step 2 — Turn on GitHub Pages

1. In your repo, go to **Settings → Pages**
2. Under "Build and deployment", set Source to **Deploy from a branch**,
   branch `main`, folder `/ (root)`
3. Save — after a minute or two you'll get a live URL like
   `https://yourusername.github.io/timetable-app/`

## Step 3 — Add your VAPID keys as repo secrets

These keys let the Action prove to Google/Apple's push service that
it's really you sending the notification. I've already generated a
real key pair for you:

```
Public key:  BBI68GAkByHP3Q8e7g2F-XJYkPAWAUJYMo5czXPKAvWljhy_28nxed5b19W1YvSGE_tKbnCCixdRQETfOnvj73Q
Private key: o_iOr3BXISO28Za-A0gSq2uwY9SVgtzArQ0Ejtvvolk
```

The public key is already in `config.js` — you don't need to touch it.

The private key must **never** go in your code — only in a GitHub
secret:

1. In your repo, go to **Settings → Secrets and variables → Actions**
2. Add a secret named `VAPID_PUBLIC_KEY`, paste the public key above
3. Add a secret named `VAPID_PRIVATE_KEY`, paste the private key above

## Step 4 — Create a token so the app can save your data to the repo

This is the one part worth understanding clearly:

1. Go to https://github.com/settings/personal-access-tokens/new
2. Under "Repository access", choose **Only select repositories** →
   pick this one repo only
3. Under "Permissions" → "Repository permissions", set **Contents** to
   **Read and write**. Leave everything else as "No access."
4. Generate the token and copy it

**Security note:** this token will sit in `config.js`, which is public
if your GitHub Pages site is public (it's fine even for a private repo,
since anyone who can view your live site's source can see it). Because
you scoped it to *only this repo* with *only contents* access, the
worst case if it leaked is someone could edit files in this one
low-stakes repo — they can't touch your other repos, your account, or
anything else. If that's ever a concern, you can revoke and regenerate
the token any time from the same settings page.

Paste the token into `config.js`:

```js
window.APP_CONFIG = {
  githubOwner: "yourusername",
  githubRepo: "timetable-app",
  githubToken: "paste your token here",
  vapidPublicKey: "BBI68GAkByHP3Q8e7g2F-XJYkPAWAUJYMo5czXPKAvWljhy_28nxed5b19W1YvSGE_tKbnCCixdRQETfOnvj73Q",
};
```

Commit that change to your repo (this file has to be public for the
app itself to read it — see the security note above for why that's
okay here).

## Step 5 — Install the app and turn on background notifications

1. Open your GitHub Pages URL from Step 2 on your phone
2. Add it to your home screen (Chrome: ⋮ → Add to Home screen /
   Install app. Safari: Share → Add to Home Screen)
3. Open the installed app
4. Tap the **"Enable background notifications"** button at the bottom
   and allow notifications when asked
5. That's it — your subscription is now synced to your repo, and the
   scheduled checks will find it

## Step 6 — Test it without waiting for the real schedule

1. In your repo, go to the **Actions** tab
2. Click "Send timetable notifications" → **Run workflow** (this is the
   `workflow_dispatch` trigger — it lets you fire it manually)
3. It'll run the lab-check by default; check the run's logs to see what
   it decided and whether a push was sent
4. If your subscription and reminders are set up correctly and today's
   conditions are actually met, you should get a real notification —
   even with the app fully closed

## The two rules, and when they actually run

- **7:00 PM IST, daily** — if tomorrow's schedule has a lab, sends
  *"CK have you written your record and observation"*
- **9:00 AM IST, daily** — checks every to-do item with a due date; if
  any is exactly 2 days or 1 day away, sends *"NiGx you've got
  submission to do"* for that item (fires once per matching day, so
  you get it on both the 2-days-out and 1-day-out mornings)

Want different times? Edit the two `cron:` lines in
`.github/workflows/notify.yml` — they're in UTC, so IST is UTC+5:30.

## If something's not sending

Check the **Actions** tab in your repo — every run's logs show exactly
what it checked and why it did or didn't send anything. That's the
first place to look.

## Editing your schedule or to-do behavior later

- Add/edit to-dos as normal in the app — they sync automatically
- If your actual class schedule changes, update `RAW_SCHEDULE` in both
  `app-component.jsx` (for the in-app view) **and** the small copy of
  which days have labs in `scripts/notify.js` (for the background
  check) — they're intentionally kept simple and separate
