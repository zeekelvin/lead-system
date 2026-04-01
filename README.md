This project is a Vercel-ready local lead generation system for use across the U.S.

It includes:

- a seeded CRM with Andover starter leads plus nationwide live lead search
- a demo website generator for each lead
- on-site lead workboards with opener, hook, offer, email, voicemail, and objection scripts
- CSV export for the working pipeline
- live lead discovery for new cities and states using Google Places
- search history, visited tracking, in-progress tracking, processed lead logs, and a 7-step stage tracker
- an optional Resend-powered route that emails the selected lead brief to your inbox

## Getting Started

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

The app stores lead edits in browser `localStorage`, so you can deploy without a database and still keep your own working queue.

## Resend Setup

If you want the "Email Brief To My Inbox" button to work, add these environment variables:

```bash
RESEND_API_KEY=
RESEND_FROM_EMAIL="ZagaPrime Growth OS <onboarding@resend.dev>"
RESEND_TO_EMAIL=you@example.com
```

Use `onboarding@resend.dev` while testing, then replace it with your own verified sender once your Resend domain is set up.

## Live Search Setup

For real-time lead discovery, add:

```bash
GOOGLE_MAPS_API_KEY=
```

This app uses Google Places Text Search from a server route, ranks operational businesses without a website first, and still shows fallback candidates if every listing in that market already has a site. A missing `websiteUri` is a strong lead signal, but it is still an inference rather than a guarantee that no website exists anywhere online.

## Deploying To Vercel

1. Push the repo to GitHub.
2. Import the repo into Vercel.
3. Add `GOOGLE_MAPS_API_KEY` for live lead discovery.
4. Add the optional Resend environment variables if you want inbox brief delivery.
5. Deploy.

The app is database-free by default, so there is no extra infrastructure required for the first deployment.

## Next Upgrade Path

If you want this to become a shared multi-user tool instead of a single-browser system, the clean next steps are:

1. add auth
2. move leads into Postgres or Neon
3. add activity history and reminders
4. turn demo pages into shareable URLs per lead
