// SafeFlow Frontend Controller
const SECTOR_COORDINATES = { A:{x:300,y:100}, B:{x:455,y:150}, C:{x:455,y:300}, D:{x:300,y:355}, E:{x:145,y:300}, F:{x:145,y:150} };
let currentStadiumState = {};
let activeIncident = null;

// Language intelligence constants
const LANG_VOICE_CODES = { en: 'en-IN', hi: 'hi-IN', ta: 'ta-IN', te: 'te-IN' };
const LANG_LABELS = { en: 'EN', hi: 'हिं' };

const UI_TEXT = {
  en: {
    statusSafe: 'The stadium is safe. Proceed to your seats.',
    statusDesc: 'SafeFlow Safety Assistant is active and monitoring crowd conditions.',
    statusAlert: 'Emergency Assistance Requested.',
    statusAlertDesc: 'Security dispatched. Please remain in your location.',
    btnSOS: 'REQUEST EMERGENCY ASSISTANCE',
    voiceTitle: 'Speak to Safety Guide',
    voiceDesc: 'Tap the microphone and ask a question, or choose a shortcut below.',
    micReady: 'Microphone is ready. Tap to speak.',
    micListening: 'Listening... speak now.',
    shortcutUnsafe: 'I feel unsafe',
    shortcutExit: 'Where should I go?',
    shortcutGate4: 'Is Gate 4 crowded?',
    shortcutsLabel: 'Or select a common question:',
    responseLabel: 'Safety Guide says:',
    transcriptLabel: 'You said:',
    textPlaceholder: 'Or type your question here...',
    btnRoute: 'Find Safest Exit',
    routeTitle: 'Find a Safe Path',
    routeDesc: 'Select your current stand to find the quickest, safest way out.',
    guidedAssistant: 'Switch to Spectator App',
    commandCenter: 'Switch to Operator Console',
    labelDescription: 'Description (Optional):',
    placeholderDescription: 'Describe the emergency details (e.g., child wearing red cap, visual landmarks)...',
  },
  hi: {
    statusSafe: 'स्टेडियम सुरक्षित है। कृपया अपनी सीट पर जाएं।',
    statusDesc: 'SafeFlow सुरक्षा सहायक सक्रिय है और भीड़ की निगरानी कर रहा है।',
    statusAlert: 'आपातकालीन सहायता अनुरोध किया गया।',
    statusAlertDesc: 'सुरक्षाकर्मी आपकी ओर आ रहे हैं। कृपया जहाँ हैं वहीं रहें।',
    btnSOS: 'आपातकालीन सहायता मांगें',
    voiceTitle: 'सुरक्षा मार्गदर्शक से बात करें',
    voiceDesc: 'माइक्रोफ़ोन दबाएं और सवाल पूछें, या नीचे से चुनें।',
    micReady: 'माइक्रोफ़ोन तैयार है। बोलें।',
    micListening: 'सुन रहा है... अभी बोलें।',
    shortcutUnsafe: 'मुझे असुरक्षित लग रहा है',
    shortcutExit: 'मैं कहाँ जाऊँ?',
    shortcutGate4: 'क्या गेट 4 पर भीड़ है?',
    shortcutsLabel: 'या एक सामान्य प्रश्न चुनें:',
    responseLabel: 'सुरक्षा मार्गदर्शक:',
    transcriptLabel: 'आपने कहा:',
    textPlaceholder: 'यहाँ अपना सवाल टाइप करें...',
    btnRoute: 'सबसे सुरक्षित निकास खोजें',
    routeTitle: 'सुरक्षित रास्ता खोजें',
    routeDesc: 'अपना वर्तमान स्थान चुनें।',
    guidedAssistant: 'दर्शक ऐप पर जाएं',
    commandCenter: 'ऑपरेटर कंसोल पर जाएं',
    labelDescription: 'विवरण (वैकल्पिक):',
    placeholderDescription: 'आपातकाल का विवरण लिखें (जैसे: लाल टोपी पहने बच्चा)...',
  }
};

const VOICE_RESPONSES = {
  en: {
    unsafe: 'Emergency assistance requested. Security is on the way. Please stay where you are.',
    exit: 'Calculating your safest exit route now.',
    gate4: 'Gate 4 is congested. Please use Gate 5 instead. Stewards will guide you.',
    sos: 'Requesting help now. Security is on the way. Please stay where you are.',
    fallback: 'SafeFlow is here to guide you. Ask for exit routing or tap for emergency help.',
  },
  hi: {
    unsafe: 'आपातकालीन सहायता मांगी गई है। सुरक्षाकर्मी आ रहे हैं। कृपया जहाँ हैं वहीं रहें।',
    exit: 'आपके लिए सबसे सुरक्षित रास्ता खोजा जा रहा है।',
    gate4: 'गेट 4 पर भीड़ है। कृपया गेट 5 का उपयोग करें। सुरक्षाकर्मी आपकी सहायता करेंगे।',
    sos: 'मदद मांगी गई है। सुरक्षाकर्मी आ रहे हैं। कृपया जहाँ हैं वहीं रहें।',
    fallback: 'SafeFlow आपकी सहायता के लिए यहाँ है। सुरक्षित निकास या आपातकालीन सहायता के लिए बोलें।',
  }
};

let userLanguage = localStorage.getItem('sf_lang') || 'en';

// ==========================================
// INIT
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initClock();
  fetchStadiumState();
  applyLanguage(userLanguage);

  document.getElementById('btn-sos-trigger').addEventListener('click', triggerWomenSOS);
  document.getElementById('btn-calculate-route').addEventListener('click', calculateSafeRoute);
  document.getElementById('btn-toggle-view').addEventListener('click', toggleGuidedMode);
  document.getElementById('guided-btn-sos').addEventListener('click', triggerGuidedSOS);
  document.getElementById('guided-btn-calculate').addEventListener('click', calculateGuidedRoute);
  document.getElementById('guided-btn-mic').addEventListener('click', startVoiceListening);
  document.getElementById('shortcut-unsafe').addEventListener('click', () => handleVoiceIntent('unsafe'));
  document.getElementById('shortcut-exit').addEventListener('click', () => handleVoiceIntent('exit'));
  document.getElementById('shortcut-gate4').addEventListener('click', () => handleVoiceIntent('gate4'));
  document.getElementById('btn-dismiss-operator').addEventListener('click', () => dismissOnboarding('operator'));
  document.getElementById('btn-dismiss-attendee').addEventListener('click', () => dismissOnboarding('attendee'));
  document.getElementById('btn-auto-demo').addEventListener('click', runAutoDemo);
  document.getElementById('btn-approve').addEventListener('click', () => handleApproval(true));
  document.getElementById('btn-override').addEventListener('click', () => handleApproval(false));
  document.getElementById('btn-toggle-protocol').addEventListener('click', toggleProtocolPanel);
  document.getElementById('badge-active-incidents').addEventListener('click', openIncidentsLedger);
  document.getElementById('btn-close-incidents').addEventListener('click', closeIncidentsLedger);

  const textInput = document.getElementById('guided-text-input');
  const sendBtn = document.getElementById('guided-btn-send');
  if (textInput && sendBtn) {
    sendBtn.addEventListener('click', () => { if (textInput.value.trim()) { handleVoiceTranscript(textInput.value.trim()); textInput.value = ''; } });
    textInput.addEventListener('keydown', e => { if (e.key === 'Enter' && textInput.value.trim()) { handleVoiceTranscript(textInput.value.trim()); textInput.value = ''; } });
  }

  Object.keys(SECTOR_COORDINATES).forEach(id => {
    const el = document.getElementById(`sector-${id}`);
    if (el) el.addEventListener('click', () => handleSectorClick(id));
    const gEl = document.getElementById(`guided-sector-${id}`);
    if (gEl) gEl.addEventListener('click', () => handleGuidedSectorClick(id));
  });

  runAgentAnalysis(null, null, null, null);
  setInterval(fetchPredictions, 10000);
  setTimeout(fetchPredictions, 2000);
  // Live state refresh every 8 seconds to keep map current
  setInterval(fetchStadiumState, 8000);
});

// ==========================================
// LANGUAGE INTELLIGENCE
// ==========================================
function selectOnboardingLang(btn) {
  document.querySelectorAll('#onboarding-lang-selector .lang-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  setUserLanguage(btn.dataset.lang, false);
}
window.selectOnboardingLang = selectOnboardingLang;

function setUserLanguage(lang, updateGuidedSelector = true) {
  userLanguage = lang;
  localStorage.setItem('sf_lang', lang);
  applyLanguage(lang);
  if (updateGuidedSelector) {
    document.querySelectorAll('#guided-lang-selector .lang-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.lang === lang);
    });
  }
}
window.setUserLanguage = setUserLanguage;

function applyLanguage(lang) {
  const t = UI_TEXT[lang] || UI_TEXT.en;
  const badge = document.getElementById('guided-lang-badge');
  if (badge) badge.textContent = LANG_LABELS[lang] || 'EN';

  const els = {
    'guided-status-banner': activeIncident ? t.statusAlert : t.statusSafe,
    'guided-status-desc': activeIncident ? t.statusAlertDesc : t.statusDesc,
    'guided-btn-sos': t.btnSOS,
    'guided-voice-title': t.voiceTitle,
    'guided-voice-desc': t.voiceDesc,
    'guided-mic-status': t.micReady,
    'shortcut-unsafe': t.shortcutUnsafe,
    'shortcut-exit': t.shortcutExit,
    'shortcut-gate4': t.shortcutGate4,
    'guided-shortcuts-label': t.shortcutsLabel,
    'guided-response-label': t.responseLabel,
    'guided-transcript-label': t.transcriptLabel,
    'guided-btn-calculate': t.btnRoute,
    'guided-route-title': t.routeTitle,
    'guided-route-desc': t.routeDesc,
    'guided-sos-description-label': t.labelDescription,
  };
  Object.entries(els).forEach(([id, text]) => {
    const el = document.getElementById(id);
    if (el && text) el.textContent = text;
  });
  const textInput = document.getElementById('guided-text-input');
  if (textInput) textInput.placeholder = t.textPlaceholder || '';
  const descInput = document.getElementById('guided-sos-description');
  if (descInput) descInput.placeholder = t.placeholderDescription || '';
}

// ==========================================
// ONBOARDING
// ==========================================
function dismissOnboarding(mode) {
  document.getElementById('onboarding-overlay').classList.add('hidden');
  if (mode === 'attendee') {
    toggleGuidedMode();
  }
  applyLanguage(userLanguage);
}

// ==========================================
// TOAST SYSTEM
// ==========================================
function showToast(title, body, type = '') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<div class="toast-title">${title}</div><div class="toast-body">${body}</div>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4200);
}

// ==========================================
// CLOCK & STATE
// ==========================================
function initClock() {
  const clockEl = document.getElementById('live-clock');
  setInterval(() => { clockEl.textContent = new Date().toLocaleTimeString(); }, 1000);
}

async function fetchStadiumState() {
  try {
    const r = await fetch('/api/stadium-state');
    const newState = await r.json();
    
    // Detect changes in active incidents to sync agent analysis automatically
    const newInc = (newState.activeIncidents && newState.activeIncidents.length > 0) ? newState.activeIncidents[0] : null;
    const oldIncId = activeIncident ? activeIncident.id : null;
    const newIncId = newInc ? newInc.id : null;
    
    currentStadiumState = newState;
    updateStadiumMap();
    updateDashboardMetrics();
    
    if (newIncId !== oldIncId) {
      activeIncident = newInc;
      if (newInc) {
        appendLog(`[ALERT] New remote incident synced: ${newInc.description}`, 'sos');
        showToast('New Incident Registered', newInc.description, 'toast-danger');
        
        // Auto-run analysis for the operator console
        runAgentAnalysis(newInc, null, null, null);
      } else {
        appendLog('Remote incident clear synced.', 'system');
        showToast('Incidents Cleared', 'Stadium returned to baseline.', 'toast-success');
        hideRouteLine(); 
        const resultsEl = document.getElementById('route-results');
        if (resultsEl) resultsEl.classList.add('hidden');
        runAgentAnalysis(null, null, null, null);
      }
    }
  } catch (e) { showToast('Connection Error', 'Failed to reach server.', 'toast-danger'); }
}

function updateStadiumMap() {
  if (!currentStadiumState.sectors) return;
  Object.keys(currentStadiumState.sectors).forEach(id => {
    const s = currentStadiumState.sectors[id];
    
    // Update Operator Map
    const pathEl = document.getElementById(`sector-${id}`);
    const labelEl = document.getElementById(`density-${id}`);
    
    // Update Spectator Map
    const gPathEl = document.getElementById(`guided-sector-${id}`);
    const gLabelEl = document.getElementById(`guided-density-${id}`);
    
    [pathEl, gPathEl].forEach(el => {
      if (el) {
        el.classList.remove('sector-low','sector-med','sector-high','sector-alert-active');
        if (s.status !== 'Normal') el.classList.add('sector-alert-active');
        else if (s.density < 50) el.classList.add('sector-low');
        else if (s.density < 80) el.classList.add('sector-med');
        else el.classList.add('sector-high');
      }
    });
    
    if (labelEl) labelEl.textContent = `${s.density}%`;
    if (gLabelEl) gLabelEl.textContent = `${s.density}%`;
  });
}

function updateDashboardMetrics() {
  const inc = currentStadiumState.activeIncidents || [];
  document.getElementById('active-incidents-count').textContent = inc.length;
  const pulse = document.getElementById('system-pulse');
  if (inc.length > 0) pulse.className = 'pulse-indicator status-red';
  else {
    const high = Object.values(currentStadiumState.sectors).some(s => s.density >= 90);
    pulse.className = high ? 'pulse-indicator status-yellow' : 'pulse-indicator status-green';
  }
  let maxSec = 'A', maxVal = 0;
  Object.keys(currentStadiumState.sectors).forEach(id => {
    if (currentStadiumState.sectors[id].density > maxVal) { maxVal = currentStadiumState.sectors[id].density; maxSec = id; }
  });
  document.getElementById('max-density-sector').textContent = `Sector ${maxSec} (${maxVal}%)`;
  renderActiveIncidentsList();
}

function handleSectorClick(id) {
  const start = document.getElementById('route-start');
  const dest = document.getElementById('route-dest');
  if (start.value === id) dest.value = id;
  else start.value = id;
  appendLog(`Sector ${id} selected.`, 'system');
}

function handleGuidedSectorClick(id) {
  const start = document.getElementById('guided-route-start');
  const sosSector = document.getElementById('guided-sos-sector');
  if (start) start.value = id;
  if (sosSector) sosSector.value = id;
  showToast('Sector Selected', `Your location stand set to Sector ${id}`, 'toast-success');
}

// ==========================================
// INCIDENTS
// ==========================================
window.simulateIncident = async function(type, sector) {
  appendLog(`Simulating '${type}' in Sector ${sector||'ALL'}...`, 'alert');
  try {
    const r = await fetch('/api/incident', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({type,sector}) });
    const data = await r.json();
    if (data.error) { showToast('Validation Error', data.error, 'toast-danger'); return; }
    currentStadiumState = data.state;
    activeIncident = data.incident || null;
    updateStadiumMap(); updateDashboardMetrics();
    if (type === 'clear') {
      appendLog('All clear.', 'system'); showToast('Incidents Cleared', 'Stadium returned to baseline.', 'toast-success');
      hideRouteLine(); document.getElementById('route-results').classList.add('hidden');
      runAgentAnalysis(null,null,null,null);
    } else {
      appendLog(`[ALERT] ${activeIncident.description}`, 'sos');
      showToast('Incident Triggered', activeIncident.description, 'toast-danger');
      runAgentAnalysis(activeIncident,null,null,null);
    }
  } catch(e) { showToast('Error', 'Failed to contact server.', 'toast-danger'); }
};

async function triggerWomenSOS() {
  const sector = document.getElementById('sos-sector').value;
  appendLog(`Priority SOS from Sector ${sector}!`, 'sos');
  showToast('SOS Triggered', `Women Safety alert in Sector ${sector}`, 'toast-danger');
  try {
    const r = await fetch('/api/incident', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({type:'women_sos',sector}) });
    const data = await r.json();
    currentStadiumState = data.state; activeIncident = data.incident;
    updateStadiumMap(); updateDashboardMetrics();
    document.getElementById('route-start').value = sector;
    document.getElementById('route-dest').value = 'A';
    document.getElementById('route-profile').value = 'woman';
    runAgentAnalysis(activeIncident, sector, 'A', 'woman');
  } catch(e) { showToast('Error', 'Failed to register SOS.', 'toast-danger'); }
}

function calculateSafeRoute() {
  const start = document.getElementById('route-start').value;
  const dest = document.getElementById('route-dest').value;
  const profile = document.getElementById('route-profile').value;
  if (start === dest) { showToast('Invalid Route', 'Start and destination must differ.', 'toast-warning'); return; }
  appendLog(`Querying path from ${start} to ${dest}...`, 'system');
  runAgentAnalysis(activeIncident, start, dest, profile);
}

// ==========================================
// MULTI-AGENT ANALYSIS
// ==========================================
function setPipelineDots(stage) {
  const dots = [document.getElementById('pdot-1'), document.getElementById('pdot-2'), document.getElementById('pdot-3')];
  const label = document.getElementById('pipeline-label');
  const labels = ['Awareness Agent...', 'Decision Agent...', 'Communication Agent...', 'Complete'];
  dots.forEach((d, i) => {
    if (!d) return;
    d.className = 'pipeline-dot';
    if (i < stage) d.classList.add('done');
    else if (i === stage && stage < 3) d.classList.add('active');
  });
  if (label) label.textContent = labels[stage] || 'Ready';
}

async function runAgentAnalysis(incidentObj, startSector, destSector, userType) {
  const loadingEl = document.getElementById('agent-loading');
  loadingEl.classList.remove('hidden');
  setPipelineDots(0);
  try {
    const r = await fetch('/api/analyze', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({incident:incidentObj,startSector,destSector,userType,language:userLanguage})
    });
    const result = await r.json();
    setPipelineDots(3);
    updateAgentUI(result);
    if (result.suggestedRoute) {
      renderRouteOnMap(result.suggestedRoute);
      showToast('Route Calculated', result.suggestedRoute.pathDescription, 'toast-success');
    } else hideRouteLine();

    // Auto-speak public announcement when there's an active incident
    if (incidentObj && result.agent3?.publicAnnouncement) {
      setTimeout(() => speakSpeech(result.agent3.publicAnnouncement, result.language || userLanguage), 800);
    }

    // Human approval gate
    if (result.pendingApproval && incidentObj) showApprovalModal(result);
    if (result.reEvaluated) showToast('Re-Evaluated', 'Agent confidence was low. Parameters adjusted.', 'toast-warning');
  } catch(e) { showToast('Analysis Error', 'Multi-agent pipeline failed.', 'toast-danger'); }
  finally { loadingEl.classList.add('hidden'); }
}

// ==========================================
// HUMAN APPROVAL GATE
// ==========================================
function showApprovalModal(result) {
  const modal = document.getElementById('approval-modal');
  document.getElementById('approval-risk-level').textContent = `Risk Level: ${result.agent1.riskLevel}`;
  document.getElementById('approval-action-text').textContent = result.agent2.primaryResponse;
  const res = result.agent2.resourcesRequired;
  document.getElementById('approval-resources').textContent = `Resources: ${res.stewards} Stewards, ${res.medical} Medical, ${res.police} Police`;
  modal.classList.remove('hidden');
}

async function handleApproval(approved) {
  document.getElementById('approval-modal').classList.add('hidden');
  try {
    await fetch('/api/approve-action', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({approved, override:!approved}) });
    showToast(approved ? 'Action Approved' : 'Action Overridden', approved ? 'Agent 3 executing communication.' : 'Manual override recorded.', approved ? 'toast-success' : 'toast-warning');
    appendLog(approved ? 'Operator approved Agent 2 action plan.' : 'Operator overrode Agent 2 action.', approved ? 'system' : 'alert');
  } catch(e) {}
}

// ==========================================
// PREDICTIVE FORECAST & SPARKLINES
// ==========================================
async function fetchPredictions() {
  try {
    const r = await fetch('/api/predict');
    const data = await r.json();
    document.getElementById('match-context').textContent = data.matchContext;
    const grid = document.getElementById('forecast-grid');
    grid.innerHTML = '';
    Object.keys(data.predictions).forEach(s => {
      const p = data.predictions[s];
      const div = document.createElement('div');
      div.className = `forecast-item ${p.alert ? 'forecast-alert' : ''}`;
      div.innerHTML = `<div class="forecast-sector">${s}</div><div class="forecast-value">${p.current}% → ${p.predicted}%</div><div class="forecast-trend ${p.trend}">${p.trend === 'rising' ? 'Rising' : p.trend === 'falling' ? 'Falling' : 'Stable'}</div>`;
      grid.appendChild(div);
    });
    drawSparklines();
  } catch(e) {}
}

async function drawSparklines() {
  try {
    const r = await fetch('/api/density-history');
    const data = await r.json();
    const canvas = document.getElementById('sparkline-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const colors = { A:'#00b4d8', B:'#06d6a0', C:'#ffd166', D:'#ef476f', E:'#9b5de5', F:'#00f5d4' };
    Object.keys(data).forEach(s => {
      const pts = data[s];
      if (pts.length < 2) return;
      ctx.beginPath(); ctx.strokeStyle = colors[s] || '#888'; ctx.lineWidth = 1.5;
      pts.forEach((p, i) => {
        const x = (i / (pts.length - 1)) * w;
        const y = h - ((p.v - 10) / 90) * h;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
    });
    // Legend
    ctx.font = '9px Outfit'; let lx = 4;
    Object.keys(colors).forEach(s => {
      ctx.fillStyle = colors[s]; ctx.fillRect(lx, 4, 8, 8);
      ctx.fillStyle = '#aaa'; ctx.fillText(s, lx + 11, 12); lx += 28;
    });
  } catch(e) {}
}

// ==========================================
// ROUTE RENDERING
// ==========================================
function renderRouteOnMap(routeData) {
  const routeLine = document.getElementById('route-line');
  const gRouteLine = document.getElementById('guided-route-line');
  const routeResults = document.getElementById('route-results');
  if (!routeLine || !routeResults) return;
  const path = routeData.path || [];
  if (path.length > 0) {
    const pts = path.map(id => SECTOR_COORDINATES[id]).filter(Boolean).map(c => `${c.x},${c.y}`).join(' ');
    routeLine.setAttribute('points', pts); routeLine.classList.remove('hidden');
    if (gRouteLine) { gRouteLine.setAttribute('points', pts); gRouteLine.classList.remove('hidden'); }
    routeResults.classList.remove('hidden');
    document.getElementById('route-path-output').textContent = routeData.pathDescription;
    document.getElementById('route-crowd-rating').textContent = routeData.crowdRating;
    const lighting = document.getElementById('route-lighting-level');
    lighting.textContent = routeData.lightingLevel;
    lighting.style.color = routeData.lightingLevel.includes('Low') ? 'var(--color-danger)' : 'var(--color-success)';
    const warnList = document.getElementById('route-warnings-list');
    const warnBox = document.getElementById('route-warnings-container');
    warnList.innerHTML = '';
    if (routeData.warnings?.length) { routeData.warnings.forEach(w => { const li = document.createElement('li'); li.textContent = w; warnList.appendChild(li); }); warnBox.classList.remove('hidden'); }
    else warnBox.classList.add('hidden');
    const escort = document.getElementById('route-escort-container');
    routeData.securityEscortRecommended ? escort.classList.remove('hidden') : escort.classList.add('hidden');
    appendLog(`Safe path: ${routeData.pathDescription}`, 'system');
  } else { hideRouteLine(); routeResults.classList.add('hidden'); }
}

function hideRouteLine() {
  const rl = document.getElementById('route-line');
  const grl = document.getElementById('guided-route-line');
  if (rl) { rl.classList.add('hidden'); rl.setAttribute('points', ''); }
  if (grl) { grl.classList.add('hidden'); grl.setAttribute('points', ''); }
}

// ==========================================
// AGENT UI
// ==========================================
function updateAgentUI(data) {
  if (data.error) appendLog(`[SYSTEM] ${data.error}`, 'system');
  const a1=data.agent1, a2=data.agent2, a3=data.agent3;
  const rb = document.getElementById('agent1-risk-badge');
  rb.textContent = a1.riskLevel; rb.className = `risk-badge risk-${a1.riskLevel.toLowerCase()}`;
  document.getElementById('agent1-risk-progress').style.width = `${a1.riskScore}%`;
  const ol = document.getElementById('agent1-observations'); ol.innerHTML = '';
  a1.keyObservations.forEach(o => { const li = document.createElement('li'); li.textContent = o; ol.appendChild(li); });
  document.getElementById('agent1-reasoning').textContent = a1.reasoning;
  document.getElementById('agent1-fallback').textContent = a1.fallbackAction;
  document.getElementById('agent2-primary-response').textContent = a2.primaryResponse;
  document.getElementById('res-stewards').textContent = a2.resourcesRequired.stewards;
  document.getElementById('res-medical').textContent = a2.resourcesRequired.medical;
  document.getElementById('res-police').textContent = a2.resourcesRequired.police;
  const el = document.getElementById('agent2-escalation'); el.innerHTML = '';
  a2.escalationProtocol.forEach(s => { const li = document.createElement('li'); li.textContent = s; el.appendChild(li); });
  document.getElementById('agent2-reasoning').textContent = a2.reasoning;
  document.getElementById('agent2-fallback').textContent = a2.fallbackAction;
  document.getElementById('agent3-pa').textContent = `"${a3.publicAnnouncement}"`;
  document.getElementById('agent3-sms').textContent = `"${a3.directUserSMS}"`;
  document.getElementById('agent3-stewards').textContent = `"${a3.stewardBriefing}"`;
  document.getElementById('agent3-reasoning').textContent = a3.reasoning;
  document.getElementById('agent3-fallback').textContent = a3.fallbackAction;
  const banner = document.getElementById('ai-model-status');
  if (data.mocked) { banner.textContent = 'Engine: SafeFlow Offline Mock Engine (Active)'; banner.style.color = 'var(--color-warning)'; }
  else { banner.textContent = 'Engine: Gemini 2.5 Flash via Google AI SDK (Active)'; banner.style.color = 'var(--color-success)'; }
}

// ==========================================
// AUTO-DEMO MODE
// ==========================================
async function runAutoDemo() {
  const btn = document.getElementById('btn-auto-demo');
  btn.disabled = true; btn.textContent = 'Running...';
  showToast('Auto-Demo Started', 'Sit back and watch SafeFlow in action.', 'toast-success');

  // Step 1: Women SOS
  await delay(1500);
  showToast('Step 1/6', 'Triggering Women Safety SOS (Critical)...', 'toast-warning');
  await delay(800);
  document.getElementById('sos-sector').value = 'E';
  await triggerWomenSOS();
  await delay(3500);

  // Step 2: Crowd Surge
  showToast('Step 2/6', 'Simulating Gate 4 Crowd Surge...', 'toast-warning');
  await delay(800);
  await simulateIncident('crowd_surge', 'D');
  await delay(3500);

  // Step 3: Safe Route
  showToast('Step 3/6', 'Calculating safe route for solo woman...', 'toast-warning');
  await delay(800);
  document.getElementById('route-start').value = 'E';
  document.getElementById('route-dest').value = 'A';
  document.getElementById('route-profile').value = 'woman';
  calculateSafeRoute();
  await delay(4000);

  // Step 4: Clear and switch to Hindi Guided Mode (THE HERO MOMENT)
  await simulateIncident('clear');
  await delay(1000);
  showToast('Step 4/6', 'Switching language to Hindi...', 'toast-warning');
  setUserLanguage('hi');
  await delay(1200);

  // Step 5: Guided Assistant in Hindi
  showToast('Step 5/6', 'Entering Hindi Guided Assistant...', 'toast-warning');
  await delay(800);
  toggleGuidedMode();
  await delay(1000);
  // Simulate Hindi voice query
  document.getElementById('guided-transcript-container').classList.remove('hidden');
  document.getElementById('guided-transcript-output').textContent = '"मुझे असुरक्षित लग रहा है"';
  await delay(1500);
  await handleVoiceIntent('unsafe');
  await delay(4000);

  // Step 6: Reset
  showToast('Step 6/6', 'Returning to English Command Center...', 'toast-warning');
  setUserLanguage('en');
  toggleGuidedMode();
  await delay(1500);
  await simulateIncident('clear');
  await delay(1000);
  showToast('Demo Complete', 'SafeFlow — AI that speaks your language.', 'toast-success');
  btn.disabled = false; btn.textContent = 'Watch Demo';
}
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ==========================================
// OPERATIONS LOG
// ==========================================
function appendLog(message, type = 'system') {
  const logs = document.getElementById('console-logs');
  if (!logs) return;
  const entry = document.createElement('div');
  entry.className = `log-entry log-${type}`;
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  logs.appendChild(entry); logs.scrollTop = logs.scrollHeight;
}

// ==========================================
// GUIDED ASSISTANT
// ==========================================
function toggleGuidedMode() {
  const dv = document.getElementById('dashboard-view');
  const gv = document.getElementById('guided-view');
  const btn = document.getElementById('btn-toggle-view');
  const t = UI_TEXT[userLanguage] || UI_TEXT.en;
  if (gv.classList.contains('hidden')) {
    gv.classList.remove('hidden'); dv.classList.add('hidden');
    if (btn) btn.textContent = t.commandCenter;
    applyLanguage(userLanguage);
  } else {
    gv.classList.add('hidden'); dv.classList.remove('hidden');
    if (btn) btn.textContent = t.guidedAssistant;
  }
}

async function triggerGuidedSOS() {
  const sector = document.getElementById('guided-sos-sector').value;
  const type = document.getElementById('guided-sos-type').value;
  const descEl = document.getElementById('guided-sos-description');
  const description = descEl ? descEl.value.trim() : '';
  
  const t = UI_TEXT[userLanguage] || UI_TEXT.en;
  const vr = VOICE_RESPONSES[userLanguage] || VOICE_RESPONSES.en;
  
  appendLog(`Priority Guided SOS (${type}) from Sector ${sector}!`, 'sos');
  showToast('SOS Active', `Emergency assistance requested in Sector ${sector}`, 'toast-danger');
  
  try {
    const payload = { type, sector };
    if (description) payload.description = description;
    
    const r = await fetch('/api/incident', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
    const data = await r.json(); currentStadiumState = data.state; activeIncident = data.incident;
    
    if (descEl) descEl.value = '';
    
    updateStadiumMap(); updateDashboardMetrics();
    
    // Sync current location selector
    document.getElementById('guided-route-start').value = sector;
    
    document.getElementById('guided-status-banner').textContent = t.statusAlert;
    document.getElementById('guided-status-desc').textContent = `${t.statusAlertDesc} Location: Sector ${sector}.`;
    const statusSection = document.getElementById('guided-status-section');
    if (statusSection) { statusSection.classList.remove('status-safe'); statusSection.classList.add('status-alert'); }
    
    // Choose appropriate voice guidance response based on emergency type
    let speakMsg = vr.sos;
    if (type === 'medical_emergency') {
      speakMsg = userLanguage === 'hi' ? 'चिकित्सा सहायता मांगी गई है। प्राथमिक उपचार दल आ रहा है।' : 'Medical assistance requested. Responders are on their way.';
    } else if (type === 'lost_child') {
      speakMsg = userLanguage === 'hi' ? 'खोए हुए बच्चे की चेतावनी दर्ज की गई है। निकास द्वारों पर नज़र रखी जा रही है।' : 'Lost child report received. Exits have been alerted.';
    } else if (type === 'crowd_surge') {
      speakMsg = userLanguage === 'hi' ? 'भीड़भाड़ की चेतावनी। कृपया सुरक्षित मार्ग से निकास की ओर बढ़ें।' : 'Crowd congestion reported. Please check safe routing coordinates.';
    }
    
    speakSpeech(speakMsg);
  } catch(e) {}
}

async function calculateGuidedRoute() {
  const start = document.getElementById('guided-route-start').value;
  try {
    const r = await fetch('/api/analyze', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({incident:activeIncident,startSector:start,destSector:'A',userType:'elderly',language:userLanguage})
    });
    const result = await r.json();
    document.getElementById('guided-route-result').classList.remove('hidden');
    const desc = cleanEmojis(result.suggestedRoute?.pathDescription || '');
    document.getElementById('guided-direction-path').textContent = desc;
    document.getElementById('guided-explain-situation').textContent = cleanEmojis(result.agent1.keyObservations.join('. ')) || 'Normal operations.';
    document.getElementById('guided-explain-recommendation').textContent = cleanEmojis(result.agent2.primaryResponse);
    document.getElementById('guided-explain-reason').textContent = cleanEmojis(result.agent2.reasoning);
    const speakMsg = userLanguage === 'hi' ? `सुरक्षित रास्ता मिला। ${desc}` : `Safe exit route found. ${desc}`;
    speakSpeech(speakMsg);
    if (result.suggestedRoute) renderRouteOnMap(result.suggestedRoute);
  } catch(e) {}
}

function speakSpeech(text, lang) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.92;
    u.lang = LANG_VOICE_CODES[lang || userLanguage] || 'en-IN';
    window.speechSynthesis.speak(u);
  }
}

let recognition = null;
function startVoiceListening() {
  const btn = document.getElementById('guided-btn-mic');
  const status = document.getElementById('guided-mic-status');
  const t = UI_TEXT[userLanguage] || UI_TEXT.en;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    status.textContent = userLanguage === 'hi'
      ? 'इस ब्राउज़र में आवाज़ समर्थित नहीं है। कृपया टाइप करें।'
      : 'Voice not supported. Please use the text box below.';
    return;
  }
  if (recognition) { recognition.stop(); recognition = null; btn.classList.remove('listening'); return; }
  recognition = new SR();
  recognition.lang = LANG_VOICE_CODES[userLanguage] || 'en-IN';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.onstart = () => { btn.classList.add('listening'); status.textContent = t.micListening; };
  recognition.onresult = e => handleVoiceTranscript(e.results[0][0].transcript);
  recognition.onerror = () => {
    status.textContent = userLanguage === 'hi' ? 'सुनाई नहीं दिया। पुनः प्रयास करें।' : 'Could not hear. Try again.';
    btn.classList.remove('listening'); recognition = null;
  };
  recognition.onend = () => { btn.classList.remove('listening'); status.textContent = t.micReady; recognition = null; };
  recognition.start();
}

function detectLanguageFromText(text) {
  if (/[ऀ-ॿ]/.test(text)) return 'hi'; // Devanagari script
  if (/[஀-௿]/.test(text)) return 'ta'; // Tamil
  if (/[ఀ-౿]/.test(text)) return 'te'; // Telugu
  return null;
}

function handleVoiceTranscript(transcript) {
  document.getElementById('guided-transcript-container').classList.remove('hidden');
  document.getElementById('guided-transcript-output').textContent = `"${transcript}"`;

  // Auto-detect language from script if different from current
  const detectedLang = detectLanguageFromText(transcript);
  if (detectedLang && detectedLang !== userLanguage) {
    setUserLanguage(detectedLang);
    showToast('Language Detected', detectedLang === 'hi' ? 'हिंदी भाषा पहचानी गई' : 'Language auto-detected', 'toast-success');
  }

  const t = transcript.toLowerCase();
  const vr = VOICE_RESPONSES[userLanguage] || VOICE_RESPONSES.en;

  // English + Hindi intent detection
  const unsafePatterns = /unsafe|help|emergency|sos|मदद|असुरक्षित|डर|खतरा|बचाओ|हेल्प|emergency/i;
  const exitPatterns = /exit|go|route|leave|जाना|रास्ता|निकास|कहाँ|जाऊँ|direction/i;
  const gate4Patterns = /gate|crowd|busy|गेट|भीड़|भीड़भाड़|congested/i;

  if (unsafePatterns.test(t)) handleVoiceIntent('unsafe');
  else if (exitPatterns.test(t)) handleVoiceIntent('exit');
  else if (gate4Patterns.test(t)) handleVoiceIntent('gate4');
  else {
    const rc = document.getElementById('guided-response-container');
    rc.classList.remove('hidden');
    document.getElementById('guided-response-output').textContent = vr.fallback;
    speakSpeech(vr.fallback);
  }
}

async function handleVoiceIntent(intent) {
  const rc = document.getElementById('guided-response-container');
  rc.classList.remove('hidden');
  const ro = document.getElementById('guided-response-output');
  const vr = VOICE_RESPONSES[userLanguage] || VOICE_RESPONSES.en;

  if (intent === 'unsafe') {
    ro.textContent = vr.unsafe;
    speakSpeech(vr.unsafe);
    await triggerGuidedSOS();
  } else if (intent === 'exit') {
    ro.textContent = vr.exit;
    speakSpeech(vr.exit);
    await calculateGuidedRoute();
  } else if (intent === 'gate4') {
    ro.textContent = vr.gate4;
    speakSpeech(vr.gate4);
    await simulateIncident('crowd_surge', 'D');
  }
}

function cleanEmojis(str) {
  if (!str) return '';
  return str.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/gu, '');
}

function toggleProtocolPanel() {
  const grid = document.getElementById('dashboard-view');
  const panel = document.getElementById('agent-panel');
  const btn = document.getElementById('btn-toggle-protocol');
  if (panel.classList.contains('hidden')) {
    panel.classList.remove('hidden');
    grid.classList.add('show-protocol');
    btn.classList.add('active');
  } else {
    panel.classList.add('hidden');
    grid.classList.remove('show-protocol');
    btn.classList.remove('active');
  }
}

function openIncidentsLedger() {
  renderActiveIncidentsList();
  document.getElementById('incidents-overlay').classList.remove('hidden');
}

function closeIncidentsLedger() {
  document.getElementById('incidents-overlay').classList.add('hidden');
}

function renderActiveIncidentsList() {
  const container = document.getElementById('incidents-list-container');
  if (!container) return;
  container.innerHTML = '';
  
  const incidents = currentStadiumState.activeIncidents || [];
  if (incidents.length === 0) {
    container.innerHTML = `<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:13px;">No active incidents registered.</div>`;
    return;
  }
  
  incidents.forEach(inc => {
    const item = document.createElement('div');
    item.className = 'incident-ledger-item';
    
    let priorityClass = 'risk-low';
    if (inc.priority === 'High') priorityClass = 'risk-med';
    else if (inc.priority === 'Critical') priorityClass = 'risk-critical';
    
    const typeLabel = inc.type === 'women_sos' ? 'Women Safety SOS' :
                      inc.type === 'medical_emergency' ? 'Medical Distress' :
                      inc.type === 'lost_child' ? 'Lost Child Alert' :
                      inc.type === 'security_breach' ? 'Security Breach' :
                      inc.type === 'crowd_surge' ? 'Crowd Surge' : 'Emergency Alert';
                      
    item.innerHTML = `
      <div class="ledger-item-header">
        <span class="ledger-item-title">${typeLabel}</span>
        <span class="ledger-item-time">${inc.timestamp}</span>
      </div>
      <div class="ledger-item-desc">${inc.description}</div>
      <div class="ledger-item-meta">
        <span class="risk-badge ${priorityClass}">${inc.priority}</span>
        <span class="badge-stand">Sector ${inc.sector}</span>
      </div>
    `;
    container.appendChild(item);
  });
}
