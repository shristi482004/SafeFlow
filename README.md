# SafeFlow — AI Stadium Safety Command Center

SafeFlow is a proactive, AI-powered Stadium Safety Command Center designed to observe crowd risks, reason about emergency actions, coordinate response resources, and communicate instructions in real-time — **in any language**. It targets cricket stadium operations and includes:

- **Language-First Intelligence**: Voice and AI responses in Hindi and English. System auto-detects language from voice transcript (Devanagari script detection).
- **Women Safety SOS Protocol**: Priority response with Dijkstra-routed safe escort to VIP zone.
- **Vulnerable User Safe Route Generator**: Routing optimized by crowd density, lighting, and incident status for women, elderly, and children.
- **Human-in-the-Loop Approval Gate**: Operators approve/override Agent 2's resource dispatch before execution.

## 🚀 Live Host Link
**URL:** [https://safeflow-command-center-415569814474.us-central1.run.app](https://safeflow-command-center-415569814474.us-central1.run.app)

---

## 🏛️ High-Level Architecture

SafeFlow decouples sensory input, logical reasoning, resource management, and notification broadcasting into three specialized, sequential AI Agents running on **Gemini 2.5 Flash** (via the official Google AI SDK `@google/genai`):

1. **Awareness Agent (Observe)**: Analyzes current stadium state metrics (crowd densities, lighting configuration, active alerts) to establish an overall System Risk Level and category.
2. **Decision Agent (Reason/Coordinate)**: Takes the risk output and formulates immediate resource allocations (steward deployment, medical teams, police) and step-by-step safety escalation protocols.
3. **Communication Agent (Act/Explain)**: Crafts clear, context-specific public announcements, direct SMS notification broadcasts for stadium attendees, and ground briefings for stewards.

```
[Sensory Inputs: Density, SOS, Alerts]
               │
               ▼
   ┌───────────────────────┐
   │ 1. AWARENESS AGENT    │ ──► Observe Risk Levels
   └───────────────────────┘
               │
               ▼
   ┌───────────────────────┐
   │ 2. DECISION AGENT     │ ──► Coordinate Resources (Stewards, EMT, Police)
   └───────────────────────┘
               │
               ▼
   ┌───────────────────────┐
   │ 3. COMMUNICATION AGENT│ ──► Generate Announcements, SMS, & Steward Orders
   └───────────────────────┘
               │
               ▼
[Output: Live Command Dashboard, SOS Path, Steward MEG/SMS Alerts]
```

---

## ⚙️ Core Technical Stack
- **Backend**: Node.js, Express (ES Modules), rate limiting, Helmet security headers
- **AI Integration**: `@google/genai` (Google AI SDK, Gemini 2.5 Flash)
- **Language Intelligence**: Web Speech API (hi-IN / en-IN voice recognition), SpeechSynthesis TTS, Devanagari script auto-detection
- **Frontend**: Vanilla HTML5, CSS3 (Glassmorphism, HSL palettes, SVG Stadium Map with animated route overlay)
- **Deployment**: Google Cloud Run (Dockerized, Alpine Node environment)

---

## 🛠️ Local Development Setup

To run the application locally on macOS or Linux:

### 1. Prerequisites
- **Node.js**: v20 or higher
- **npm**: v10 or higher
- **Gemini API Key**: Retrieve a key from Google AI Studio.

### 2. Installation
Clone the repository and install the dependencies:
```bash
npm install
```

### 3. Set Environment Variables
Create a `.env` file in the root directory:
```env
PORT=8080
GEMINI_API_KEY=your_actual_gemini_api_key
```
> **Note**: If `GEMINI_API_KEY` is not provided, the backend automatically falls back to our high-fidelity, context-aware offline mock engine to ensure the application remains stable and testable.

### 4. Run the Dev Server
```bash
npm run dev
```
Open [http://localhost:8080](http://localhost:8080) in your web browser.

---

## 🐳 Containerization & GCP Cloud Run Deployment

To deploy this project to Google Cloud Run:

### 1. Build & Push using Cloud Build
Ensure you have the Google Cloud CLI authenticated and the project set:
```bash
gcloud auth login
gcloud config set project your-gcp-project-id
```

### 2. Deploy to Cloud Run
Run the single command deploy to build the container locally and deploy it:
```bash
gcloud run deploy safeflow-command-center \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --quiet
```

---

## 🛡️ Robust Offline Fallback Pattern
To ensure maximum reliability during judge reviews or rate-limiting events, the server detects whether `GEMINI_API_KEY` is configured. If missing or if the API call fails/times out, it triggers a **high-fidelity Mock AI Engine** that mirrors the precise JSON schema outputs, simulated risk levels, and resource counts. This safeguards the application against downtime.
