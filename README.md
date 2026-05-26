# SafeFlow

**AI-powered safety command center for cricket stadiums.** Monitors crowd density across six sectors, responds to emergencies in English and Hindi, routes people to safety via Dijkstra pathfinding, and coordinates security staff through a human-supervised multi-agent AI pipeline.

[![Live Demo](https://img.shields.io/badge/Live_Demo-GCP_Cloud_Run-4285F4?style=flat-square&logo=googlecloud&logoColor=white)](https://safeflow-command-center-415569814474.us-central1.run.app)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-brightgreen?style=flat-square)](LICENSE)

---

## Live Demo

**[https://safeflow-command-center-415569814474.us-central1.run.app](https://safeflow-command-center-415569814474.us-central1.run.app)**

Three roles are pre-seeded so you can explore from any perspective:

| Role | Email | Password | What you can do |
|---|---|---|---|
| Fan (Spectator) | `fan@safeflow.com` | `fan` | Raise SOS, track your own alert, get safe route guidance, voice assistant |
| Staff (Officer) | `staff@safeflow.com` | `staff` | Live monitor, approve AI actions, resolve/reopen incidents |
| Admin | `admin@safeflow.com` | `admin` | Everything above plus evacuation broadcast and system controls |

> The backend falls back to a high-fidelity offline mock if the Gemini API key is unavailable, so the demo is always functional.

---

## The Problem

Cricket stadiums in India regularly host 50,000+ attendees in compressed, multilingual, low-infrastructure environments. When something goes wrong, three things happen in parallel:

1. Security staff are overwhelmed with fragmented information across a large physical space.
2. Attendees in distress face language barriers and don't know where to go.
3. Response time degrades because no single view shows who is handling what.

SafeFlow addresses this by giving operators a live command view with AI-assisted decision support, while giving attendees direct tools to raise alerts, track their own requests, and receive voice-guided routing in their language.

---

## Features

### Safety and Emergency Response
- **Priority SOS** — Any fan can raise a typed or voice SOS from their sector. The alert enters an active incident queue immediately visible to all staff.
- **SOS Ownership Flow** — The fan who raised an alert can mark it resolved ("Issue handled", "Found child", "False alarm") with an optional note. Officers see "Resolved by User" in the feed and can reopen if needed.
- **Alert Lifecycle** — Every incident moves through a transparent state machine: `Active → Responding → User_Resolved / Officer_Resolved`. Resolved alerts disappear from the map, banner, and dashboard count but stay in the audit log.
- **Human-in-the-Loop Approval Gate** — High-priority AI recommendations (steward dispatch, resource allocation) require explicit Staff/Admin approval before execution. Officers can override or reject.
- **Evacuation Broadcast** — Admin-triggered stadium-wide evacuation with live acknowledgement tracking (acknowledged / total active spectators).

### AI Reasoning Pipeline
- **Three-Agent Gemini 2.5 Flash Orchestration** — three sequential agents run on each incident: Awareness (risk assessment), Decision (resource coordination), Communication (public messaging).
- **Dijkstra Safe Routing** — edge weights are dynamically computed from live crowd density, lighting levels, and active incident status to find the safest path through the stadium sector graph.
- **Structured mock fallback** — when Gemini is unavailable, a schema-identical mock engine returns context-appropriate responses (including Hindi Devanagari outputs), keeping every pipeline stage testable without an API key.

### Accessibility
- **Bilingual voice assistant** (English / Hindi) — voice input via Web Speech API with Devanagari script auto-detection; responses read aloud via SpeechSynthesis in the detected language.
- **Text fallback** — every voice action has an equivalent text input; the app works entirely without microphone access.
- **Large text mode** and **simplified (reduced-animation) mode** are user-selectable from the profile tab.
- **`prefers-reduced-motion`** support: sector pulse, route animation, and SOS indicators all have reduced-motion variants.
- ARIA labels on all interactive elements; semantic HTML throughout.

### Operations (Staff / Admin)
- **Live stadium map** — interactive SVG with per-sector density, lighting, and status overlays. Click any sector for a details popup.
- **Active Incident Feed** — filterable log with severity badges, status timeline, and resolve/reopen controls.
- **Approval queue** — pending AI-recommended actions display agent reasoning before Officers act.
- **Incident history** — full audit trail with timestamps, operator attribution, and resolution notes.

### UX
- **Dark / light theme** — dark default (near-black slate, cyan-blue accent) with a warm cream light mode. Resets to dark on logout.
- **Role-separated interfaces** — Fan and Staff/Admin see completely different views behind the same auth layer.
- **Notification system** — semantically tinted toast stack with cooldown limiting (no spam during rapid state changes).

---

## Screenshots

<!-- Screenshots: paste images inline below. Suggested order:
  Landing  →  Login  →  Fan SOS  →  SOS Active card  →  Safe route
  Staff monitor  →  Approval gate  →  Agent pipeline  →  Voice Hindi  →  Dark/light theme
-->
### Landing
<img width="1470" height="768" alt="image" src="https://github.com/user-attachments/assets/7944cafa-4188-4ade-a5b7-16663f830b62" />
<img width="1470" height="603" alt="image" src="https://github.com/user-attachments/assets/a47a1b2c-77c3-4e91-8ebc-a81ca75f7fea" />
<img width="1470" height="603" alt="image" src="https://github.com/user-attachments/assets/1d624940-d85f-4154-81e4-616146f73ae5" />
<img width="1470" height="675" alt="image" src="https://github.com/user-attachments/assets/3d7f8f62-b1ff-440e-86ca-eb8d68368222" />
<img width="1470" height="626" alt="image" src="https://github.com/user-attachments/assets/29befe85-c05d-48da-b1c7-0a6ac78b7e2f" />
<img width="1470" height="584" alt="image" src="https://github.com/user-attachments/assets/2e7505fe-cd57-4101-bd1c-bd5096410454" />



### Onboarding
<img width="1470" height="603" alt="image" src="https://github.com/user-attachments/assets/ce9b0a8f-65ab-45b4-92ac-975b06dc361f" />
<img width="1470" height="755" alt="image" src="https://github.com/user-attachments/assets/0c355026-bd85-4de7-be4c-ce7ed72061ac" />
<img width="1470" height="755" alt="image" src="https://github.com/user-attachments/assets/7fbab6bf-bc65-464c-a7e9-10e4e038f7dc" />
<img width="1470" height="755" alt="image" src="https://github.com/user-attachments/assets/986df239-d305-4a70-adaa-30944eaa4de6" />


### Fan-side view
<img width="1470" height="816" alt="image" src="https://github.com/user-attachments/assets/8c9d799d-7b33-4450-871e-892412cfaeea" />
<img width="1470" height="816" alt="image" src="https://github.com/user-attachments/assets/331b1c63-ab11-4023-b21f-5c8ad69a7714" />
<img width="1470" height="816" alt="image" src="https://github.com/user-attachments/assets/42621fcb-7bde-4a83-8e26-c999554befeb" />
<img width="1470" height="816" alt="image" src="https://github.com/user-attachments/assets/c35a5672-e531-4cec-bbec-8b69e3e0d87d" />
<img width="1470" height="816" alt="image" src="https://github.com/user-attachments/assets/b171065d-e9fc-465e-ae88-2ff875aa3add" />

### Officer-side view
<img width="1470" height="816" alt="image" src="https://github.com/user-attachments/assets/24a88ffd-cdd1-4fe2-ba8e-41659478b117" />

<img width="1470" height="816" alt="image" src="https://github.com/user-attachments/assets/75bc52c0-f4c2-4c95-86f8-00c9dc6e1998" />
<img width="1470" height="816" alt="image" src="https://github.com/user-attachments/assets/278d8d58-5a32-4bf4-968a-b9ef41027931" />
<img width="1470" height="816" alt="image" src="https://github.com/user-attachments/assets/7fb1154c-b0cb-4032-85fa-fceed91ce47c" />
<img width="1470" height="816" alt="image" src="https://github.com/user-attachments/assets/c053b3eb-ccf9-4d24-8a50-7e16f6e944c9" />

### Administator-side view(Extra authorisation)
<img width="1470" height="816" alt="image" src="https://github.com/user-attachments/assets/77adcd2f-a816-4977-a19e-c9e214912f4d" />
<img width="1470" height="816" alt="image" src="https://github.com/user-attachments/assets/86077132-a026-4945-9270-3908b6acebea" />



---

## Architecture

```
┌──────────────────────────────────────────────────┐
│  Client  (public/)                               │
│  index.html  ·  app.html  ·  JS modules          │
│  app.js  ·  stadium.js  ·  auth.js  ·  constants │
└──────────────────┬───────────────────────────────┘
                   │  REST + JWT  ·  8s polling
┌──────────────────▼───────────────────────────────┐
│  Backend  (src/backend/)                         │
│  Express + Helmet + Rate Limiter                 │
│  routes/api.js  (~25 endpoints, role-gated)      │
│  services/ai.js  ·  services/routing.js          │
│  middleware/auth.js  ·  utils/sanitizer.js       │
└──────────────────┬───────────────────────────────┘
                   │  @google/genai SDK
┌──────────────────▼───────────────────────────────┐
│  Gemini 2.5 Flash                                │
│                                                  │
│  Agent 1: Awareness   risk level, affected zones │
│       ↓                                          │
│  Agent 2: Decision    resources, routing         │
│       ↓                                          │
│  Agent 3: Communication   PA + SMS (EN / HI)     │
└──────────────────────────────────────────────────┘
```

For sequence diagrams, data flows, Dijkstra logic, and deployment topology see [ARCHITECTURE.md](ARCHITECTURE.md).

### Agent pipeline

```
Incident reported (SOS, voice, operator)
          ↓
Agent 1 — Awareness
  in:  sector densities, lighting, incident type
  out: risk level (Low / Medium / High / Critical), affected zones

Agent 2 — Decision
  in:  Agent 1 output + live sector graph
  out: steward / medical / police counts, Dijkstra route

→ Human Gate if High / Critical (Staff must approve)

Agent 3 — Communication
  in:  Agents 1 + 2 + language preference
  out: PA announcement (EN or HI), SMS text, steward briefing (EN)
```

---

## Tech Stack

| Layer | Tech | Why this choice |
|---|---|---|
| **Runtime** | Node.js 20 (ES Modules) | Stateless, minimal footprint. ES Modules let `routing.js` and the frontend share `constants.js` without a build step. |
| **Server** | Express 4 | Familiar, well-documented, no abstraction overhead. Rate limiting and static serving are native plugins. |
| **AI** | Gemini 2.5 Flash via `@google/genai` | Long context window handles chained agent prompts in a single session. Flash tier has acceptable latency for real-time use. |
| **Pathfinding** | Custom Dijkstra (no library) | The algorithm is part of the visible value. Writing it in ~50 lines keeps it auditable and lets dynamic weights (density, lighting, incidents) be adjusted without understanding a library's internals. |
| **Auth** | JWT (HS256, 8h expiry, `jose`-compatible) | Stateless, works without a session store, fits Cloud Run's ephemeral container model. |
| **Frontend** | Vanilla HTML / CSS / JS | No build step, no framework churn. Everything is readable as-is — a recruiter or reviewer can open any file and immediately understand it. |
| **CSS** | OKLCH custom properties | Perceptually uniform color space: contrast ratios are predictable, dark/light switching is clean, chroma scales proportionally. |
| **Security** | Helmet + express-rate-limit + sanitizer | Three distinct layers: HTTP headers, request throttling, input cleaning. Defense in depth for a public endpoint. |
| **Deployment** | Google Cloud Run (Dockerized) | Auto-scales to zero. Cold start < 3s. One-command deploy. Free tier handles demo load. |

---

## Project Structure

```
safeflow/
├── public/                    # Static frontend (served by Express)
│   ├── index.html             # Marketing landing page
│   ├── app.html               # Main SPA (Fan + Staff/Admin views)
│   ├── css/
│   │   ├── app.css            # Design system: OKLCH tokens, dark/light themes
│   │   └── landing.css        # Landing page styles
│   └── js/
│       ├── app.js             # Core client logic, state, voice, incident management
│       ├── stadium.js         # SVG map controller, sector rendering
│       ├── auth.js            # JWT session (localStorage)
│       ├── constants.js       # Shared: sectors, incident types, SOS categories
│       └── notifications.js   # Toast orchestrator with cooldown
│
├── src/backend/
│   ├── server.js              # Express app, middleware stack, static serving
│   ├── routes/
│   │   └── api.js             # All API endpoints with role enforcement
│   ├── services/
│   │   ├── ai.js              # Gemini multi-agent pipeline + mock fallback
│   │   └── routing.js         # Dijkstra implementation with dynamic weights
│   ├── middleware/
│   │   └── auth.js            # JWT verification, user injection
│   └── utils/
│       └── sanitizer.js       # String sanitization (XSS prevention)
│
├── tests/
│   └── api.test.js            # Node built-in test runner
│
├── ARCHITECTURE.md            # Full architecture: diagrams, data flows, Dijkstra
├── DESIGN.md                  # Design system reference: colors, tokens, components
├── Dockerfile                 # Alpine Node 20, production build
├── .env.example               # Required environment variables
└── package.json
```

> `public/js/constants.js` is imported by both the frontend and `src/backend/services/routing.js`. This cross-tier coupling keeps sector graph definitions in sync without duplication. See [Known Trade-offs](#known-trade-offs).

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- A Gemini API key (optional — the mock engine runs without one)

### Installation

```bash
git clone https://github.com/shristi482004/safeflow.git
cd safeflow
npm install
```

### Environment

```bash
cp .env.example .env
# Optionally add your GEMINI_API_KEY
```

Without a key, the app runs on the mock engine. With a key, Gemini 2.5 Flash handles the pipeline.

### Run locally

```bash
npm run dev
```

Open [http://localhost:8080](http://localhost:8080) and use any demo credential from the table above.

### Tests

```bash
# Start the server first (in another terminal)
npm run dev

# Then run tests
npm test
```

---

## Deployment

### Docker (local or any host)

```bash
docker build -t safeflow .
docker run -p 8080:8080 -e GEMINI_API_KEY=your_key safeflow
```

### Google Cloud Run

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

gcloud run deploy safeflow \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=your_key
```

The Dockerfile uses `node:20-alpine` with `npm ci --only=production`. Image size is ~170MB.

---

## Design System

Full reference in [DESIGN.md](DESIGN.md). The most consequential decisions:

**OKLCH colors.** Hue 214 (cyan-blue) for the dark theme primary, hue 158 (sage) for light mode. Chroma is intentionally reduced near the lightness extremes to avoid garish tints. Semantic colors (danger/warning/success) are the only non-neutral colors used outside accent.

**Token architecture.** `--sp-1` through `--sp-6` (4px–24px), `--radius-sm` through `--radius-xl`, `--shadow-sm` through `--shadow-toast`, `--duration-fast` / `--base` / `--slow`. The `body.theme-light` block overrides the full `:root` token set — no `!important`, no component-level hacks.

**Motion constraints.** `cubic-bezier(0.16, 1, 0.3, 1)` for all transitions (ease-out-quart). No bounce or elastic curves. No layout property animations. `prefers-reduced-motion` disables all keyframe animations with explicit static fallback values.

---

## Accessibility Decisions

- Voice and text reach the same features. No action is voice-only.
- Auto-detection switches language on Devanagari input without requiring the user to find a settings toggle.
- Status badges always have a text label — color is not the sole indicator.
- The emergency SOS button uses `btn-pulse` only when the user has not indicated motion sensitivity.
- Tab focus order follows reading order throughout; no `tabindex` gymnastics.

---

## AI Workflow

### What each agent receives

```json
{
  "incident": { "type": "women_sos", "sector": "E", "priority": "Critical" },
  "stadiumSectors": {
    "E": { "density": 78, "lighting": "Low", "status": "SOS Active", "guards": 2 }
  },
  "startSector": "E",
  "destSector": "A",
  "userType": "woman",
  "language": "hi"
}
```

### Agent 1 prompt structure

Instructs the model to reason step-by-step about crowd conditions, assess overall risk, and output structured JSON with `riskLevel`, `riskCategory`, `keyObservations`, and `resourceRecommendation`. Temperature: 0.3 for deterministic risk assessment.

### Agent 2 prompt structure

Receives Agent 1's full output, calls `computeSafeRoute()` (Dijkstra) directly in code, and asks the model to confirm or adjust the route based on its reasoning. Outputs `stewards`, `medical`, `police` counts and `evacuationRecommended`.

### Agent 3 prompt structure

Receives both previous outputs and the language code. Generates three outputs: `publicAnnouncement` (in the user's language), `directUserSMS` (conversational, brief), `stewardBriefing` (English operational instructions). Prompt forbids panic language and enforces calm authority.

---

## Known Trade-offs

**In-memory state.** Incidents and sector data live in server memory. A Cloud Run restart clears everything. Intentional for a stateless demo deployment — a production system would use Firestore or Redis.

**Polling vs. WebSocket.** The client polls `/api/stadium-state` every 8 seconds. This means up to 8 seconds of lag for staff to see co-operator actions. WebSocket would reduce this to near-zero but adds meaningful complexity for a single-operator demo.

**Shared constants file.** `public/js/constants.js` is imported by both the browser and Node.js backend. This is a pragmatic coupling that avoids duplication of sector graph definitions and incident type validation. A production microservice architecture would extract a shared package.

**JWT secret.** Loaded from the environment, not rotated. Acceptable for a demo; a production deployment needs a secrets manager and token revocation.

---

## Future Scope

- **WebSocket real-time** — replace 8s polling for multi-operator coordination.
- **Persistent storage** — Firestore for incident history and user accounts that survive restarts.
- **Expanded language support** — Tamil and Telugu voice modes partially implemented; completing them serves South Indian stadium audiences.
- **Stadium map import** — allow operators to load real seating maps instead of the fixed schematic SVG.
- **PWA / mobile app** — the PWA structure is in place; a native wrapper would improve the fan experience on Android where Web Speech API coverage is inconsistent.

---

## Contributing

No build tools. Edit, refresh, see changes.

1. Fork and clone the repo.
2. `cp .env.example .env` and `npm install`.
3. `npm run dev` to start the dev server.
4. Make your change. No compilation needed.
5. `npm test` to verify auth and role enforcement still pass.
6. Open a PR with a clear description of what changed and why.

Before making visual changes, read [DESIGN.md](DESIGN.md). The color system, motion rules, and component conventions are documented there — they exist for consistency reasons, not preference.

---

## License

[MIT](LICENSE)

---

*SafeFlow was built to address a real coordination problem in large Indian cricket stadiums, where language barriers, poor lighting, and fragmented communication slow emergency response. The AI pipeline is a tool for faster human decisions, not a replacement for them.*
