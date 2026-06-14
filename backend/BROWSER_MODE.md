# FeedFlow Browser Mode Setup

## Overview

The BrowserAdapter enables FeedFlow to work with Facebook-linked Instagram accounts that cannot use the private API. It uses Playwright browser automation on the backend server.

## Architecture

```
Mobile APK → Backend API → BrowserAdapter (Playwright) → Instagram Web
```

The mobile app makes API calls to your backend, which controls a real browser instance to perform Instagram actions.

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
npx playwright install chromium
```

This installs Playwright and downloads the Chromium browser (~300MB).

### 2. Configure Instagram Connection

In Supabase `instagram_connections` table, set:

```sql
UPDATE instagram_connections 
SET 
  mode = 'browser',
  username = 'rqyifln350@aplus.edu.pl',
  password = 'FeedFlow2026!' -- encrypted in production
WHERE user_id = 'your_user_id';
```

**Note**: Store passwords encrypted using the crypto utility in production.

### 3. Test the Adapter

```bash
cd backend
npx ts-node test-browser-adapter.ts
```

This will:
- Launch a browser
- Log into Instagram (via Facebook if needed)
- Like 2 posts for #technology
- Follow 1 user from #ai
- Show results in console

## How It Works

### Connection Flow

1. Backend launches Chromium browser (headless in production)
2. Navigates to `instagram.com`
3. Checks if already logged in (from previous session)
4. If not logged in: attempts Facebook Login with credentials
5. Keeps browser session alive for subsequent actions

### Action Flow

1. Mobile app calls: `POST /api/automation/run`
2. Backend worker calls `BrowserAdapter.likeByTopic('technology', 2)`
3. Browser navigates to hashtag page
4. Browser clicks posts and Like buttons
5. Results logged to Supabase
6. Mobile app displays analytics

## Deployment

### Server Requirements

- Node.js 20+
- 512MB+ RAM
- Chromium browser installed
- Linux/Windows/Mac server (not serverless)

### Render.com Deployment

```yaml
# render.yaml
services:
  - type: web
    name: feedflow-backend
    env: node
    buildCommand: npm install && npx playwright install --with-deps chromium
    startCommand: npm start
```

### Environment Variables

```
NODE_ENV=production
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
```

## Usage Modes

| Mode | Use Case | Requires |
|------|----------|----------|
| `sim` | Demo/testing | Nothing |
| `browser` | Facebook-linked accounts | Chromium + credentials |
| `live` | Direct Instagram accounts | Username/password only |

## Hackathon Demo Script

1. **Show the mobile app** - User selects preferences (AI, Tech, Fitness)
2. **Click "Connect Instagram"** - App shows "Connected" status
3. **Click "Start Automation"** - App calls backend API
4. **Backend runs BrowserAdapter** - Headless browser performs actions
5. **Show activity log** - Real-time likes/follows appear in app
6. **Show progress chart** - Personalization score increases

## Troubleshooting

### "Browser login failed"
- Check credentials in `instagram_connections` table
- Run test script to see browser window (set `headless: false`)
- Instagram may require email verification code

### "Chromium not found"
- Run: `npx playwright install chromium`
- Check `~/.cache/ms-playwright/` for browser binaries

### "Session expired"
- Browser needs to re-authenticate
- Clear old session: `await adapter.disconnect()`
- Reconnect: `await adapter.connect(...)`

## Performance

- **Session startup**: ~5 seconds
- **Like action**: ~3 seconds per post
- **Follow action**: ~4 seconds per user
- **Memory**: ~150MB per browser instance

## Limitations

- Requires full browser (~300MB deployment size)
- Can't run on serverless (needs persistent browser process)
- Instagram may rate-limit aggressive automation
- One browser instance per user (scalability consideration)

## Next Steps

For production:
1. Add browser pooling for multiple users
2. Implement session persistence (save cookies to DB)
3. Add CAPTCHA detection and handling
4. Monitor for Instagram ToS changes
