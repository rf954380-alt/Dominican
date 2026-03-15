# PeteZah

A full-stack web proxy application to bypass various filters.

## Architecture

- **Frontend**: React + Vite (TypeScript), runs on port 5000 in dev
- **Backend**: Express.js server, runs on port 3000
- **Database**: SQLite (better-sqlite3) stored at `data/users.db`
- **Proxy tech**: Scramjet, BareMux, Epoxy, Libcurl, WISP

## Running the App

In development, both servers run concurrently via `npm run start:dev`:
- Vite dev server on port 5000 (frontend + HMR)
- Express backend on port 3000 (API, proxy routes, bare server, WISP)

Vite proxies all `/api`, `/bare`, `/baremux`, `/epoxy`, `/libcurl`, `/scramjet`, `/scram`, `/wisp`, `/sw.js`, and `/uploads` requests to the backend.

## Required Environment Variables / Secrets

| Variable | Type | Description |
|---|---|---|
| `TOKEN_SECRET` | Secret | JWT/auth token signing secret (required) |
| `SESSION_SECRET` | Secret | Express session secret |
| `BOT_TOKEN` | Secret | Discord bot token (optional, for DDoS alerting) |
| `GROQ_API_KEY` | Secret | Groq API key for AI features |
| `ADMIN_EMAIL` | Env | Admin user email |
| `PORT` | Env | Backend port (default: 3000) |
| `VITE_PORT` | Env | Vite dev port (default: 5000) |
| `NODE_ENV` | Env | development or production |

## Key Files

- `backend/server.js` — Main Express server
- `backend/db.js` — SQLite database setup and migrations
- `backend/security/` — DDoS shield, XDP integration
- `backend/middleware/` — Rate limiting, security middleware
- `backend/routes/` — AI and challenge routes
- `backend/api/` — Auth, user, settings, comments, likes, admin handlers
- `src/` — React frontend source
- `vite.config.ts` — Vite config with proxy setup

## Deployment

For production, build with `npm run build` then run `node backend/server.js` (serves static dist + API on port 3000).
