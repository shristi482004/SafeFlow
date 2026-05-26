import { Router } from 'express';
import { VALID_SECTORS, VALID_INCIDENT_TYPES, SOS_CATEGORIES } from '../../../public/js/constants.js';
import { sanitizeString, sanitizeObject } from '../utils/sanitizer.js';
import { runMultiAgentAnalysis } from '../services/ai.js';
import { computeSafeRoute } from '../services/routing.js';
import { generateToken, authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// ==========================================
// MOCK USER DATABASE
// ==========================================
const USERS = [
  { email: 'fan@safeflow.com', password: 'fan', name: 'Sanjay Kumar', role: 'Fan' },
  { email: 'staff@safeflow.com', password: 'staff', name: 'Officer Sharma', role: 'Staff' },
  { email: 'admin@safeflow.com', password: 'admin', name: 'Director Patel', role: 'Admin' }
];

// ==========================================
// STATE MANAGEMENT
// ==========================================
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

let incidentHistory = [];
let agentMemory = [];
let pendingApproval = null;
let evacuationActive = false;
let activeSpectators = new Set();
let evacuationAcknowledgements = new Set();
let pendingSectorChanges = {};
let densityHistory = {};
VALID_SECTORS.forEach(s => { densityHistory[s] = []; });

// Simulate density fluctuations every 8 seconds
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
// AUTHENTICATION ROUTES
// ==========================================

router.post('/auth/login', (req, res) => {
  const { email, password } = sanitizeObject(req.body);
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = USERS.find(u => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  const token = generateToken({ email: user.email, name: user.name, role: user.role });
  res.json({ token, user: { email: user.email, name: user.name, role: user.role } });
});

router.post('/auth/register', (req, res) => {
  const { email, password, name, role } = sanitizeObject(req.body);
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required.' });
  }

  if (!email.includes('@') || email.length < 5) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  if (password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters long.' });
  }

  const exists = USERS.some(u => u.email === email);
  if (exists) {
    return res.status(400).json({ error: 'Email already exists.' });
  }

  let userRole = 'Fan';
  if (role && ['Fan', 'Staff', 'Officer', 'Admin'].includes(role)) {
    userRole = role === 'Officer' ? 'Staff' : role;
  }

  const newUser = { email, password, name, role: userRole };
  USERS.push(newUser);

  const token = generateToken({ email: newUser.email, name: newUser.name, role: newUser.role });
  res.json({ token, user: { email: newUser.email, name: newUser.name, role: newUser.role } });
});

// ==========================================
// PROTECTED APPLICATION ROUTES (Authenticated)
// ==========================================
router.use(authenticateToken);

router.get('/stadium-state', (req, res) => {
  if (req.user && req.user.role === 'Fan') {
    activeSpectators.add(req.user.email);
  }
  res.json({
    ...stadiumState,
    evacuationActive,
    evacuationAcksCount: evacuationAcknowledgements.size,
    activeSpectatorsCount: Math.max(1, activeSpectators.size)
  });
});

router.get('/density-history', (req, res) => {
  res.json(densityHistory);
});

router.get('/predict', (req, res) => {
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

  const matchMinute = Math.floor((Date.now() % 5400000) / 60000);
  let matchContext = 'First half in progress.';
  if (matchMinute > 40 && matchMinute < 50) matchContext = 'Half-time approaching. Expect 40% crowd movement toward concessions.';
  else if (matchMinute >= 50 && matchMinute < 60) matchContext = 'Half-time break. High movement at gates and food courts.';
  else if (matchMinute > 80) matchContext = 'Final overs. Expect early departures at Gate 4.';

  res.json({ predictions, matchContext, matchMinute });
});

router.post('/evacuate/acknowledge', (req, res) => {
  if (req.user) {
    evacuationAcknowledgements.add(req.user.email);
  }
  res.json({ success: true, count: evacuationAcknowledgements.size });
});

// Incident Simulators (Authenticated)
router.post('/incident', (req, res) => {
  const { type, sector, description } = sanitizeObject(req.body);

  // Validate general inputs
  if (!type || !VALID_INCIDENT_TYPES.includes(type)) {
    return res.status(400).json({ error: 'Invalid incident type.' });
  }
  if (type !== 'clear' && sector && !VALID_SECTORS.includes(sector)) {
    return res.status(400).json({ error: 'Invalid sector.' });
  }

  // Permission rules: Fans can only report SOS, lost children, medical, accessibility, lost person, other, or clear.
  if (req.user.role === 'Fan') {
    if (!['women_sos', 'woman_safety', 'medical_emergency', 'lost_child', 'accessibility_help', 'lost_person', 'other', 'clear'].includes(type)) {
      return res.status(403).json({ error: 'Access denied: Fans cannot simulate structural alerts.' });
    }
  }

  stadiumState.activeIncidents = [];
  pendingSectorChanges = {}; // Reset pending sector changes

  if (type === 'clear') {
    Object.keys(stadiumState.sectors).forEach(sec => {
      stadiumState.sectors[sec].status = "Normal";
    });
    stadiumState.sectors.D.density = 85;
    stadiumState.sectors.E.density = 68;
    pendingApproval = null;
    evacuationActive = false;
    evacuationAcknowledgements.clear();
    activeSpectators.clear();
    return res.json({ message: "Stadium state cleared.", state: stadiumState });
  }

  let incident = {
    id: Date.now().toString(),
    type,
    sector: sector || 'E',
    priority: "Medium",
    timestamp: new Date().toLocaleTimeString(),
    createdBy: req.user ? req.user.email : null,
    description: ""
  };

  const catInfo = SOS_CATEGORIES[type];
  if (catInfo) {
    incident.priority = catInfo.priority;
    incident.description = `${catInfo.label} reported in Sector ${sector || 'E'}. ${catInfo.description}`;
    
    // Determine sector status
    let statusStr = "Alert Active";
    if (type === 'women_sos' || type === 'woman_safety') statusStr = "SOS Active";
    else if (type === 'crowd_surge') statusStr = "Surge Alert";
    else if (type === 'medical_emergency') statusStr = "Medical Alert";
    else if (type === 'security_breach') statusStr = "Breach Active";
    else if (type === 'stampede_risk') statusStr = "Surge Alert";
    else if (type === 'exit_blocked') statusStr = "Exit Blocked";
    
    pendingSectorChanges[sector || 'E'] = {
      status: statusStr,
      density: Math.max(85, stadiumState.sectors[sector || 'E']?.density || 50)
    };

    if (type === 'security_breach') {
      Object.keys(stadiumState.sectors).forEach(sec => {
        pendingSectorChanges[sec] = { status: "Evacuate" };
      });
      pendingSectorChanges[sector || 'E'] = { status: "Breach Active" };
    }
  }

  if (description) {
    incident.description = description;
  }

  stadiumState.activeIncidents.push(incident);
  incidentHistory.push({ ...incident, resolvedAt: null });
  res.json({ message: "Incident simulated.", incident, state: stadiumState });
});

// Analysis Pipeline (Authenticated)
router.post('/analyze', async (req, res) => {
  const VALID_LANGUAGES = ['en', 'hi', 'ta', 'te'];
  const { language: rawLang, incident, startSector, destSector, userType } = req.body;
  const language = VALID_LANGUAGES.includes(rawLang) ? rawLang : 'en';
  
  const currentIncident = incident || (stadiumState.activeIncidents.length > 0 ? stadiumState.activeIncidents[0] : null);
  const systemContext = {
    stadiumSectors: stadiumState.sectors,
    activeIncident: currentIncident,
    routingRequest: (startSector && destSector) ? { startSector, destSector, userType } : null,
    recentMemory: agentMemory.slice(-3)
  };

  const output = await runMultiAgentAnalysis(systemContext, language, agentMemory);

  // Set pending approval gate for non-low incidents
  if (currentIncident && currentIncident.priority !== 'Low') {
    const sectorData = stadiumState.sectors[currentIncident.sector] || {};
    const densityVal = sectorData.density || 50;
    const affectedUsers = `${Math.round(densityVal * 7.5)} spectators in Sector ${currentIncident.sector}`;

    pendingApproval = {
      incidentId: currentIncident.id,
      emergencyType: currentIncident.type,
      severity: output.agent1.riskLevel,
      location: currentIncident.sector,
      reasonGenerated: currentIncident.description,
      affectedUsers: affectedUsers,
      confidenceScore: output.agent3?.confidenceScore || 90,
      suggestedActions: output.agent2.primaryResponse,
      resourcesRequired: output.agent2.resourcesRequired,
      estimatedImpact: output.agent1.riskCategory || 'Incident localized to stand quadrant',
      requiredPersonnel: (output.agent2.resourcesRequired?.stewards || 0) + 
                          (output.agent2.resourcesRequired?.medical || 0) + 
                          (output.agent2.resourcesRequired?.police || 0),
      // Legacy compatibility keys
      action: output.agent2.primaryResponse,
      resources: output.agent2.resourcesRequired,
      escalation: output.agent2.escalationProtocol || [],
      riskLevel: output.agent1.riskLevel,
      publicAnnouncement: output.agent3?.publicAnnouncement,
      sectorChanges: pendingSectorChanges,
      timestamp: new Date().toISOString()
    };
    output.pendingApproval = true;
  }

  // Store in memory logs
  agentMemory.push({ timestamp: Date.now(), riskLevel: output.agent1.riskLevel, incident: currentIncident?.type || 'none' });
  if (agentMemory.length > 10) agentMemory.shift();

  res.json(output);
});

// Fan self-service SOS cancel (authenticated, any role)
router.post('/incident/cancel', (req, res) => {
  const { incidentId, note } = sanitizeObject(req.body);
  if (!incidentId) {
    return res.status(400).json({ error: 'Incident ID required.' });
  }

  const fanCancellable = ['women_sos', 'woman_safety', 'medical_emergency', 'lost_child', 'accessibility_help', 'lost_person', 'other'];
  const idx = stadiumState.activeIncidents.findIndex(i => i.id === incidentId);
  if (idx === -1) {
    return res.status(404).json({ error: 'Incident not found or already resolved.' });
  }

  const incident = stadiumState.activeIncidents[idx];
  if (req.user.role === 'Fan' && !fanCancellable.includes(incident.type)) {
    return res.status(403).json({ error: 'Cannot cancel this incident type.' });
  }

  stadiumState.activeIncidents.splice(idx, 1);

  const histInc = incidentHistory.find(i => i.id === incidentId);
  if (histInc) {
    histInc.resolvedAt = new Date().toISOString();
    histInc.cancelledBy = req.user.email;
    if (note) histInc.cancelNote = sanitizeString(note);
  }

  if (stadiumState.activeIncidents.length === 0) {
    Object.keys(stadiumState.sectors).forEach(sec => {
      if (stadiumState.sectors[sec].status !== 'Normal') {
        stadiumState.sectors[sec].status = 'Normal';
      }
    });
    pendingApproval = null;
  }

  res.json({ success: true, cancelled: incident, state: stadiumState });
});

// Fan self-resolve: fan indicates their own SOS no longer needs attention
router.post('/incident/user-resolve', (req, res) => {
  const { incidentId, note } = sanitizeObject(req.body);
  if (!incidentId) return res.status(400).json({ error: 'Incident ID required.' });

  // These types require officer resolution regardless
  const officerOnly = ['security_breach', 'crowd_surge', 'stampede_risk', 'exit_blocked'];

  const idx = stadiumState.activeIncidents.findIndex(i => i.id === incidentId);
  if (idx === -1) return res.status(404).json({ error: 'Incident not found.' });

  const incident = stadiumState.activeIncidents[idx];

  if (incident.createdBy && incident.createdBy !== req.user.email) {
    return res.status(403).json({ error: 'You can only resolve your own alerts.' });
  }
  if (officerOnly.includes(incident.type)) {
    return res.status(403).json({ error: 'This alert type requires officer resolution.' });
  }
  if (incident.status === 'User_Resolved' || incident.status === 'Resolved') {
    return res.status(400).json({ error: 'Incident is already resolved.' });
  }

  incident.status = 'User_Resolved';
  incident.resolvedAt = new Date().toISOString();
  incident.resolvedBy = req.user.email;
  if (note) incident.resolveNote = sanitizeString(note);

  const histInc = incidentHistory.find(i => i.id === incidentId);
  if (histInc) {
    histInc.status = 'User_Resolved';
    histInc.resolvedAt = incident.resolvedAt;
    histInc.resolvedBy = req.user.email;
    if (note) histInc.resolveNote = sanitizeString(note);
  }

  // Reset sector status if no open (unresolved) incidents remain
  const openIncidents = stadiumState.activeIncidents.filter(
    i => i.status !== 'User_Resolved' && i.status !== 'Resolved'
  );
  if (openIncidents.length === 0) {
    Object.keys(stadiumState.sectors).forEach(sec => {
      if (stadiumState.sectors[sec].status !== 'Normal') stadiumState.sectors[sec].status = 'Normal';
    });
    pendingApproval = null;
  }

  res.json({ success: true, resolved: incident, state: stadiumState });
});

// ==========================================
// RESTRICTED OPERATIONS (Staff & Admin Only)
// ==========================================
router.use(requireRole(['Staff', 'Admin']));

router.get('/incident-history', (req, res) => {
  res.json(incidentHistory.slice(-20));
});

router.post('/incident/resolve', (req, res) => {
  const { incidentId } = sanitizeObject(req.body);
  if (!incidentId) return res.status(400).json({ error: 'Incident ID required.' });

  const idx = stadiumState.activeIncidents.findIndex(i => i.id === incidentId);
  if (idx === -1) return res.status(404).json({ error: 'Incident not found.' });

  const incident = stadiumState.activeIncidents.splice(idx, 1)[0];
  incident.status = 'Resolved';

  const histInc = incidentHistory.find(i => i.id === incidentId);
  if (histInc) {
    histInc.status = 'Resolved';
    histInc.resolvedAt = new Date().toISOString();
    histInc.resolvedBy = req.user.email;
  }

  if (stadiumState.activeIncidents.length === 0) {
    Object.keys(stadiumState.sectors).forEach(sec => {
      if (stadiumState.sectors[sec].status !== 'Normal') {
        stadiumState.sectors[sec].status = 'Normal';
      }
    });
    pendingApproval = null;
  }

  res.json({ success: true, resolved: incident, state: stadiumState });
});

// Reopen a User_Resolved incident (Staff/Admin only)
router.post('/incident/reopen', (req, res) => {
  const { incidentId } = sanitizeObject(req.body);
  if (!incidentId) return res.status(400).json({ error: 'Incident ID required.' });

  const idx = stadiumState.activeIncidents.findIndex(i => i.id === incidentId);
  if (idx === -1) return res.status(404).json({ error: 'Incident not found.' });

  const incident = stadiumState.activeIncidents[idx];
  if (incident.status !== 'User_Resolved') {
    return res.status(400).json({ error: 'Only User_Resolved incidents can be reopened.' });
  }

  incident.status = 'Active';
  delete incident.resolvedAt;
  delete incident.resolvedBy;
  delete incident.resolveNote;

  const histInc = incidentHistory.find(i => i.id === incidentId);
  if (histInc) {
    histInc.status = 'Active';
    histInc.reopenedAt = new Date().toISOString();
    histInc.reopenedBy = req.user.email;
  }

  res.json({ success: true, reopened: incident, state: stadiumState });
});

router.get('/pending-approval', (req, res) => {
  res.json({ pending: !!pendingApproval, action: pendingApproval });
});

router.post('/evacuate/trigger', (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Access denied: Only Administrators can trigger evacuations.' });
  }
  evacuationActive = true;
  evacuationAcknowledgements.clear();
  
  // Force all sectors to Evacuate state immediately
  Object.keys(stadiumState.sectors).forEach(sec => {
    stadiumState.sectors[sec].status = "Evacuate";
  });
  stadiumState.sectors.D.status = "Breach Active";

  const incident = {
    id: Date.now().toString(),
    type: 'security_breach',
    sector: 'D',
    priority: 'Critical',
    timestamp: new Date().toLocaleTimeString(),
    description: 'EMERGENCY EVACUATION ORDERED BY SYSTEM ADMINISTRATOR.'
  };

  stadiumState.activeIncidents = [incident];
  incidentHistory.push({ ...incident, resolvedAt: null });

  res.json({ success: true, state: stadiumState });
});

router.get('/evacuate/status', (req, res) => {
  res.json({
    evacuationActive,
    evacuationAcksCount: evacuationAcknowledgements.size,
    activeSpectatorsCount: Math.max(1, activeSpectators.size)
  });
});

router.post('/approve-action', (req, res) => {
  const { approved, override, stewards, medical, police, priority, responseNotes } = req.body;
  if (!pendingApproval) {
    return res.status(404).json({ error: 'No pending safety actions.' });
  }

  if (approved) {
    // Apply overrides if provided
    if (stewards !== undefined) pendingApproval.resourcesRequired.stewards = parseInt(stewards) || 0;
    if (medical !== undefined) pendingApproval.resourcesRequired.medical = parseInt(medical) || 0;
    if (police !== undefined) pendingApproval.resourcesRequired.police = parseInt(police) || 0;
    if (priority !== undefined) pendingApproval.severity = priority;
    if (responseNotes !== undefined) pendingApproval.responseNotes = responseNotes;

    // Apply overrides to legacy compatibility structures
    pendingApproval.resources = pendingApproval.resourcesRequired;
    pendingApproval.riskLevel = pendingApproval.severity;

    // Update the incident itself in activeIncidents and incidentHistory if needed
    const activeInc = stadiumState.activeIncidents.find(i => i.id === pendingApproval.incidentId);
    if (activeInc) {
      activeInc.status = 'Responding';
      if (priority !== undefined) activeInc.priority = priority;
      if (responseNotes !== undefined) activeInc.description += ` | Notes: ${responseNotes}`;
    }

    // Apply sector modifications to stadiumState.sectors
    if (pendingApproval.sectorChanges) {
      Object.keys(pendingApproval.sectorChanges).forEach(sec => {
        const changes = pendingApproval.sectorChanges[sec];
        if (changes.status !== undefined) {
          stadiumState.sectors[sec].status = changes.status;
        }
        if (changes.density !== undefined) {
          stadiumState.sectors[sec].density = changes.density;
        }
      });
    }
  } else {
    // If overridden/rejected, clear active incident and reset sector highlights to Normal
    stadiumState.activeIncidents = [];
    Object.keys(stadiumState.sectors).forEach(sec => {
      stadiumState.sectors[sec].status = "Normal";
    });
  }

  const result = {
    ...pendingApproval,
    approved,
    overridden: !approved,
    operator: req.user.name,
    approvedAt: new Date().toISOString()
  };
  
  pendingApproval = null;
  res.json(result);
});

export default router;
