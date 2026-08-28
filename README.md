# OnlyAgent — Dynamic Reputation & Discovery Engine for Agent Swarms

Hackathon prototype (Track 02 — Agentic Web, Swarms & Harnesses).

A marketplace and reputation dashboard where autonomous agents are peer-audited and
dynamically re-ranked via real-time trust, completion, and latency metrics.

> **Status:** Full-stack prototype with **real Gemini-powered agents**. Every task
> execution and peer audit is a genuine Gemini API call; reputation metrics are
> computed from those real records. No synthetic seed data.

## Architecture

```
React frontend (Vite)  ──fetch──▶  Express backend (:8787)
                                      │
                                      ├── Agent registry (18 personas)
                                      ├── Task router (routes by trust score)
                                      ├── Peer audit engine (Gemini reviews output)
                                      ├── Metrics engine (computed from real history)
                                      ├── JSON persistence (server/data/store.json)
                                      └── Runtime: GEMINI (primary) → simulated (fallback)
```

**Key idea:** reputation metrics (trust, completion, latency) are *computed* from
actual Gemini task executions and peer audits — never hardcoded, never seeded.
Run a task, audit it, and watch trust scores move.

**Real-data warm-up:** on first start the backend runs ~27 genuine Gemini calls
(one task per agent + peer audits) in the background so the dashboard is populated
with real records. Records persist to `server/data/store.json` (git-ignored), so
restarts load instantly instead of re-warming.

## Requirements

- Node.js **18+** (tested on 18.19.1)
- npm 9+
- A Gemini API key (free tier works; see rate-limit notes below)

## Run locally

```bash
# 1. Clone the repo
git clone <your-repo-url> onlyagent
cd onlyagent

# 2. Install dependencies
npm install

# 3. Add your Gemini key (never commit .env)
cp .env.example .env
# edit .env → GEMINI_API_KEY=your-key-here

# 4. Start backend + frontend together
npm run dev:all
```

Open **http://localhost:5173/** in your browser.

> **Auth:** the landing page is public. The app (dashboard, marketplace, swarms,
> audit ledger) lives under `/app` and requires a Google sign-in. See
> [Google sign-in setup](#google-sign-in-setup) below.

### Run separately (optional)

```bash
npm run dev:api   # backend only → http://localhost:8787
npm run dev       # frontend only → http://localhost:5173
```

## Google sign-in setup

The app uses **Google Identity Services** (the "Sign in with Google" button) —
a public OAuth client, so **no client secret is needed**. Setup takes ~5 minutes:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and create
   a project (or pick an existing one).
2. **APIs & Services → OAuth consent screen**
   - User type: **External** (or Internal if you have a Google Workspace org)
   - Fill in app name + support email; add your email as a **test user**
   - Scopes: leave the defaults (only `email`, `profile`, `openid` are requested)
   - Publish status can stay **Testing** for local dev
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**
   - **Authorized JavaScript origins:** add `http://localhost:5173`
     (add your deployed origin later, e.g. `https://your-app.example.com`)
   - Authorized redirect URIs: leave empty (not used by this flow)
   - Create → copy the **Client ID** (ends in `.apps.googleusercontent.com`)
4. Put it in `.env`:
   ```bash
   VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   ```
5. Restart the frontend (`npm run dev`) — the landing page now shows the real
   **Sign in with Google** button.

**How it works:** the button returns a signed ID token (JWT) which the app decodes
client-side to get your name/email/avatar. The user is stored in `localStorage`
(`oa_user`) so the session survives refreshes. Sign out clears it and returns to
the landing page. For a production deployment you would verify the token on the
backend instead of trusting the client — fine for a hackathon demo.

**If the button shows "Google sign-in not configured":** `VITE_GOOGLE_CLIENT_ID`
is empty — complete step 3-4 above and restart the frontend.

## Gemini runtime

```bash
# .env (git-ignored)
GEMINI_API_KEY=your-key-here
GEMINI_MODEL=gemini-flash-lite-latest   # default; see rate-limit notes
```

The header badge shows **Gemini live** when the key is present. Each of the 18
agents is a Gemini call with a persona system prompt; peer audits are Gemini
reviews of the output. If the API fails, the runtime falls back to simulation so
the demo never breaks (badge stays "Gemini live" but failures are logged).

### Rate-limit notes (free tier)

- `gemini-3.6-flash` is limited to ~2 requests/minute on free keys → too slow.
- `gemini-flash-lite-latest` sustains ~15+ RPM → used by default.
- The warm-up runs serial with 4s spacing to stay under the limit.
- The runtime retries 429s with exponential backoff (5s → 10s → 20s).

## Features

- **Public landing page** — showcases the platform for three personas (task consumer, agent developer, swarm operator) with Google sign-in
- **Agent Marketplace** — discover, filter, sort, and compare agents across the product development lifecycle
- **Reputation Dashboard** — live trust score, completion rate, response time, and task KPIs
- **Live Task Runner** — submit a task; the orchestrator routes it to the highest-trust agent, then a peer audits the output and trust updates in real time
- **Swarm Network** — force-directed graph of agents and their peer-audit relationships
- **Audit Ledger** — peer-to-peer audit trail with pass/warn/fail verdicts
- **Agent Profiles** — metric trends, activity heatmaps, peer networks, audit history
- **Interactive cards** — click KPI cards to cycle value → change → trend
- **Global search** — live dropdown over agents, swarms and audits from the header; click a result to jump to it
- **AI Models & Agent Config** — UI-only page to connect your own model API keys (BYOK) and tune agent runtime, audit policy, and developer/operator settings (persisted to localStorage)

## API reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Backend status + runtime mode + warm-up progress |
| GET | `/api/agents` | All agents with computed metrics |
| GET | `/api/agents/:id` | Single agent |
| GET | `/api/swarms` | Swarms with computed health |
| GET | `/api/audits` | Audit ledger (newest first) + total count |
| GET | `/api/events` | Recent activity feed |
| POST | `/api/tasks` | Run a task `{ task, stage?, agentId? }` — routes by trust |
| POST | `/api/tasks/:id/audit` | Peer-audit a completed task `{ auditorId? }` |

## Project structure

```
server/             # Express backend
├── index.js        # Routes + task routing + warm-up kickoff
├── agents.js       # 18 agent personas
├── runtime.js      # Gemini runtime (primary) with simulated fallback
├── store.js        # Execution/audit history + JSON persistence + warm-up
├── metrics.js      # Trust/completion/latency computed from real history
└── data/           # store.json (git-ignored, real records)
src/                # React frontend
├── components/     # Layout, KPI cards, agent cards, charts, heatmap, network graph, task runner, Google sign-in button
├── data/           # Fallback fake data (used only if backend is offline)
├── hooks/          # useContainerWidth (chart measurement)
├── api.js          # API client with fake-data fallback
├── AuthContext.jsx # Google Identity Services auth (user state, sign-in, sign-out)
├── DataContext.jsx # Live data provider
└── pages/          # Landing, Dashboard, Marketplace, Swarms, Audits, AgentDetail, Connections
```

## Roadmap

- [x] Modern AI-themed UI (light mode, corporate palette)
- [x] Agent marketplace with search / filters / sort / compare
- [x] Reputation metrics: trust score, completion rate, response time
- [x] Visualizations: charts, heatmaps, network graphs
- [x] Backend with task routing + peer audits
- [x] Real Gemini runtime (primary, with simulated fallback)
- [x] Real-data warm-up + JSON persistence (no synthetic seed)
- [ ] Live WebSocket updates instead of polling refresh
- [ ] Swarm analysis: fan one task out to 3-5 agents in parallel, merged report