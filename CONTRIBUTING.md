# Contributing to SafeFlow

Thanks for taking an interest. This document covers what you need to know before making changes.

## Setup

No build tools required.

```bash
git clone https://github.com/shristi482004/safeflow.git
cd safeflow
npm install
cp .env.example .env   # add GEMINI_API_KEY if you have one
npm run dev
```

The app is live at `http://localhost:8080`. Every file change is picked up immediately by `node --watch`.

## Project layout

```
public/          Frontend (static files served by Express)
src/backend/     Node.js / Express server
tests/           Node built-in test runner
```

See [README.md](README.md) for the full structure breakdown.

## Running tests

Start the dev server first, then in a second terminal:

```bash
npm test
```

Tests cover auth, role enforcement, and incident API behavior. They require a live server on port 8080.

## Before making visual changes

Read [DESIGN.md](DESIGN.md) first. The color system, spacing tokens, motion rules, and component conventions are documented there. Consistency matters — ad-hoc styles erode the system quickly.

Key rules:
- All colors use OKLCH. No `#hex` or `hsl()` for semantic colors.
- No `border-left` as a colored accent on cards or list items.
- No gradient text (`background-clip: text`).
- All animations use `var(--ease-out)` and respect `prefers-reduced-motion`.

## API changes

The backend uses role-based middleware (`requireRole(['Staff', 'Admin'])`). Any new endpoint should:

1. Be authenticated (all routes after `router.use(authenticate)` are).
2. Have explicit role checks if it affects state.
3. Sanitize string inputs via `sanitizeString()` from `utils/sanitizer.js`.
4. Return consistent error shapes: `{ error: 'message' }`.

## Pull requests

- One concern per PR. A refactor and a feature in the same PR are hard to review.
- Describe what changed and why in the PR body, not just what.
- If you're touching the agent pipeline in `ai.js`, explain how you tested it without a live Gemini key.

## Reporting issues

Open a GitHub issue with:
- What you expected to happen.
- What actually happened.
- Steps to reproduce.
- Your Node.js version and OS.
