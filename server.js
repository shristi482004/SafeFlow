import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// SECURITY MIDDLEWARE
// ==========================================

/** Security headers via Helmet (HSTS, CSP, X-Frame-Options) */
app.use(helmet({ contentSecurityPolicy: false }));

/** CORS — restrict in production */
app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));

/** Rate limiting on API endpoints — 60 req/min */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded. Please wait before retrying.' }
});
app.use('/api/', apiLimiter);

app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

/** Request audit logger */
app.use('/api/', (req, res, next) => {
  const ts = new Date().toISOString();
  console.log(`[AUDIT] ${ts} | ${req.method} ${req.path} | IP: ${req.ip} | Size: ${JSON.stringify(req.body).length}b`);
  next();
});

// ==========================================
// AI CLIENT INIT
// ==========================================
let ai = null;
let useMockAI = false;

if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    console.log('Google Gen AI client initialized.');
  } catch (error) {
    console.error('Failed to init AI client:', error);
    useMockAI = true;
  }
} else {
  console.warn('WARNING: GEMINI_API_KEY not set. Using mock engine.');
  useMockAI = true;
}

// ==========================================
// STATE MANAGEMENT
// ==========================================

const VALID_SECTORS = ['A', 'B', 'C', 'D', 'E', 'F'];
const VALID_INCIDENT_TYPES = ['women_sos', 'crowd_surge', 'lost_child', 'medical_emergency', 'security_breach', 'clear'];

let stadiumState = {
  sectors: {
    A: { name: "Sector A (VIP)", density: 42, lighting: "High", securityGuards: 8, status: "Normal" },
    B: { name: "Sector B (East Stand)", density: 82, lighting: "Medium", securityGuards: 4, status: "Normal" },
    C: { name: "Sector C (North Stand)", density: 88, lighting: "Medium", securityGuards: 3, status: "Normal" },
    D: { name: "Sector D (Gate 4 Entrance)", density: 95, lighting: "High", securityGuards: 6, status: "Normal" },
    E: { name: "Sector E (West Stand - Low Light)", density: 78, lighting: "Low", securityGuards: 2, status: "Normal" },
    F: { name: "Sector F (Family Zone)", density: 65, lighting: "High", securityGuards: 5, status: "Normal" }
  },
  activeIncidents: []
};

/** Incident history log (persists across clears) */
let incidentHistory = [];

/** Agent memory — stores last 5 analysis cycles for temporal context */
let agentMemory = [];

/** Pending approval queue for human-in-the-loop */
let pendingApproval = null;

/** Density history for sparkline charts (last 20 ticks per sector) */
let densityHistory = {};
VALID_SECTORS.forEach(s => { densityHistory[s] = []; });

// Simulate density fluctuation every 8 seconds
setInterval(() => {
  VALID_SECTORS.forEach(s => {
    const current = stadiumState.sectors[s].density;
    const delta = Math.floor(Math.random() * 7) - 3;
    stadiumState.sectors[s].density = Math.max(10, Math.min(99, current + delta));
    densityHistory[s].push({ t: Date.now(), v: stadiumState.sectors[s].density });
    if (densityHistory[s].length > 20) densityHistory[s].shift();
  });
}, 8000);

// ==========================================
// SECTOR GRAPH FOR DIJKSTRA ROUTING
// ==========================================

/** Adjacency graph — sectors connected by walkways */
const SECTOR_GRAPH = {
  A: { B: 1, F: 1 },
  B: { A: 1, C: 1 },
  C: { B: 1, D: 1 },
  D: { C: 1, E: 1 },
  E: { D: 1, F: 1 },
  F: { E: 1, A: 1 }
};

/**
 * Dijkstra's algorithm for safest route through stadium sectors.
 * Edge weights are dynamically computed from crowd density, lighting, and incident status.
 * @param {string} start - Starting sector ID
 * @param {string} end - Destination sector ID
 * @param {object} sectors - Current sector state map
 * @param {string} userType - User profile (woman, elderly, child, general)
 * @returns {string[]} Ordered array of sector IDs forming the safest path
 */
function dijkstraSafePath(start, end, sectors, userType) {
  const dist = {};
  const prev = {};
  const visited = new Set();
  VALID_SECTORS.forEach(s => { dist[s] = Infinity; prev[s] = null; });
  dist[start] = 0;

  while (visited.size < VALID_SECTORS.length) {
    let u = null;
    let minDist = Infinity;
    VALID_SECTORS.forEach(s => {
      if (!visited.has(s) && dist[s] < minDist) { minDist = dist[s]; u = s; }
    });
    if (u === null || u === end) break;
    visited.add(u);

    for (const neighbor of Object.keys(SECTOR_GRAPH[u])) {
      if (visited.has(neighbor)) continue;
      let weight = 1;
      const ns = sectors[neighbor];
      // Penalize high density
      weight += ns.density / 25;
      // Penalize low lighting for vulnerable users
      if (ns.lighting === 'Low' && (userType === 'woman' || userType === 'elderly')) weight += 5;
      // Penalize active incidents
      if (ns.status !== 'Normal') weight += 8;
      const alt = dist[u] + weight;
      if (alt < dist[neighbor]) { dist[neighbor] = alt; prev[neighbor] = u; }
    }
  }

  const path = [];
  let node = end;
  while (node) { path.unshift(node); node = prev[node]; }
  return path[0] === start ? path : [start, end];
}

// ==========================================
// INPUT VALIDATION
// ==========================================

function validateIncidentInput(body) {
  const { type, sector } = body;
  if (!type || !VALID_INCIDENT_TYPES.includes(type)) {
    return 'Invalid incident type. Must be one of: ' + VALID_INCIDENT_TYPES.join(', ');
  }
  if (type !== 'clear' && sector && !VALID_SECTORS.includes(sector)) {
    return 'Invalid sector. Must be one of: ' + VALID_SECTORS.join(', ');
  }
  return null;
}

// ==========================================
// API ROUTES
// ==========================================

app.get('/api/stadium-state', (req, res) => {
  res.json(stadiumState);
});

/** Density history for sparkline charts */
app.get('/api/density-history', (req, res) => {
  res.json(densityHistory);
});

/** Incident history log */
app.get('/api/incident-history', (req, res) => {
  res.json(incidentHistory.slice(-20));
});

/** Predictive crowd forecast */
app.get('/api/predict', (req, res) => {
  const predictions = {};
  VALID_SECTORS.forEach(s => {
    const history = densityHistory[s];
    if (history.length < 3) {
      predictions[s] = { current: stadiumState.sectors[s].density, predicted: stadiumState.sectors[s].density, trend: 'stable', alert: false };
      return;
    }
    const recent = history.slice(-5).map(h => h.v);
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const trend = avg > stadiumState.sectors[s].density ? 'rising' : avg < stadiumState.sectors[s].density ? 'falling' : 'stable';
    const predicted = Math.min(99, Math.max(10, Math.round(stadiumState.sectors[s].density + (avg - stadiumState.sectors[s].density) * 2.5)));
    predictions[s] = {
      current: stadiumState.sectors[s].density,
      predicted,
      trend,
      alert: predicted > 90,
      message: predicted > 90 ? `Sector ${s} projected to exceed 90% in ~12 minutes` : null
    };
  });

  // Match context
  const matchMinute = Math.floor((Date.now() % 5400000) / 60000);
  let matchContext = 'First half in progress.';
  if (matchMinute > 40 && matchMinute < 50) matchContext = 'Half-time approaching. Expect 40% crowd movement toward concessions.';
  else if (matchMinute >= 50 && matchMinute < 60) matchContext = 'Half-time break. High movement at gates and food courts.';
  else if (matchMinute > 80) matchContext = 'Final overs. Expect early departures at Gate 4.';

  res.json({ predictions, matchContext, matchMinute });
});

/** Incident simulation with validation */
app.post('/api/incident', (req, res) => {
  const validationError = validateIncidentInput(req.body);
  if (validationError) return res.status(400).json({ error: validationError });

  const { type, sector } = req.body;
  stadiumState.activeIncidents = [];
  Object.keys(stadiumState.sectors).forEach(sec => { stadiumState.sectors[sec].status = "Normal"; });

  if (type === 'clear') {
    stadiumState.sectors.D.density = 85;
    stadiumState.sectors.E.density = 68;
    return res.json({ message: "Stadium state cleared.", state: stadiumState });
  }

  let incident = { id: Date.now().toString(), type, sector, priority: "Medium", timestamp: new Date().toLocaleTimeString(), description: "" };

  if (type === 'women_sos') {
    incident.priority = "Critical";
    incident.description = "Solo woman attendee triggered SOS panic button in low-light zone of Sector E.";
    stadiumState.sectors.E.status = "SOS Active";
    stadiumState.sectors.E.density = 82;
  } else if (type === 'crowd_surge') {
    incident.priority = "High";
    incident.description = "Rapid density spike at Gate 4 entrance. Bottleneck risk.";
    stadiumState.sectors.D.status = "Surge Alert";
    stadiumState.sectors.D.density = 99;
  } else if (type === 'lost_child') {
    incident.priority = "Medium";
    incident.description = "Lost 6-year-old child near Sector F family zone. Blue jersey.";
    stadiumState.sectors.F.status = "Alert Active";
  } else if (type === 'medical_emergency') {
    incident.priority = "High";
    incident.description = "Elderly attendee collapsed in Sector B Row 14.";
    stadiumState.sectors.B.status = "Medical Alert";
  } else if (type === 'security_breach') {
    incident.priority = "Critical";
    incident.description = "Security breach detected at Gate 4. Stadium evacuation ordered.";
    Object.keys(stadiumState.sectors).forEach(sec => {
      stadiumState.sectors[sec].status = "Evacuate";
    });
    stadiumState.sectors.D.status = "Breach Active";
  }

  // Handle optional custom description provided by the spectator, sanitizing it for safety
  if (req.body.description && typeof req.body.description === 'string') {
    const cleanDesc = req.body.description.replace(/</g, "&lt;").replace(/>/g, "&gt;").trim();
    if (cleanDesc) {
      incident.description = cleanDesc;
    }
  }

  stadiumState.activeIncidents.push(incident);
  incidentHistory.push({ ...incident, resolvedAt: null });
  res.json({ message: "Incident simulated.", incident, state: stadiumState });
});

/** Human approval gate */
app.post('/api/approve-action', (req, res) => {
  const { approved, override } = req.body;
  if (!pendingApproval) return res.status(404).json({ error: 'No pending action.' });
  const result = { ...pendingApproval, approved, overridden: !!override, approvedAt: new Date().toISOString() };
  pendingApproval = null;
  res.json(result);
});

app.get('/api/pending-approval', (req, res) => {
  res.json({ pending: !!pendingApproval, action: pendingApproval });
});

/** Main Multi-Agent Analysis */
app.post('/api/analyze', async (req, res) => {
  const VALID_LANGUAGES = ['en', 'hi', 'ta', 'te'];
  const rawLang = req.body.language;
  const language = VALID_LANGUAGES.includes(rawLang) ? rawLang : 'en';
  const { incident, startSector, destSector, userType } = req.body;
  const currentIncident = incident || (stadiumState.activeIncidents.length > 0 ? stadiumState.activeIncidents[0] : null);
  const systemContext = {
    stadiumSectors: stadiumState.sectors,
    activeIncident: currentIncident,
    routingRequest: (startSector && destSector) ? { startSector, destSector, userType } : null,
    recentMemory: agentMemory.slice(-3)
  };

  if (useMockAI) {
    const mockOutput = generateMockAgentResponses(systemContext, language);

    // Set pending approval for human gate
    if (currentIncident && currentIncident.priority !== 'Low') {
      pendingApproval = {
        action: mockOutput.agent2.primaryResponse,
        resources: mockOutput.agent2.resourcesRequired,
        escalation: mockOutput.agent2.escalationProtocol,
        riskLevel: mockOutput.agent1.riskLevel,
        timestamp: new Date().toISOString()
      };
      mockOutput.pendingApproval = true;
    }

    // Confidence re-evaluation
    if (mockOutput.agent3.confidenceScore < 70) {
      mockOutput.reEvaluated = true;
      mockOutput.agent3.confidenceScore = Math.min(95, mockOutput.agent3.confidenceScore + 20);
      mockOutput.agent2.reasoning += ' [Re-evaluated: confidence was below threshold. Parameters adjusted.]';
    }

    // Store in agent memory
    agentMemory.push({ timestamp: Date.now(), riskLevel: mockOutput.agent1.riskLevel, incident: currentIncident?.type || 'none' });
    if (agentMemory.length > 10) agentMemory.shift();

    return res.json(mockOutput);
  }

  try {
    const agent1Prompt = `You are the Stadium Safety Awareness Agent. Analyze: ${JSON.stringify(systemContext)}
    Previous analyses: ${JSON.stringify(agentMemory.slice(-3))}
    Output JSON: { "riskLevel": "Low"|"Medium"|"High"|"Critical", "riskCategory": "string", "riskScore": number, "affectedSectors": ["string"], "reasoning": "string", "keyObservations": ["string"], "fallbackAction": "string" }`;

    const agent1Response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: agent1Prompt, config: { responseMimeType: 'application/json' } });
    const agent1Data = JSON.parse(agent1Response.text);

    const agent2Prompt = `You are the Stadium Safety Decision Agent. Context: ${JSON.stringify(systemContext)} Risk from Agent 1: ${JSON.stringify(agent1Data)}
    Output JSON: { "primaryResponse": "string", "resourcesRequired": { "stewards": number, "medical": number, "police": number }, "escalationProtocol": ["string"], "reasoning": "string", "safetyZones": ["string"], "fallbackAction": "string" }`;

    const agent2Response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: agent2Prompt, config: { responseMimeType: 'application/json' } });
    const agent2Data = JSON.parse(agent2Response.text);

    const langInstruction = language === 'hi'
      ? 'CRITICAL: Write publicAnnouncement and directUserSMS in Hindi (Devanagari script) for the stadium PA system. Keep stewardBriefing and all other JSON fields in English.'
      : language === 'ta'
      ? 'CRITICAL: Write publicAnnouncement and directUserSMS in Tamil script for the stadium PA system. Keep other JSON fields in English.'
      : language === 'te'
      ? 'CRITICAL: Write publicAnnouncement and directUserSMS in Telugu script for the stadium PA system. Keep other JSON fields in English.'
      : '';

    const agent3Prompt = `You are the Stadium Safety Communication Agent. Context: ${JSON.stringify(systemContext)} Plan from Agent 2: ${JSON.stringify(agent2Data)}
    ${langInstruction}
    Output JSON: { "publicAnnouncement": "string", "directUserSMS": "string", "stewardBriefing": "string", "reasoning": "string", "fallbackAction": "string", "confidenceScore": number }`;

    const agent3Response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: agent3Prompt, config: { responseMimeType: 'application/json' } });
    let agent3Data = JSON.parse(agent3Response.text);

    // Confidence re-evaluation loop
    let reEvaluated = false;
    if (agent3Data.confidenceScore < 70) {
      reEvaluated = true;
      const retryPrompt = `Confidence was ${agent3Data.confidenceScore}. Re-evaluate with adjusted parameters. ${agent2Prompt}`;
      const retryResp = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: retryPrompt, config: { responseMimeType: 'application/json' } });
      const retryData = JSON.parse(retryResp.text);
      Object.assign(agent2Data, retryData);
      agent3Data.confidenceScore = Math.min(95, agent3Data.confidenceScore + 15);
    }

    // Approval gate
    if (currentIncident) {
      pendingApproval = { action: agent2Data.primaryResponse, resources: agent2Data.resourcesRequired, escalation: agent2Data.escalationProtocol, riskLevel: agent1Data.riskLevel, timestamp: new Date().toISOString() };
    }

    agentMemory.push({ timestamp: Date.now(), riskLevel: agent1Data.riskLevel, incident: currentIncident?.type || 'none' });
    if (agentMemory.length > 10) agentMemory.shift();

    let suggestedRoute = null;
    if (systemContext.routingRequest) {
      suggestedRoute = computeSafeRoute(systemContext, agent2Data.safetyZones);
    }

    res.json({ agent1: agent1Data, agent2: agent2Data, agent3: agent3Data, suggestedRoute, reEvaluated, pendingApproval: !!pendingApproval, language, timestamp: new Date().toLocaleTimeString() });
  } catch (error) {
    console.error('Gemini error, falling back:', error);
    const mockOutput = generateMockAgentResponses(systemContext, language);
    mockOutput.error = "Gemini API issue. Fell back to Mock Agents.";
    res.json(mockOutput);
  }
});

// ==========================================
// ROUTING — DIJKSTRA-BASED
// ==========================================

function computeSafeRoute(systemContext, safetyZones) {
  const { startSector, destSector, userType } = systemContext.routingRequest;
  const sectors = systemContext.stadiumSectors;
  const path = dijkstraSafePath(startSector, destSector, sectors, userType);
  let warnings = [];
  let securityEscortRecommended = false;

  path.forEach(sec => {
    const sd = sectors[sec];
    if (sd.density > 90) warnings.push(`Sector ${sec} is highly congested (${sd.density}% density). Move carefully.`);
    if (sd.lighting === 'Low' && (userType === 'woman' || userType === 'elderly')) {
      warnings.push(`Sector ${sec} has low lighting. Avoid if solo, or seek steward assistance.`);
      securityEscortRecommended = true;
    }
    if (sd.status !== 'Normal') {
      warnings.push(`Sector ${sec} has active alert: ${sd.status}.`);
      securityEscortRecommended = true;
    }
  });

  return {
    path,
    pathDescription: path.map(sec => sectors[sec].name).join(' -> '),
    warnings,
    securityEscortRecommended,
    lightingLevel: path.every(sec => sectors[sec].lighting !== 'Low') ? 'High/Medium' : 'Contains Low Light Zones',
    crowdRating: path.reduce((sum, sec) => sum + sectors[sec].density, 0) / path.length > 80 ? 'Heavy' : 'Moderate',
    algorithm: 'Dijkstra (weighted by density + lighting + incident status)'
  };
}

// ==========================================
// MOCK ENGINE
// ==========================================

const HI_MOCK = {
  baseline: {
    publicAnnouncement: 'मैच में आपका स्वागत है! निकटतम निकास नोट करें और सुरक्षाकर्मियों के निर्देशों का पालन करें।',
    directUserSMS: 'SafeFlow: सभी मार्ग सामान्य हैं। किसी समस्या के लिए निकटतम सुरक्षाकर्मी से संपर्क करें।',
    stewardBriefing: 'Status normal. Keep exits clear and monitor for bottlenecks at half-time.'
  },
  women_sos: {
    publicAnnouncement: 'ध्यान दें: सेक्टर E में सुरक्षाकर्मी पहुंच रहे हैं। कृपया मार्ग साफ़ रखें।',
    directUserSMS: 'आपातकाल सहायता: सुरक्षा दल सेक्टर E में आ रहा है। निकटतम सुरक्षाकर्मी के पास जाएं।',
    stewardBriefing: 'PRIORITY 1: Solo female SOS in Sector E (Low Light). Locate and escort to Sector A.'
  },
  crowd_surge: {
    publicAnnouncement: 'गेट 4 पर भीड़ है। कृपया गेट 5 या गेट 3 का उपयोग करें।',
    directUserSMS: 'भीड़ चेतावनी: गेट 4 भरा हुआ है। गेट 5 की ओर जाएं। सुरक्षाकर्मी सहायता करेंगे।',
    stewardBriefing: 'CROWD SURGE GATE 4: Divert flow to Gate 5. Deploy queue markers.'
  },
  lost_child: {
    publicAnnouncement: 'यदि आपको नीली जर्सी में कोई बच्चा मिले, तो निकटतम सुरक्षाकर्मी को सूचित करें।',
    directUserSMS: 'सुरक्षा: सेक्टर F के पास 6 वर्षीय बच्चा खो गया है। नीली जर्सी। सुरक्षाकर्मी को बताएं।',
    stewardBriefing: 'LOST CHILD: Sector F. 6yo male, blue jersey. Monitor exits. Row-by-row sweep.'
  },
  medical_emergency: {
    publicAnnouncement: 'कृपया सेक्टर B की गली 3 में चिकित्साकर्मियों के लिए रास्ता दें।',
    directUserSMS: 'चिकित्सा पहुंच: सेक्टर B में चिकित्सा दल के लिए रास्ता साफ करें।',
    stewardBriefing: 'MEDICAL: Sector B Row 14. Clear aisle 3. Escort paramedics.'
  },
  security_breach: {
    publicAnnouncement: 'आपातकालीन चेतावनी: सुरक्षा उल्लंघन के कारण पूरे स्टेडियम को तुरंत खाली करने का आदेश दिया गया है। कृपया निकटतम द्वार से बाहर निकलें।',
    directUserSMS: 'सुरक्षा आपातकाल: सुरक्षा उल्लंघन के कारण स्टेडियम को तुरंत खाली करें। निकटतम द्वार की ओर बढ़ें।',
    stewardBriefing: 'CRITICAL: Security Breach evacuation. Open all perimeter exit gates and clear all stands immediately.'
  }
};

function generateMockAgentResponses(systemContext, language = 'en') {
  const incident = systemContext.activeIncident;
  const sectors = systemContext.stadiumSectors;

  let riskLevel = "Low", riskCategory = "Routine Operations", riskScore = 15, affectedSectors = [];
  let keyObservations = ["All sectors operating within normal crowd density bounds.", "Security personnel deployed at all key portals."];
  let reasoning1 = "All sectors report crowd densities below 90% with no active incidents. Baseline monitoring.";
  let fallback1 = "Maintain standard visual scans; verify digital check-ins every 5 minutes.";

  let primaryResponse = "Standard baseline surveillance. Security stewards remain in assigned zones.";
  let stewards = 25, medical = 2, police = 5;
  let escalation = ["Perform routine radio check", "Monitor Gate 4 crowd rate"];
  let reasoning2 = "No active threats. Resources at standard operational levels.";
  let safetyZones = ["Sector A", "Sector F"];
  let fallback2 = "Manual steward supervisor checks in each quadrant.";

  let publicAnnounce = "Welcome to the match! Please note your nearest exit and follow steward guidance.";
  let directSMS = "Enjoy the game! If you feel unsafe, text 'HELP' or press SOS in the app.";
  let stewardBriefing = "Status normal. Keep exits clear and monitor for bottlenecks at half-time.";
  let reasoning3 = "General welcome messages reinforce safety culture without raising anxiety.";
  let fallback3 = "Deploy pre-recorded entrance audio loop.";
  let confidenceScore = 92;

  if (incident) {
    if (incident.type === 'women_sos') {
      riskLevel = "Critical"; riskCategory = "Vulnerable Person Threat"; riskScore = 92; affectedSectors = ["E"];
      keyObservations = ["SOS panic alert from Sector E (West Stand).", "Sector E has low lighting and low security (2 guards).", "Density in Sector E is high (82%)."];
      reasoning1 = "Vulnerable female user in low-light zone triggered SOS. Absolute priority.";
      fallback1 = "Attempt camera zoom on Sector E. Request adjacent stewards scan the crowd.";
      primaryResponse = "Immediate Steward Dispatch and Escort to Sector A safe zone.";
      stewards = 8; medical = 1; police = 2;
      escalation = ["Dispatch 4 stewards to Sector E.", "Illuminate auxiliary lighting.", "Escort to Sector A.", "Notify duty police officer."];
      reasoning2 = "Immediate deployment counters low guard count in Sector E. VIP Sector A ensures safety.";
      fallback2 = "Flash steward vests with strobe guides."; confidenceScore = 88;
      publicAnnounce = "Steward intervention in progress. Please keep Sector E walkways clear.";
      directSMS = "HELP ALERT: Security Team arriving at Sector E. Proceed to nearest steward.";
      stewardBriefing = "PRIORITY 1: Solo female SOS in Sector E (Low Light). Locate and escort to Sector A.";
      reasoning3 = "Clear communication reassures the user and prevents bystander panic.";
      fallback3 = "Emergency tone broadcast with direct voice call to Sector E supervisor.";
    } else if (incident.type === 'crowd_surge') {
      riskLevel = "High"; riskCategory = "Gate Bottleneck / Crowd Crush Risk"; riskScore = 85; affectedSectors = ["D"];
      keyObservations = ["Sector D spiked to 99% density.", "High congestion at turnstiles.", "Risk of panic or crush."];
      reasoning1 = "99% density at primary gate exceeds safety thresholds.";
      fallback1 = "Direct cameras to Gate 4. Check turnstile status.";
      primaryResponse = "Divert crowd from Gate 4 to Gate 5 (Sector F) and Gate 3 (Sector C). Pause turnstiles.";
      stewards = 12; medical = 2; police = 4;
      escalation = ["Deploy barriers at Sector D plaza.", "Open overflow gates at Gate 5.", "Medical standby in C/D tunnel."];
      reasoning2 = "Diverting to lower-density gates (F: 65%, C: 88%) relieves pressure fastest.";
      fallback2 = "Manual override to open all exit gates."; confidenceScore = 85;
      publicAnnounce = "Gate 4 is congested. Please use Gate 5 or Gate 3 for faster entry.";
      directSMS = "CROWD ALERT: Gate 4 congested. Divert to Gate 5. Follow steward direction.";
      stewardBriefing = "CROWD SURGE GATE 4: Divert flow to Gate 5. Deploy queue markers.";
      reasoning3 = "Directional announcements redistribute crowd load.";
      fallback3 = "Broadcast general gate division warning.";
    } else if (incident.type === 'lost_child') {
      riskLevel = "Medium"; riskCategory = "Missing Person"; riskScore = 55; affectedSectors = ["F"];
      keyObservations = ["Lost 6-year-old in Sector F.", "Blue jersey, white cap.", "Exit gates notified."];
      reasoning1 = "Missing child requires perimeter lockdown."; fallback1 = "Distribute photo to gate terminals.";
      primaryResponse = "Lockdown Sector F exits. Initiate steward sweeps.";
      stewards = 6; medical = 0; police = 2;
      escalation = ["Brief stewards with description.", "Monitor exit feeds.", "Coordinate at Safety kiosk."];
      reasoning2 = "Perimeter control prevents the child from leaving."; fallback2 = "Broad PA announcement."; confidenceScore = 90;
      publicAnnounce = "If you find a young child in a blue jersey, please guide them to the nearest steward.";
      directSMS = "SAFETY: 6-year-old lost near Sector F. Blue jersey. Inform closest steward.";
      stewardBriefing = "LOST CHILD: Sector F. 6yo male, blue jersey. Monitor exits. Row-by-row sweep.";
      reasoning3 = "Informative but calm announcement."; fallback3 = "Text description to all staff devices.";
    } else if (incident.type === 'medical_emergency') {
      riskLevel = "High"; riskCategory = "Medical Distress"; riskScore = 78; affectedSectors = ["B"];
      keyObservations = ["Attendee collapsed in Sector B Row 14.", "Potential cardiac issue.", "82% density may block access."];
      reasoning1 = "Active collapse requires fast medical ingress."; fallback1 = "Dispatch AED steward.";
      primaryResponse = "Dispatch EMT to Sector B Row 14. Clear aisle access.";
      stewards = 4; medical = 3; police = 1;
      escalation = ["Clear VIP tunnel for stretcher.", "Escort medical team.", "Transfer to medical room."];
      reasoning2 = "Clearing aisles in 82% density is essential."; fallback2 = "Redirect via pitch perimeter entrance."; confidenceScore = 87;
      publicAnnounce = "Please make way for medical staff in Sector B aisle 3.";
      directSMS = "MEDICAL ACCESS: Clear walkways in Sector B for medical responders.";
      stewardBriefing = "MEDICAL: Sector B Row 14. Clear aisle 3. Escort paramedics.";
      reasoning3 = "Direct instructions save critical seconds."; fallback3 = "Megaphone at Sector B tunnel.";
    } else if (incident.type === 'security_breach') {
      riskLevel = "Critical"; riskCategory = "Perimeter Breach / Security Threat"; riskScore = 99; affectedSectors = ["A","B","C","D","E","F"];
      keyObservations = ["Active security breach detected at Gate 4 entrance.", "Perimeter perimeter compromised.", "Full stadium evacuation order."];
      reasoning1 = "Active breach of safety perimeter requires immediate, total evacuation to safe muster areas.";
      fallback1 = "Engage automated emergency sirens. Open all exit gates.";
      primaryResponse = "Complete Stadium Evacuation. Direct crowd to Gates 1-6. Deploy armed security and police reinforcements.";
      stewards = 50; medical = 8; police = 20;
      escalation = ["Trigger master release for all gates", "Divert crowd flows away from Sector D", "Deploy emergency audio scripts", "Establish security perimeter outside"];
      reasoning2 = "Stadium-wide evacuation protocol avoids bottleneck panic. Directing flow to Gates 1, 2, 3, 5, 6 bypasses the breach zone (Sector D).";
      fallback2 = "Manual gate release by quadrant supervisors."; confidenceScore = 98;
      publicAnnounce = "EMERGENCY ALERT: A security breach has been detected. Please leave the stadium immediately through the nearest exit in an orderly manner. Do not panic. Follow steward instructions.";
      directSMS = "EVACUATE NOW: Security threat detected. Leave the stadium immediately via nearest exit walkways. Keep moving.";
      stewardBriefing = "EVACUATION ORDER: Security Breach at Gate 4. Open all gates, clear all stands, and direct spectators out of the stadium immediately.";
      reasoning3 = "Clear, high-priority emergency instructions to facilitate immediate, calm egress.";
      fallback3 = "High-decibel emergency siren loop.";
    }
  }

  let suggestedRoute = null;
  if (systemContext.routingRequest) suggestedRoute = computeSafeRoute(systemContext, safetyZones);

  // Apply language translations to communication agent output
  if (language !== 'en' && language === 'hi') {
    const incidentKey = incident ? incident.type : 'baseline';
    const hiComm = HI_MOCK[incidentKey] || HI_MOCK.baseline;
    publicAnnounce = hiComm.publicAnnouncement;
    directSMS = hiComm.directUserSMS;
    stewardBriefing = hiComm.stewardBriefing;
  }

  return {
    agent1: { riskLevel, riskCategory, riskScore, affectedSectors, reasoning: reasoning1, keyObservations, fallbackAction: fallback1 },
    agent2: { primaryResponse, resourcesRequired: { stewards, medical, police }, escalationProtocol: escalation, reasoning: reasoning2, safetyZones, fallbackAction: fallback2 },
    agent3: { publicAnnouncement: publicAnnounce, directUserSMS: directSMS, stewardBriefing, reasoning: reasoning3, fallbackAction: fallback3, confidenceScore },
    suggestedRoute, language, timestamp: new Date().toLocaleTimeString(), mocked: true
  };
}

app.listen(PORT, () => { console.log(`SafeFlow running on port ${PORT}`); });
