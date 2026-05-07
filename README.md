# Broadstreet Dashboard

A lightweight web dashboard for the [Broadstreet Ads](https://broadstreetads.com/) API. It surfaces your networks, advertisers, campaigns, and zones with at-a-glance stats and search.

## What it shows

- Network selector (auto-populated from your account)
- Top-level stats: advertisers, campaigns, active campaigns, zones
- Advertiser list with per-advertiser campaign counts
- Campaign list per advertiser with status, impressions, clicks, and CTR
- Zone list with alias, dimensions, and self-serve flag

## Stack

- Node.js + Express server that proxies the Broadstreet API and keeps your access token on the server (never exposed to the browser)
- Static HTML/CSS/vanilla JS frontend — no build step

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Get an access token at <https://my.broadstreetads.com/access-token>.
3. Copy the environment template and fill it in:
   ```bash
   cp .env.example .env
   # edit .env and set BROADSTREET_ACCESS_TOKEN
   ```
4. Start the server:
   ```bash
   npm start
   # or for auto-reload during development
   npm run dev
   ```
5. Open <http://localhost:3000>.

## API endpoints (server proxy)

The frontend talks to the server, which forwards to `https://api.broadstreetads.com/api/1` with your token attached.

| Method | Path                                  | Forwards to                              |
| ------ | ------------------------------------- | ---------------------------------------- |
| GET    | `/api/health`                         | (local) reports whether the token is set |
| GET    | `/api/networks`                       | `/networks`                              |
| GET    | `/api/networks/:id`                   | `/networks/:id`                          |
| GET    | `/api/advertisers?network_id=`        | `/advertisers`                           |
| GET    | `/api/advertisers/:id`                | `/advertisers/:id`                       |
| GET    | `/api/advertisers/:id/campaigns`      | `/advertisers/:id/campaigns`             |
| GET    | `/api/campaigns/:id`                  | `/campaigns/:id`                         |
| GET    | `/api/zones?network_id=`              | `/zones`                                 |
| GET    | `/api/zones/:id`                      | `/zones/:id`                             |

## Project layout

```
.
├── server.js          # Express server + Broadstreet API proxy
├── package.json
├── .env.example       # Copy to .env and add your token
└── public/
    ├── index.html
    ├── styles.css
    └── app.js
```
