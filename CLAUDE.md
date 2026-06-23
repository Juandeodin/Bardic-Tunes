# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Bardic Tunes** — a web music player for tabletop RPG (rol) sessions. Vanilla ES6+ class-based frontend (no framework, no build step) served by a small Express backend. Dark-fantasy themed UI. Code, comments, UI strings, and commit messages are in **Spanish** — match that when editing.

## Commands

```bash
npm install        # install deps (express, bcryptjs, jsonwebtoken)
npm start          # run the server → http://localhost:3000  (alias: npm run dev)
JWT_SECRET=... npm start   # set a stable secret so tokens survive restarts
```

There is **no build, lint, or test setup** — `npm start` is the only script, and it just runs `node server.js`. The frontend `js/*.js` files are loaded directly via `<script>` tags in `index.html`; editing them takes effect on browser refresh (no bundler).

Docker: image `ghcr.io/juandeodin/bardic-tunes`, deployed via `docker-compose.yml` (targets CasaOS). Music is bind-mounted read-only at `/app/music`; user data lives in the `bardic_data` named volume at `/app/data`. Set `JWT_SECRET` and `MUSIC_FOLDERS` env vars in production.

## Architecture

### Backend (`server.js`, single file)
Express app on port 3000. Responsibilities:
- **Auth**: `POST /api/auth/register`, `POST /api/auth/login` — bcrypt hashes + JWT (7-day expiry). `JWT_SECRET` from env, else a random per-boot secret (tokens then die on restart).
- **Per-user data**: `GET`/`PUT /api/campaigns` — gated by `verifyToken()` (Bearer header). Each user's campaigns are stored as a single JSON file at `data/campaigns/<userId>.json`; users live in `data/users.json`. There is no database.
- **Music scanning**: `GET /api/files?folder=...` scans a folder recursively for supported audio formats; `GET /api/server-config` exposes the `MUSIC_FOLDERS` env var to the client; `GET /api/music-tree` walks `music/`.
- **Static serving**: `express.static('.')` serves the whole project root. `/data` is explicitly 403'd **before** the static middleware to keep user files private. Absolute configured folders are served via the `/absolute-music/<alias>/...` middleware (aliases are registered in `absoluteFoldersMap` when `/api/files` scans an absolute path).
- Supported audio extensions are defined in `SUPPORTED_FORMATS` in `server.js` (mirror the list in `config.js` / `configManager.js` if you change it).

### Frontend (`js/`, plain `<script>` globals — each class is attached to `window`)
`app.js` is the controller wired up on `DOMContentLoaded`; it instantiates all managers and connects them via **callback properties** (e.g. `player.onTrackEnd`, `playlist.onTrackChange`, `fileExplorer.onAddTrack`). There is no event bus — data flows through these assigned callbacks, and the managers never reference each other directly.

The five collaborating classes:
- **`UserManager`** (`userManager.js`) — login/register against the API, stores `bardic-token` + `bardic-username` in localStorage.
- **`CampaignManager`** (`campaignManager.js`) — the source of truth for persisted data: campaigns, their tracks, descriptions, and tags. Loads/saves via the `/api/campaigns` endpoints (`save()` is fire-and-forget). **Stores only serializable track metadata, never the browser `File` object.**
- **`Playlist`** (`playlist.js`) — the *temporary* in-memory playback queue (modes: `manual` / `sequential` / `shuffle`). Not persisted; dedupes by `track.path`.
- **`AudioPlayer`** (`player.js`) — HTML5 Audio wrapper. `loadTrack()` resolves the source in priority order: `track.file` (local `File` → object URL) → `track.src` (server URL) → `track.path`.
- **`FileExplorer`** (`fileExplorer.js`) — the import modal's folder tree.
- **`ConfigManager`** (`configManager.js`) — preloads music folders; priority is `MUSIC_FOLDERS` env (via `/api/server-config`) **over** the local `config.js`.

### The key data-flow concept: tracks lose their `File` on persistence
A track imported through `FileExplorer` carries a live `File` object. When `CampaignManager` saves it, only metadata is kept. So to actually *play* a library track later, `app.js`'s `getPlayableTrack()` re-hydrates it by looking the path back up in `fileExplorer.files` to recover the `File` (or falls back to the server `src`). When touching playback or import flows, preserve this re-hydration step.

### Persisted data model
Server-side `data/campaigns/<userId>.json`:
```
{ activeCampaignId, campaigns: [ { id, name, createdAt, tracks: [ { path, name, displayName, folder, description, src, extension, tags:[tagId] } ], tags: [ { id, name, color } ] } ] }
```
`localStorage` holds only the session token/username and playback prefs (`bardicTunes_volume`, `bardicTunes_playbackMode`, `bardicTunes_loop`). Campaign data is **not** in localStorage despite older docs — it moved server-side.

## Conventions
- Vanilla JS only, ES6+ classes, no frameworks or dependencies on the frontend. Each class file ends with `window.ClassName = ClassName`.
- Keep the dark-fantasy visual theme (CSS variables in `css/styles.css`; Cinzel/Crimson Text fonts).
- All user-facing HTML strings are built by string concatenation in `app.js`; user-supplied text must go through `escapeHtml()`.
- `CONTEXT.md` is the project's long-form design doc (partly out of date re: localStorage — server persistence is current). `.github/copilot-instructions.md` asks contributors to keep `CONTEXT.md` updated when adding features.
