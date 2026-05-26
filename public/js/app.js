import { getSessionToken, getSessionUser, getSessionRole, isLoggedIn, loginUser, registerUser } from './auth.js';
import { updateStadiumMap, setupMapInteractions, drawRoutingPath, clearRoutingPath } from './stadium.js';
import { UI_TEXT, VOICE_RESPONSES, LANG_VOICE_CODES, LANG_LABELS } from './constants.js';
import orchestrator from './notifications.js';

let currentState = {};
let activeIncident = null;
let userLanguage = localStorage.getItem('sf_lang') || 'en';
let activeTab = 'sos'; // Default tab for Fan; 'monitor' for Staff
let recognition = null;
let timelineSearchQuery = '';
let timelineActiveSeverity = 'All';
let activeFanSosId = null;
let activeFanSosData = null;

// ==========================================
// API FETCH WRAPPER (Bearer Auth injected)
// ==========================================
async function apiFetch(url, options = {}) {
  const token = getSessionToken();
  const headers = options.headers || {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (options.body && !(options.body instanceof FormData) && typeof options.body === 'object') {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }
  options.headers = headers;
  return fetch(url, options);
}

// ==========================================
// SESSION GATE MANAGEMENT
// ==========================================
function checkSessionGate() {
  const authView = document.getElementById('auth-view');
  const appView = document.getElementById('app-view');

  if (isLoggedIn()) {
    authView.classList.add('hidden');
    appView.classList.remove('hidden');
    
    // Seed user details
    const user = getSessionUser();
    const role = getSessionRole();
    document.getElementById('active-user-name').textContent = user.name;
    document.getElementById('user-role-badge').textContent = `${role.toUpperCase()} PORTAL`;

    const fanProfileName = document.getElementById('fan-profile-name');
    if (fanProfileName) fanProfileName.textContent = user.name;
    const staffProfileName = document.getElementById('staff-profile-name');
    if (staffProfileName) staffProfileName.textContent = user.name;
    const staffProfileRole = document.getElementById('staff-profile-role');
    if (staffProfileRole) staffProfileRole.textContent = role;

    // Toggle viewport role controls
    const fanViewport = document.getElementById('fan-viewport');
    const staffViewport = document.getElementById('staff-viewport');
    const fanNav = document.getElementById('fan-nav-links');
    const staffNav = document.getElementById('staff-nav-links');

    if (role === 'Fan') {
      fanViewport.classList.remove('hidden');
      staffViewport.classList.add('hidden');
      fanNav.classList.remove('hidden');
      staffNav.classList.add('hidden');
      switchTab('fan', 'sos');
    } else {
      fanViewport.classList.add('hidden');
      staffViewport.classList.remove('hidden');
      fanNav.classList.add('hidden');
      staffNav.classList.remove('hidden');
      switchTab('staff', 'monitor');

      // Admin Evacuation panel check
      const adminEvacPanel = document.getElementById('admin-evacuate-panel');
      if (adminEvacPanel) {
        if (role === 'Admin') {
          adminEvacPanel.classList.remove('hidden');
        } else {
          adminEvacPanel.classList.add('hidden');
        }
      }
    }

    // Launch loop cycles
    fetchStadiumState();
    fetchPredictions();
    setupMapInteractions(() => currentState);
    applyLanguage(userLanguage);
  } else {
    authView.classList.remove('hidden');
    appView.classList.add('hidden');
  }
}

function applyAccessibilityPreferences() {
  const isLargeText = localStorage.getItem('sf_pref_large_text') === 'true';
  const isSimplified = localStorage.getItem('sf_pref_simplified') === 'true';
  const isVoiceAssist = localStorage.getItem('sf_pref_voice_assist') !== 'false';
  const notificationFreq = localStorage.getItem('sf_pref_notification_freq') || 'realtime';

  document.body.classList.toggle('large-text', isLargeText);
  document.body.classList.toggle('simplified-mode', isSimplified);

  const voiceAssistInputs = ['pref-voice-assist', 'settings-fan-voice-assist', 'settings-staff-voice-assist'];
  voiceAssistInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.checked = isVoiceAssist;
  });

  const largeTextInputs = ['pref-large-text', 'settings-fan-large-text', 'settings-staff-large-text'];
  largeTextInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.checked = isLargeText;
  });

  const simplifiedInputs = ['pref-simplified-mode', 'settings-fan-simplified-mode', 'settings-staff-simplified-mode'];
  simplifiedInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.checked = isSimplified;
  });

  const freqInputs = ['settings-fan-notification-freq', 'settings-staff-notification-freq'];
  freqInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = notificationFreq;
  });
}

function applyTheme(theme) {
  document.body.classList.toggle('theme-light', theme === 'light');
  const themeBtns = document.querySelectorAll('.theme-btn');
  themeBtns.forEach(btn => {
    const isLight = btn.id.includes('light');
    btn.classList.toggle('active', (theme === 'light') === isLight);
  });
}

window.setAppTheme = function(theme) {
  localStorage.setItem('sf_theme', theme);
  applyTheme(theme);
};

window.selectOnboardingLanguage = function(lang) {
  setAppLanguage(lang);
  window.nextOnboardingStep(2); // Goes to accessibility step
};

window.nextOnboardingStep = function(stepNum) {
  const steps = document.querySelectorAll('.onboarding-step');
  steps.forEach(s => s.classList.add('hidden'));
  
  const targetStep = document.getElementById(`ob-step-${stepNum}`);
  if (targetStep) {
    targetStep.classList.remove('hidden');
  }
};

window.switchAuthView = function(view) {
  const signInForm = document.getElementById('auth-signin-form');
  const signUpForm = document.getElementById('auth-signup-form');
  const tabSignIn = document.getElementById('tab-btn-signin');
  const tabSignUp = document.getElementById('tab-btn-signup');
  
  if (view === 'signin') {
    if (signInForm) signInForm.classList.remove('hidden');
    if (signUpForm) signUpForm.classList.add('hidden');
    if (tabSignIn) tabSignIn.classList.add('active');
    if (tabSignUp) tabSignUp.classList.remove('active');
  } else {
    if (signInForm) signInForm.classList.add('hidden');
    if (signUpForm) signUpForm.classList.remove('hidden');
    if (tabSignIn) tabSignIn.classList.remove('active');
    if (tabSignUp) tabSignUp.classList.add('active');
  }
};

window.toggleRoleInfoDrawer = function() {
  const drawer = document.getElementById('role-info-overlay');
  if (drawer) drawer.classList.toggle('hidden');
};

window.initializeDashboard = checkSessionGate;
window.showAuthView = () => {
  document.getElementById('auth-view').classList.remove('hidden');
  document.getElementById('app-view').classList.add('hidden');
  window.nextOnboardingStep(1);
};

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  // Bind Sign In Form
  const signinForm = document.getElementById('auth-signin-form');
  if (signinForm) {
    signinForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('signin-email').value.trim();
      const password = document.getElementById('signin-password').value;
      try {
        const data = await loginUser(email, password);
        window.showToast('Login Successful', `Welcome back, ${data.user.name}!`, 'toast-success');
        window.initializeDashboard();
      } catch (err) {
        window.showToast('Login Error', err.message, 'toast-danger');
      }
    });
  }

  // Bind Sign Up Form
  const signupForm = document.getElementById('auth-signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('signup-name').value.trim();
      const email = document.getElementById('signup-email').value.trim();
      const password = document.getElementById('signup-password').value;
      try {
        const data = await registerUser(email, password, name, 'Fan');
        window.showToast('Registration Successful', `Account created! Welcome, ${data.user.name}!`, 'toast-success');
        window.initializeDashboard();
      } catch (err) {
        window.showToast('Registration Error', err.message, 'toast-danger');
      }
    });
  }

  // Bind accessibility checkboxes
  const syncPreference = (key, value) => {
    localStorage.setItem(key, value);
    applyAccessibilityPreferences();
  };

  const addPrefListener = (id, key, eventType = 'change', isValue = false) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener(eventType, (e) => {
        const val = isValue ? e.target.value : e.target.checked;
        syncPreference(key, val);
      });
    }
  };

  // Onboarding Preference Bindings
  addPrefListener('pref-voice-assist', 'sf_pref_voice_assist');
  addPrefListener('pref-large-text', 'sf_pref_large_text');
  addPrefListener('pref-simplified-mode', 'sf_pref_simplified');

  // Fan Settings Preference Bindings
  addPrefListener('settings-fan-voice-assist', 'sf_pref_voice_assist');
  addPrefListener('settings-fan-large-text', 'sf_pref_large_text');
  addPrefListener('settings-fan-simplified-mode', 'sf_pref_simplified');
  addPrefListener('settings-fan-notification-freq', 'sf_pref_notification_freq', 'change', true);

  // Staff Settings Preference Bindings
  addPrefListener('settings-staff-voice-assist', 'sf_pref_voice_assist');
  addPrefListener('settings-staff-large-text', 'sf_pref_large_text');
  addPrefListener('settings-staff-simplified-mode', 'sf_pref_simplified');
  addPrefListener('settings-staff-notification-freq', 'sf_pref_notification_freq', 'change', true);

  // Apply saved theme on load
  applyTheme(localStorage.getItem('sf_theme') || 'dark');

  // Fan SOS management bindings
  const btnCancelSOS = document.getElementById('btn-fan-sos-cancel');
  if (btnCancelSOS) {
    btnCancelSOS.addEventListener('click', cancelFanSOS);
  }
  const btnAddNote = document.getElementById('btn-fan-sos-add-note');
  if (btnAddNote) {
    btnAddNote.addEventListener('click', addNoteToFanSOS);
  }

  // Bind role info help button
  const btnRoleInfo = document.getElementById('btn-role-info');
  if (btnRoleInfo) {
    btnRoleInfo.addEventListener('click', window.toggleRoleInfoDrawer);
  }

  applyAccessibilityPreferences();

  // Bind logout button
  document.getElementById('btn-logout').addEventListener('click', () => {
    window.logOutUser();
  });

  // Bind Fan UI actions
  document.getElementById('btn-fan-sos-trigger').addEventListener('click', triggerFanSOS);
  document.getElementById('btn-fan-calculate-route').addEventListener('click', calculateFanRoute);
  document.getElementById('btn-fan-mic').addEventListener('click', startVoiceListening);
  
  const fanTextInput = document.getElementById('fan-text-input');
  const fanSendBtn = document.getElementById('btn-fan-send');
  if (fanTextInput && fanSendBtn) {
    fanSendBtn.addEventListener('click', () => {
      if (fanTextInput.value.trim()) {
        handleVoiceTranscript(fanTextInput.value.trim());
        fanTextInput.value = '';
      }
    });
    fanTextInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && fanTextInput.value.trim()) {
        handleVoiceTranscript(fanTextInput.value.trim());
        fanTextInput.value = '';
      }
    });
  }

  // Bind Staff UI actions
  const btnToggleLedger = document.getElementById('btn-toggle-ledger');
  const btnCloseLedgerPanel = document.getElementById('btn-close-ledger-panel');
  const logsDrawerPanel = document.getElementById('logs-drawer-panel');

  // Logs panel is always visible — no toggle needed

  // Bind search filter input
  const timelineSearchInput = document.getElementById('timeline-search');
  if (timelineSearchInput) {
    timelineSearchInput.addEventListener('input', (e) => {
      timelineSearchQuery = e.target.value.toLowerCase();
      renderActiveIncidentsList();
    });
  }

  // Bind severity filters buttons
  const filterBtns = document.querySelectorAll('.btn-filter');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      filterBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      timelineActiveSeverity = e.target.getAttribute('data-severity');
      renderActiveIncidentsList();
    });
  });

  document.getElementById('btn-toggle-reasoning').addEventListener('click', toggleReasoningPanel);
  document.getElementById('btn-run-demo').addEventListener('click', runAutoDemo);

  // Sector selection custom event (fired from stadium.js)
  window.addEventListener('sectorSelected', (e) => {
    const sectorId = e.detail.sectorId;
    const role = getSessionRole();
    if (role === 'Fan') {
      document.getElementById('fan-route-start').value = sectorId;
      document.getElementById('fan-sos-sector').value = sectorId;
      window.showToast('Stand Selected', `Your current stand set to Sector ${sectorId}`, 'toast-success');
    }
  });

  // Clock
  setInterval(() => {
    // Audit clocks or live displays can be run here
  }, 1000);

  // Periodic Polling loops (8s)
  setInterval(() => {
    if (isLoggedIn()) {
      fetchStadiumState();
      fetchPredictions();
      fetchPendingApproval();
    }
  }, 8000);

  // Run gate check
  checkSessionGate();
});

// ==========================================
// STATE SYNCHRONIZATION
// ==========================================
async function fetchStadiumState() {
  try {
    const res = await apiFetch('/api/stadium-state');
    if (!res.ok) return;
    const newState = await res.json();
    
    // Detect changes in active incidents to trigger UI state updates
    const newInc = (newState.activeIncidents && newState.activeIncidents.length > 0) ? newState.activeIncidents[0] : null;
    const oldIncId = activeIncident ? activeIncident.id : null;
    const newIncId = newInc ? newInc.id : null;

    currentState = newState;
    updateStadiumMap(currentState);
    updateDashboardMetrics();
    renderActiveIncidentsList();
    syncFanSosCardStatus();

    // Evacuation flow checks
    if (currentState.evacuationActive) {
      // Update acknowledgement stats for Admin/Staff
      const tracker = document.getElementById('evacuation-tracker');
      if (tracker) {
        tracker.classList.remove('hidden');
        const acks = currentState.evacuationAcksCount || 0;
        const total = currentState.activeSpectatorsCount || 1;
        const pct = Math.round((acks / total) * 100);
        
        const trackerBar = document.getElementById('evac-tracker-bar');
        const trackerCount = document.getElementById('evac-tracker-count');
        const trackerPct = document.getElementById('evac-tracker-pct');
        
        if (trackerBar) trackerBar.style.width = `${pct}%`;
        if (trackerCount) trackerCount.textContent = `${acks} / ${total} spectators acknowledged`;
        if (trackerPct) trackerPct.textContent = `${pct}%`;
      }

      // Display modal for Fans who haven't acknowledged yet
      if (getSessionRole() === 'Fan' && !userAcknowledgedEvac) {
        const overlay = document.getElementById('evac-ack-overlay');
        if (overlay) {
          overlay.classList.remove('hidden');
          const currentSector = document.getElementById('fan-sos-sector')?.value || 'E';
          const routeDesc = document.getElementById('evac-route-description');
          if (routeDesc) {
            routeDesc.textContent = `Sector ${currentSector} -> Sector F (Family Zone) -> Exit Gate 5`;
          }
        }
      }
    } else {
      userAcknowledgedEvac = false;
      const tracker = document.getElementById('evacuation-tracker');
      if (tracker) tracker.classList.add('hidden');
      const overlay = document.getElementById('evac-ack-overlay');
      if (overlay) overlay.classList.add('hidden');
    }

    if (newIncId !== oldIncId) {
      activeIncident = newInc;
      if (newInc) {
        if (orchestrator.shouldDisplay(newInc)) {
          appendLog(`[ALERT] Sync new incident: ${newInc.description}`, 'sos');
          window.showToast(
            newInc.type === 'women_sos' ? 'Women Priority SOS' : 'Incident Alert',
            newInc.description,
            newInc.priority === 'Critical' ? 'toast-danger' : 'toast-warning'
          );
        }
        // Auto-run multi-agent pipeline
        runAgentAnalysis(newInc, null, null, null);
      } else {
        appendLog('Incidents cleared.', 'system');
        window.showToast('Stadium Cleared', 'Returned to baseline monitoring.', 'toast-success');
        clearRoutingPath();
        document.getElementById('fan-route-results')?.classList.add('hidden');
        // Clear Fan SOS management card if it was showing
        activeFanSosId = null;
        activeFanSosData = null;
        document.getElementById('fan-active-sos-card')?.classList.add('hidden');
        runAgentAnalysis(null, null, null, null);
      }
    }
  } catch (err) {
    console.error('State sync failed:', err);
  }
}

const ADJACENT_SECTORS = { A: ['B','F'], B: ['A','C'], C: ['B','D'], D: ['C','E'], E: ['D','F'], F: ['E','A'] };

function shouldShowAlertBanner(incident) {
  if (!incident) return false;
  const role = getSessionRole();
  if (role !== 'Fan') return true; // Staff/Admin always see all
  if (incident.status === 'Responding') return false;
  if (incident.status === 'User_Resolved' || incident.status === 'Resolved') return false;
  if (incident.priority === 'Critical' || incident.type === 'security_breach') return true;

  const userSector = document.getElementById('fan-sos-sector')?.value || 'E';
  const adjSectors = ADJACENT_SECTORS[userSector] || [];
  const isNearby = incident.sector === userSector || adjSectors.includes(incident.sector);

  if (incident.type === 'medical_emergency') return isNearby;
  if (incident.type === 'women_sos') return isNearby;
  if (incident.type === 'crowd_surge') return isNearby;
  if (incident.type === 'lost_child') return true; // community-wide awareness
  return isNearby;
}

function updateDashboardMetrics() {
  const inc = currentState.activeIncidents || [];
  const openCount = inc.filter(i => i.status !== 'Resolved' && i.status !== 'User_Resolved').length;
  const ledgerCount = document.getElementById('ledger-incidents-count');
  if (ledgerCount) ledgerCount.textContent = openCount;
  const pulse = document.getElementById('system-pulse');

  const banner = document.getElementById('active-emergency-banner');
  const bannerText = document.getElementById('emergency-banner-text');

  const visibleIncident = inc.find(i => shouldShowAlertBanner(i));

  if (visibleIncident) {
    if (pulse) pulse.className = 'pulse-indicator status-red';
    if (banner && bannerText) {
      banner.classList.remove('hidden');
      const alertDesc = visibleIncident.description || 'Emergency alert active';
      bannerText.textContent = `${visibleIncident.priority} alert in Sector ${visibleIncident.sector}: ${alertDesc}`;
    }
  } else {
    const highDensity = Object.values(currentState.sectors || {}).some(s => s.density >= 90);
    if (pulse) pulse.className = highDensity ? 'pulse-indicator status-yellow' : 'pulse-indicator status-green';
    if (banner) banner.classList.add('hidden');
  }
}

// ==========================================
// TAB ROUTER
// ==========================================
function switchTab(role, tabId) {
  activeTab = tabId;
  
  // Hide all sub-panels
  const panels = document.querySelectorAll('.sub-panel');
  panels.forEach(p => p.classList.add('hidden'));

  // Show selected sub-panel
  const panel = document.getElementById(`tab-${role}-${tabId}`);
  if (panel) panel.classList.remove('hidden');

  // Deactivate all tab links
  const links = document.querySelectorAll('.nav-tab');
  links.forEach(l => l.classList.remove('active'));

  // Activate chosen link
  const link = document.getElementById(`tab-btn-${role}-${tabId}`);
  if (link) link.classList.add('active');
}
window.switchTab = switchTab;

// ==========================================
// LANGUAGE TRANSLATIONS
// ==========================================
function setAppLanguage(lang) {
  userLanguage = lang;
  localStorage.setItem('sf_lang', lang);
  applyLanguage(lang);
}
window.setAppLanguage = setAppLanguage;

function applyLanguage(lang) {
  const t = UI_TEXT[lang] || UI_TEXT.en;
  
  // Update button language highlights
  const enBtn = document.getElementById('btn-lang-en');
  const hiBtn = document.getElementById('btn-lang-hi');
  if (enBtn) enBtn.classList.toggle('active', lang === 'en');
  if (hiBtn) hiBtn.classList.toggle('active', lang === 'hi');

  const enStaffBtn = document.getElementById('btn-staff-lang-en');
  const hiStaffBtn = document.getElementById('btn-staff-lang-hi');
  if (enStaffBtn) enStaffBtn.classList.toggle('active', lang === 'en');
  if (hiStaffBtn) hiStaffBtn.classList.toggle('active', lang === 'hi');

  // Translate all elements with data-translate attribute
  const translateElements = document.querySelectorAll('[data-translate]');
  translateElements.forEach(el => {
    const key = el.getAttribute('data-translate');
    if (t[key] !== undefined) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = t[key];
      } else {
        el.textContent = t[key];
      }
    }
  });

  // Translate all select option elements with data-translate-opt attribute
  const optElements = document.querySelectorAll('[data-translate-opt]');
  optElements.forEach(el => {
    const key = el.getAttribute('data-translate-opt');
    if (t[key] !== undefined) {
      el.textContent = t[key];
    }
  });
}

// ==========================================
// INCIDENTS OPERATIONS (Simulations)
// ==========================================
async function simulateIncidentAPI(type, sector) {
  appendLog(`Triggering preset simulation: '${type}'...`, 'alert');
  try {
    const res = await apiFetch('/api/incident', {
      method: 'POST',
      body: { type, sector }
    });
    const data = await res.json();
    if (!res.ok) {
      window.showToast('Validation Failed', data.error, 'toast-danger');
      return;
    }
    currentState = data.state;
    activeIncident = data.incident || null;
    updateStadiumMap(currentState);
    updateDashboardMetrics();
  } catch (e) {
    window.showToast('API Connection Error', 'Failed to reach simulator.', 'toast-danger');
  }
}
window.simulateIncidentAPI = simulateIncidentAPI;

async function triggerFanSOS() {
  const sector = document.getElementById('fan-sos-sector').value;
  const categoryEl = document.getElementById('fan-sos-category');
  const type = categoryEl ? categoryEl.value : 'women_sos';
  const description = document.getElementById('fan-sos-desc').value.trim();
  appendLog(`Priority Fan SOS triggered from Sector ${sector} (Type: ${type})!`, 'sos');
  
  // Play reassuring audio guidance
  const isVoiceEnabled = localStorage.getItem('sf_pref_voice_assist') !== 'false';
  if (isVoiceEnabled) {
    const speechText = userLanguage === 'hi' 
      ? 'शांत रहें। सुरक्षा दल को सूचित कर दिया गया है। निर्देशों का पालन करें।'
      : 'Stay calm. Security has been notified. Follow instructions.';
    setTimeout(() => speakSpeech(speechText, userLanguage), 200);
  }
  
  try {
    const res = await apiFetch('/api/incident', {
      method: 'POST',
      body: { type, sector, description }
    });
    const data = await res.json();
    currentState = data.state;
    activeIncident = data.incident;
    activeFanSosId = data.incident?.id || null;
    activeFanSosData = data.incident || null;

    updateStadiumMap(currentState);
    updateDashboardMetrics();

    // Show SOS management card
    if (activeFanSosData) {
      showFanSOSStatusCard(activeFanSosData);
    }

    // Clear description
    document.getElementById('fan-sos-desc').value = '';

    // Route to Navigate tab automatically
    document.getElementById('fan-route-start').value = sector;
    document.getElementById('fan-route-dest').value = 'A';
    const profileVal = (type === 'women_sos' || type === 'woman_safety') ? 'woman' : 'general';
    document.getElementById('fan-route-profile').value = profileVal;
    switchTab('fan', 'nav');

    // Run multi-agent pipeline
    runAgentAnalysis(activeIncident, sector, 'A', profileVal);
  } catch (e) {
    window.showToast('SOS Registration Error', 'Network failure.', 'toast-danger');
  }
}

function updateSosBadge(status) {
  const badge = document.getElementById('fan-sos-status-badge');
  if (!badge) return;
  const map = {
    'Active':        { label: 'Under Review',    cls: 'badge-review' },
    'Responding':    { label: 'Help Dispatched',  cls: 'badge-responding' },
    'User_Resolved': { label: 'Resolved',         cls: 'badge-resolved' },
  };
  const entry = map[status || 'Active'] || map['Active'];
  badge.textContent = entry.label;
  badge.className = `sos-status-badge ${entry.cls}`;
}

function showFanSOSStatusCard(incident) {
  const card = document.getElementById('fan-active-sos-card');
  if (!card) return;
  card.classList.remove('hidden');

  const el = (id) => document.getElementById(id);
  if (el('fan-sos-detail-type')) el('fan-sos-detail-type').textContent = INCIDENT_TYPE_LABELS[incident.type] || incident.type;
  if (el('fan-sos-detail-sector')) el('fan-sos-detail-sector').textContent = `Sector ${incident.sector}`;
  if (el('fan-sos-detail-time')) el('fan-sos-detail-time').textContent = incident.timestamp || new Date().toLocaleTimeString();
  updateSosBadge(incident.status || 'Active');
  // Reset confirmation panels
  const resolveConfirm = document.getElementById('sos-resolve-confirm');
  if (resolveConfirm) resolveConfirm.classList.add('hidden');
  const moreHelpSection = document.getElementById('sos-more-help-section');
  if (moreHelpSection) moreHelpSection.classList.add('hidden');
}

async function cancelFanSOS() {
  if (!activeFanSosId) return;

  const confirmed = window.confirm('Cancel this SOS alert? Only cancel if this was accidental.');
  if (!confirmed) return;

  const noteInput = document.getElementById('fan-sos-note-input');
  const note = noteInput ? noteInput.value.trim() : '';

  try {
    const res = await apiFetch('/api/incident/cancel', {
      method: 'POST',
      body: { incidentId: activeFanSosId, note }
    });
    const data = await res.json();
    if (res.ok) {
      activeFanSosId = null;
      activeFanSosData = null;
      const card = document.getElementById('fan-active-sos-card');
      if (card) card.classList.add('hidden');
      window.showToast('Alert Cancelled', 'Your SOS alert has been withdrawn.', 'toast-success');
      await fetchStadiumState();
    } else {
      window.showToast('Cancel Failed', data.error || 'Could not cancel.', 'toast-warning');
    }
  } catch {
    window.showToast('Error', 'Network failure. Please try again.', 'toast-danger');
  }
}
window.cancelFanSOS = cancelFanSOS;

function addNoteToFanSOS() {
  const input = document.getElementById('fan-sos-note-input');
  if (!input || !input.value.trim()) return;
  window.showToast('Note Added', 'Staff have been notified that you need additional assistance.', 'toast-success');
  input.value = '';
  const section = document.getElementById('sos-more-help-section');
  if (section) section.classList.add('hidden');
}
window.addNoteToFanSOS = addNoteToFanSOS;

function needMoreHelp() {
  const confirm = document.getElementById('sos-resolve-confirm');
  if (confirm) confirm.classList.add('hidden');
  const section = document.getElementById('sos-more-help-section');
  if (section) {
    section.classList.remove('hidden');
    const input = document.getElementById('fan-sos-note-input');
    if (input) { input.value = ''; input.focus(); }
  }
}
window.needMoreHelp = needMoreHelp;

function showUserResolveConfirm() {
  const section = document.getElementById('sos-more-help-section');
  if (section) section.classList.add('hidden');
  const confirm = document.getElementById('sos-resolve-confirm');
  if (confirm) {
    confirm.classList.remove('hidden');
    const noteInput = document.getElementById('fan-sos-resolve-note');
    if (noteInput) { noteInput.value = ''; noteInput.focus(); }
    document.querySelectorAll('.sos-preset-btn').forEach(btn => btn.classList.remove('selected'));
  }
}
window.showUserResolveConfirm = showUserResolveConfirm;

function hideUserResolveConfirm() {
  const confirm = document.getElementById('sos-resolve-confirm');
  if (confirm) confirm.classList.add('hidden');
}
window.hideUserResolveConfirm = hideUserResolveConfirm;

function selectResolveNote(text) {
  const input = document.getElementById('fan-sos-resolve-note');
  if (input) input.value = text;
  document.querySelectorAll('.sos-preset-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.textContent.trim() === text);
  });
}
window.selectResolveNote = selectResolveNote;

async function userResolveSOS() {
  if (!activeFanSosId) return;
  const noteInput = document.getElementById('fan-sos-resolve-note');
  const note = noteInput ? noteInput.value.trim() : '';

  try {
    const res = await apiFetch('/api/incident/user-resolve', {
      method: 'POST',
      body: { incidentId: activeFanSosId, note }
    });
    const data = await res.json();
    if (res.ok) {
      activeFanSosId = null;
      activeFanSosData = null;
      const card = document.getElementById('fan-active-sos-card');
      if (card) card.classList.add('hidden');
      window.showToast('Alert Resolved', 'Your request has been marked as resolved.', 'toast-success');
      appendLog('Fan self-resolved SOS alert.', 'system');
      await fetchStadiumState();
      await fetchPendingApproval();
    } else {
      window.showToast('Could Not Resolve', data.error || 'Please try again.', 'toast-warning');
      hideUserResolveConfirm();
    }
  } catch {
    window.showToast('Error', 'Network failure. Please try again.', 'toast-danger');
  }
}
window.userResolveSOS = userResolveSOS;

function syncFanSosCardStatus() {
  if (!activeFanSosId) return;
  const inc = (currentState.activeIncidents || []).find(i => i.id === activeFanSosId);
  if (!inc) return;

  updateSosBadge(inc.status || 'Active');

  // Show/hide action row based on terminal status
  const actionRow = document.getElementById('sos-action-row');
  const cancelBtn = document.getElementById('btn-fan-sos-cancel');
  const isDone = inc.status === 'User_Resolved' || inc.status === 'Resolved';
  if (actionRow) actionRow.classList.toggle('hidden', isDone);
  if (cancelBtn) cancelBtn.classList.toggle('hidden', isDone);

  // Reveal assigned team if set
  if (inc.assignedTeam) {
    const teamEl = document.getElementById('fan-sos-detail-team');
    const teamRow = document.getElementById('fan-sos-detail-team-row');
    if (teamEl) teamEl.textContent = inc.assignedTeam;
    if (teamRow) teamRow.classList.remove('hidden');
  }
}

async function reopenIncident(incidentId) {
  try {
    const res = await apiFetch('/api/incident/reopen', {
      method: 'POST',
      body: { incidentId }
    });
    const data = await res.json();
    if (res.ok) {
      window.showToast('Incident Reopened', 'Alert is now active again.', 'toast-warning');
      appendLog(`Incident ${incidentId} reopened by operator.`, 'system');
      await fetchStadiumState();
    } else {
      window.showToast('Reopen Failed', data.error || 'Could not reopen.', 'toast-warning');
    }
  } catch {
    window.showToast('Error', 'Network failure.', 'toast-danger');
  }
}
window.reopenIncident = reopenIncident;

async function resolveIncident(incidentId) {
  try {
    const res = await apiFetch('/api/incident/resolve', {
      method: 'POST',
      body: { incidentId }
    });
    const data = await res.json();
    if (res.ok) {
      window.showToast('Incident Resolved', 'Alert removed from active operations.', 'toast-success');
      appendLog(`Incident ${incidentId} manually resolved by operator.`, 'system');
      await fetchStadiumState();
    } else {
      window.showToast('Resolve Failed', data.error || 'Could not resolve.', 'toast-warning');
    }
  } catch {
    window.showToast('Error', 'Network failure.', 'toast-danger');
  }
}
window.resolveIncident = resolveIncident;

async function calculateFanRoute() {
  const start = document.getElementById('fan-route-start').value;
  const dest = document.getElementById('fan-route-dest').value;
  const profile = document.getElementById('fan-route-profile').value;

  if (start === dest) {
    window.showToast('Invalid Route Selection', 'Starting sector must differ from target.', 'toast-warning');
    return;
  }
  appendLog(`Solving path coordinates from ${start} to ${dest}...`, 'system');
  await runAgentAnalysis(activeIncident, start, dest, profile);
}

// ==========================================
// MULTI-AGENT PIPELINE LOGIC
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
  const loading = document.getElementById('agent-loading');
  if (loading) loading.classList.remove('hidden');
  setPipelineDots(0);

  try {
    const res = await apiFetch('/api/analyze', {
      method: 'POST',
      body: {
        incident: incidentObj,
        startSector,
        destSector,
        userType,
        language: userLanguage
      }
    });
    const result = await res.json();
    setPipelineDots(3);

    // Update Client elements
    updateAgentReasoningUI(result);

    if (result.suggestedRoute) {
      drawRoutingPath(result.suggestedRoute.path);
      updateFanRouteUI(result.suggestedRoute);
    } else {
      clearRoutingPath();
      document.getElementById('fan-route-results')?.classList.add('hidden');
    }

    // Auto voice output for announcements (only if NOT pending approval)
    if (incidentObj && result.agent3?.publicAnnouncement && !result.pendingApproval) {
      setTimeout(() => speakSpeech(result.agent3.publicAnnouncement, result.language || userLanguage), 800);
    }

    // Action Approval UI Gate check
    if (result.pendingApproval) {
      fetchPendingApproval();
    }
  } catch (err) {
    console.error('Agent analysis run failed:', err);
  } finally {
    if (loading) loading.classList.add('hidden');
  }
}

function updateAgentReasoningUI(data) {
  const container = document.getElementById('agents-response-output');
  if (!container) return;

  const a1 = data.agent1;
  const a2 = data.agent2;
  const a3 = data.agent3;

  container.innerHTML = `
    <!-- Agent 1 Card -->
    <div class="agent-card" id="agent-card-1">
      <div class="agent-title-bar">
        <span class="agent-badge badge-observe">AGENT 1</span>
        <h3>Awareness (Observe)</h3>
      </div>
      <div>Risk Tier: <strong class="risk-badge risk-${a1.riskLevel.toLowerCase()}">${a1.riskLevel}</strong></div>
      <div style="margin-top:4px;">${a1.keyObservations[0]}</div>
      <button class="agent-details-toggle" onclick="toggleAgentDetails(1)">+ Details</button>
      <div id="agent-details-1" class="agent-details-box hidden">${a1.reasoning}</div>
    </div>

    <!-- Agent 2 Card -->
    <div class="agent-card" id="agent-card-2">
      <div class="agent-title-bar">
        <span class="agent-badge badge-reason">AGENT 2</span>
        <h3>Decision (Coordinate)</h3>
      </div>
      <div>Action: <strong>${a2.primaryResponse}</strong></div>
      <button class="agent-details-toggle" onclick="toggleAgentDetails(2)">+ Details</button>
      <div id="agent-details-2" class="agent-details-box hidden">${a2.reasoning}</div>
    </div>

    <!-- Agent 3 Card -->
    <div class="agent-card" id="agent-card-3">
      <div class="agent-title-bar">
        <span class="agent-badge badge-act">AGENT 3</span>
        <h3>Communication (Act)</h3>
      </div>
      <div>Broadcast Script: <span style="color:var(--color-primary);font-style:italic;">"${a3.publicAnnouncement}"</span></div>
      <button class="agent-details-toggle" onclick="toggleAgentDetails(3)">+ Details</button>
      <div id="agent-details-3" class="agent-details-box hidden">${a3.reasoning}</div>
    </div>
  `;

  // Sync engine branding status
  const modelStatus = document.getElementById('ai-model-status');
  if (modelStatus) {
    if (data.mocked) {
      modelStatus.textContent = 'Engine: SafeFlow Offline Mock Engine (Active)';
      modelStatus.style.color = 'var(--color-warning)';
    } else {
      modelStatus.textContent = 'Engine: Gemini 2.5 Flash via Google AI SDK (Active)';
      modelStatus.style.color = 'var(--color-success)';
    }
  }
}

window.toggleAgentDetails = function(num) {
  const box = document.getElementById(`agent-details-${num}`);
  if (box) box.classList.toggle('hidden');
};

function updateFanRouteUI(routeData) {
  const resBox = document.getElementById('fan-route-results');
  if (!resBox) return;

  resBox.classList.remove('hidden');
  document.getElementById('fan-route-path').textContent = routeData.pathDescription;
  document.getElementById('fan-route-density').textContent = routeData.crowdRating;
  
  const lighting = document.getElementById('fan-route-lighting');
  lighting.textContent = routeData.lightingLevel;
  lighting.style.color = routeData.lightingLevel.includes('Low') ? 'var(--color-danger)' : 'var(--color-success)';

  const warnList = document.getElementById('fan-route-warnings-list');
  const warnContainer = document.getElementById('fan-route-warnings-container');
  warnList.innerHTML = '';
  
  if (routeData.warnings?.length) {
    routeData.warnings.forEach(w => {
      const li = document.createElement('li');
      li.textContent = w;
      warnList.appendChild(li);
    });
    warnContainer.classList.remove('hidden');
  } else {
    warnContainer.classList.add('hidden');
  }

  const escort = document.getElementById('fan-route-escort-container');
  if (routeData.securityEscortRecommended) {
    escort.classList.remove('hidden');
  } else {
    escort.classList.add('hidden');
  }
}

// ==========================================
// HUMAN ACTION GATE (Approvals)
// ==========================================
async function fetchPendingApproval() {
  const role = getSessionRole();
  if (role === 'Fan') return;

  try {
    const res = await apiFetch('/api/pending-approval');
    if (!res.ok) return;
    const data = await res.json();

    const emptyState = document.getElementById('approval-queue-empty');
    const detailsState = document.getElementById('approval-queue-card');

    if (data.pending) {
      emptyState.classList.add('hidden');
      detailsState.classList.remove('hidden');
      
      const typeLabels = {
        'women_sos': 'Women Safety SOS',
        'medical_emergency': 'Medical Distress',
        'lost_child': 'Lost Child',
        'security_breach': 'Security Evacuation',
        'crowd_surge': 'Crowd Surge'
      };
      const rawType = data.action.emergencyType;
      const typeLabel = typeLabels[rawType] || rawType || 'General Emergency';
      document.getElementById('gate-triage-type').textContent = typeLabel;
      
      const riskBadge = document.getElementById('gate-risk-level');
      const severity = data.action.severity || 'Medium';
      riskBadge.textContent = severity;
      riskBadge.className = `risk-badge risk-${severity.toLowerCase()}`;
      
      document.getElementById('gate-triage-location').textContent = `Sector ${data.action.location || '--'}`;
      const cleanReason = (data.action.reasonGenerated || '--').replace(/\s*\|\s*Notes:.*$/, '');
      document.getElementById('gate-triage-reason').textContent = cleanReason || '--';
      document.getElementById('gate-triage-affected').textContent = data.action.affectedUsers || '--';
      document.getElementById('gate-triage-confidence').textContent = `${data.action.confidenceScore || 90}%`;
      document.getElementById('gate-triage-impact').textContent = data.action.estimatedImpact || '--';
      
      document.getElementById('gate-action-text').textContent = data.action.suggestedActions || data.action.action || '';
      
      // Prepopulate override inputs
      const stewardsInput = document.getElementById('editor-stewards');
      const medicalInput = document.getElementById('editor-medical');
      const policeInput = document.getElementById('editor-police');
      const prioritySelect = document.getElementById('editor-priority');
      
      if (stewardsInput) stewardsInput.value = data.action.resourcesRequired?.stewards || 0;
      if (medicalInput) medicalInput.value = data.action.resourcesRequired?.medical || 0;
      if (policeInput) policeInput.value = data.action.resourcesRequired?.police || 0;
      if (prioritySelect) prioritySelect.value = severity;

      const escalation = document.getElementById('gate-escalation-list');
      escalation.innerHTML = '';
      (data.action.escalation || []).forEach(e => {
        const li = document.createElement('li');
        li.textContent = e;
        escalation.appendChild(li);
      });
      
      // Auto switch tabs to approvals tab if staff is looking at monitor and alert strikes
      if (activeTab === 'monitor' && activeIncident?.priority === 'Critical') {
        switchTab('staff', 'approvals');
      }
    } else {
      emptyState.classList.remove('hidden');
      detailsState.classList.add('hidden');
    }
  } catch(e) {
    console.error('Error fetching pending approval:', e);
  }
}

async function submitApprovalDecision(approved) {
  try {
    const body = { approved };
    
    if (approved) {
      body.stewards = parseInt(document.getElementById('editor-stewards')?.value) || 0;
      body.medical = parseInt(document.getElementById('editor-medical')?.value) || 0;
      body.police = parseInt(document.getElementById('editor-police')?.value) || 0;
      body.priority = document.getElementById('editor-priority')?.value || 'Medium';
      body.responseNotes = document.getElementById('editor-notes')?.value || '';
    } else {
      body.override = true;
    }

    const res = await apiFetch('/api/approve-action', {
      method: 'POST',
      body
    });
    if (res.ok) {
      const data = await res.json();
      window.showToast(
        approved ? 'Action Authorized' : 'Incident Overridden',
        approved ? 'Communications successfully broadcast to ground stewards.' : 'Simulation aborted.',
        approved ? 'toast-success' : 'toast-warning'
      );
      
      const actionMsg = approved 
        ? `Action plan authorized by staff operator. (Stewards: ${body.stewards}, Medics: ${body.medical}, Police: ${body.police}, Priority: ${body.priority})`
        : 'Action plan overridden and cancelled.';
      appendLog(actionMsg, approved ? 'system' : 'alert');
      
      if (approved && data.publicAnnouncement) {
        speakSpeech(data.publicAnnouncement, userLanguage);
      }
      
      const notesEl = document.getElementById('editor-notes');
      if (notesEl) notesEl.value = '';

      fetchPendingApproval();
      fetchStadiumState();
    }
  } catch(e) {
    console.error('Error submitting approval:', e);
  }
}
window.submitApprovalDecision = submitApprovalDecision;

// ==========================================
// VOICE INTELLIGENCE ACTIONS
// ==========================================
function speakSpeech(text, lang) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.92;
    u.lang = LANG_VOICE_CODES[lang || userLanguage] || 'en-IN';
    window.speechSynthesis.speak(u);
  }
}

function startVoiceListening() {
  const btn = document.getElementById('btn-fan-mic');
  const status = document.getElementById('fan-mic-status');
  const t = UI_TEXT[userLanguage] || UI_TEXT.en;
  
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    status.textContent = 'Voice recognition not supported. Please type.';
    return;
  }

  if (recognition) {
    recognition.stop();
    recognition = null;
    btn.classList.remove('listening');
    return;
  }

  recognition = new SR();
  recognition.lang = LANG_VOICE_CODES[userLanguage] || 'en-IN';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    btn.classList.add('listening');
    status.textContent = t.guideMicStatusListening;
  };
  recognition.onresult = e => {
    handleVoiceTranscript(e.results[0][0].transcript);
  };
  recognition.onerror = () => {
    status.textContent = userLanguage === 'hi' ? 'सुनाई नहीं दिया। पुनः प्रयास करें।' : 'Could not hear you. Please retry.';
    btn.classList.remove('listening');
    recognition = null;
  };
  recognition.onend = () => {
    btn.classList.remove('listening');
    status.textContent = t.guideMicStatusReady;
    recognition = null;
  };

  recognition.start();
}

function detectLanguageFromText(text) {
  if (/[ऀ-ॿ]/.test(text)) return 'hi';
  return null;
}

function handleVoiceTranscript(transcript) {
  document.getElementById('fan-transcript-container').classList.remove('hidden');
  document.getElementById('fan-transcript-output').textContent = `"${transcript}"`;

  // Auto detect language
  const detected = detectLanguageFromText(transcript);
  if (detected && detected !== userLanguage) {
    setAppLanguage(detected);
    window.showToast('Language Switched', 'Detected Hindi inputs.', 'toast-success');
  }

  const query = transcript.toLowerCase();
  
  // Script intent detection
  const unsafePatterns = /unsafe|help|emergency|sos|मदद|असुरक्षित|खतरा|बचाओ|हेल्प|bachao|asurakshit|khatra|madad/i;
  const exitPatterns = /exit|go|route|leave|जाना|रास्ता|निकास|कहाँ|दिशा|rasta|nikas|kaha|disha/i;
  const gatePatterns = /gate|crowd|busy|गेट|भीड़|भीड़भाड़|congested|bheed|bhid/i;

  if (unsafePatterns.test(query)) {
    triggerQueryIntent('unsafe');
  } else if (exitPatterns.test(query)) {
    // Parse starting and destination sectors if mentioned (e.g. from E to A)
    const startMatch = query.match(/(?:from|start|से)\s*(?:sector\s+|सेक्टर\s+)?([a-fA-F])/i);
    const destMatch = query.match(/(?:to|dest|end|तक)\s*(?:sector\s+|सेक्टर\s+)?([a-fA-F])/i);
    
    if (startMatch) {
      document.getElementById('fan-route-start').value = startMatch[1].toUpperCase();
    }
    if (destMatch) {
      document.getElementById('fan-route-dest').value = destMatch[1].toUpperCase();
    }
    
    triggerQueryIntent('exit');
  } else if (gatePatterns.test(query)) {
    // Parse gate number
    const gateMatch = query.match(/(?:gate|गेट|द्वार)\s*([2-4]|२|३|४)/i);
    let gateNum = 4; // Default to 4
    if (gateMatch) {
      const rawNum = gateMatch[1];
      if (rawNum === '2' || rawNum === '२') gateNum = 2;
      else if (rawNum === '3' || rawNum === '३') gateNum = 3;
      else if (rawNum === '4' || rawNum === '४') gateNum = 4;
    }
    checkGateStatus(gateNum);
  } else {
    const vr = VOICE_RESPONSES[userLanguage] || VOICE_RESPONSES.en;
    document.getElementById('fan-response-container').classList.remove('hidden');
    document.getElementById('fan-response-output').textContent = vr.fallback;
    speakSpeech(vr.fallback);
  }
}

async function checkGateStatus(gateNum) {
  document.getElementById('fan-response-container').classList.remove('hidden');
  const out = document.getElementById('fan-response-output');
  
  const GATE_SECTOR_MAP = { 2: 'B', 3: 'C', 4: 'D' };
  const sectorId = GATE_SECTOR_MAP[gateNum] || 'D';
  const sector = currentState.sectors ? currentState.sectors[sectorId] : null;
  const density = sector ? sector.density : 85;
  const status = sector ? sector.status : 'Normal';
  
  let responseText = '';
  if (userLanguage === 'hi') {
    if (density > 80 || status !== 'Normal') {
      responseText = `गेट ${gateNum} (सेक्टर ${sectorId}) पर अधिक भीड़ है, यहाँ घनत्व ${density}% है। कृपया दूसरे निकास का उपयोग करें।`;
    } else {
      responseText = `गेट ${gateNum} (सेक्टर ${sectorId}) खाली है। वर्तमान भीड़ घनत्व ${density}% है।`;
    }
  } else {
    if (density > 80 || status !== 'Normal') {
      responseText = `Gate ${gateNum} (Sector ${sectorId}) is congested with a density of ${density}%. Please use another exit path.`;
    } else {
      responseText = `Gate ${gateNum} (Sector ${sectorId}) is clear. Current density is ${density}%.`;
    }
  }
  
  if (out) out.textContent = responseText;
  speakSpeech(responseText);
  
  // Trigger simulation dynamically if it was a Gate 4 query and it is not already congested
  if (gateNum === 4 && density <= 80) {
    await simulateIncidentAPI('crowd_surge', 'D');
  }
}
window.checkGateStatus = checkGateStatus;

async function triggerQueryIntent(intent) {
  document.getElementById('fan-response-container').classList.remove('hidden');
  const out = document.getElementById('fan-response-output');
  const vr = VOICE_RESPONSES[userLanguage] || VOICE_RESPONSES.en;

  if (intent === 'unsafe') {
    out.textContent = vr.unsafe;
    speakSpeech(vr.unsafe);
    await triggerFanSOS();
  } else if (intent === 'exit') {
    out.textContent = vr.exit;
    speakSpeech(vr.exit);
    switchTab('fan', 'nav');
    await calculateFanRoute();
  } else if (intent === 'gate4') {
    await checkGateStatus(4);
  }
}
window.triggerQueryIntent = triggerQueryIntent;

// ==========================================
// PREDICTIVE TRENDS & SPARKLINES
// ==========================================
async function fetchPredictions() {
  try {
    const res = await apiFetch('/api/predict');
    if (!res.ok) return;
    const data = await res.json();

    const forecastContext = document.getElementById('forecast-context');
    if (forecastContext) forecastContext.textContent = data.matchContext;

    const grid = document.getElementById('forecast-grid');
    if (!grid) return;

    grid.innerHTML = '';
    Object.keys(data.predictions).forEach(s => {
      const p = data.predictions[s];
      const div = document.createElement('div');
      div.className = `forecast-item ${p.alert ? 'forecast-alert' : ''}`;
      div.innerHTML = `
        <div class="forecast-sector">${s}</div>
        <div class="forecast-value">${p.current}% → ${p.predicted}%</div>
        <div class="forecast-trend ${p.trend}">${p.trend.toUpperCase()}</div>
      `;
      grid.appendChild(div);
    });

    drawSparklinesCanvas();
  } catch(e) {}
}

async function drawSparklinesCanvas() {
  try {
    const res = await apiFetch('/api/density-history');
    if (!res.ok) return;
    const data = await res.json();

    const canvas = document.getElementById('sparkline-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const colors = { A: '#00b4d8', B: '#2ed573', C: '#ffa502', D: '#ff4757', E: '#9b5de5', F: '#00f5d4' };
    
    Object.keys(data).forEach(s => {
      const pts = data[s];
      if (pts.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = colors[s] || '#aaa';
      ctx.lineWidth = 1.5;

      pts.forEach((p, i) => {
        const x = (i / (pts.length - 1)) * w;
        const y = h - ((p.v - 10) / 90) * h;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });

    // Draw Legend inline
    ctx.font = '8px Outfit';
    let lx = 6;
    Object.keys(colors).forEach(s => {
      ctx.fillStyle = colors[s];
      ctx.fillRect(lx, 2, 6, 6);
      ctx.fillStyle = '#9ca3af';
      ctx.fillText(s, lx + 8, 8);
      lx += 22;
    });
  } catch(e) {}
}

// ==========================================
// PRESETS FEED LOGGER
// ==========================================
function appendLog(message, type = 'system') {
  const feed = document.getElementById('console-logs');
  if (!feed) return;
  const entry = document.createElement('div');
  entry.className = `log-entry log-${type}`;
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  feed.appendChild(entry);
  feed.scrollTop = feed.scrollHeight;
}

// ==========================================
// ACTIVE INCIDENTS LEDGER DRAWER PANEL
// ==========================================
const INCIDENT_TYPE_LABELS = {
  'women_sos': 'Women Safety SOS',
  'woman_safety': 'Women Safety SOS',
  'medical_emergency': 'Medical Emergency',
  'lost_child': 'Lost Child',
  'security_breach': 'Security Breach',
  'crowd_surge': 'Crowd Surge',
  'stampede_risk': 'Stampede Risk',
  'accessibility_help': 'Accessibility Help',
  'lost_person': 'Lost Person',
  'exit_blocked': 'Exit Blocked',
  'other': 'General Alert'
};

function renderActiveIncidentsList() {
  const container = document.getElementById('timeline-logs-container');
  if (!container) return;
  container.innerHTML = '';

  const incidents = currentState.activeIncidents || [];

  const filtered = incidents.filter(inc => {
    const typeLabel = INCIDENT_TYPE_LABELS[inc.type] || inc.type || 'Emergency Alert';
    const matchSearch = !timelineSearchQuery ||
      inc.description.toLowerCase().includes(timelineSearchQuery) ||
      typeLabel.toLowerCase().includes(timelineSearchQuery) ||
      `sector ${inc.sector}`.toLowerCase().includes(timelineSearchQuery);
    if (!matchSearch) return false;
    if (timelineActiveSeverity === 'All') return true;
    if (timelineActiveSeverity === 'Critical') return inc.priority === 'Critical';
    if (timelineActiveSeverity === 'High') return inc.priority === 'High';
    if (timelineActiveSeverity === 'Normal') return inc.priority === 'Medium' || inc.priority === 'Low';
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="logs-empty-state">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        <strong>All clear</strong>
        <p>${timelineSearchQuery || timelineActiveSeverity !== 'All' ? 'No matching incidents.' : 'No active incidents.'}</p>
      </div>`;
    return;
  }

  const role = getSessionRole();

  filtered.forEach(inc => {
    const item = document.createElement('div');
    item.className = 'incident-ledger-item';

    let priorityClass = 'risk-low';
    if (inc.priority === 'High') priorityClass = 'risk-med';
    else if (inc.priority === 'Critical') priorityClass = 'risk-critical';

    const typeLabel = INCIDENT_TYPE_LABELS[inc.type] || inc.type || 'Emergency Alert';
    const status = inc.status || 'Active';

    const STATUS_DISPLAY = {
      'Active': 'Active', 'Responding': 'Responding',
      'Resolved': 'Resolved', 'User_Resolved': 'Resolved by User'
    };
    const statusDisplay = STATUS_DISPLAY[status] || status;
    const statusClass = status === 'Responding' ? 'status-responding'
      : status === 'Resolved' ? 'status-resolved'
      : status === 'User_Resolved' ? 'status-user-resolved'
      : 'status-active';

    const cleanDesc = (inc.description || '').replace(/\s*\|\s*Notes:.*$/, '');

    const isTerminal = status === 'Resolved' || status === 'User_Resolved';
    const resolveBtn = (role === 'Staff' || role === 'Admin') && !isTerminal
      ? `<button type="button" class="btn-resolve-incident" data-id="${inc.id}" onclick="resolveIncident('${inc.id}')">Resolve</button>`
      : '';
    const reopenBtn = (role === 'Staff' || role === 'Admin') && status === 'User_Resolved'
      ? `<button type="button" class="btn-reopen-incident" data-id="${inc.id}" onclick="reopenIncident('${inc.id}')">Reopen</button>`
      : '';
    const resolveNote = inc.resolveNote
      ? `<div class="ledger-item-desc" style="font-style:italic;opacity:0.7;">${inc.resolveNote}</div>`
      : '';

    item.innerHTML = `
      <div class="ledger-item-header">
        <span>${typeLabel}</span>
        <span class="ledger-item-time">${inc.timestamp}</span>
      </div>
      <div class="ledger-item-desc">${cleanDesc}</div>
      ${resolveNote}
      <div class="ledger-item-meta">
        <span class="risk-badge ${priorityClass}">${inc.priority}</span>
        <span class="badge-stand">Sector ${inc.sector}</span>
        <span class="incident-status-badge ${statusClass}">${statusDisplay}</span>
        ${resolveBtn}${reopenBtn}
      </div>
    `;
    container.appendChild(item);
  });
}

function toggleReasoningPanel() {
  const panel = document.getElementById('agent-thinking-wrapper');
  const btn = document.getElementById('btn-toggle-reasoning');
  if (panel.classList.contains('hidden')) {
    panel.classList.remove('hidden');
    btn.textContent = 'Hide View';
  } else {
    panel.classList.add('hidden');
    btn.textContent = 'Toggle View';
  }
}

// ==========================================
// Pitch WOW Automated Demo Flow (6 Steps)
// ==========================================
async function runAutoDemo() {
  const btn = document.getElementById('btn-run-demo');
  btn.disabled = true;
  btn.textContent = 'Demo Playing...';
  window.showToast('Pitch Demo Started', 'Standby to watch AI orchestration.', 'toast-success');

  // Step 1: Women SOS (Trigger in E)
  await delay(1500);
  window.showToast('Step 1/6: Women SOS', 'Triggering panic alert in low-light Sector E...', 'toast-warning');
  await delay(600);
  await apiFetch('/api/incident', { method: 'POST', body: { type: 'women_sos', sector: 'E' } });
  await fetchStadiumState();
  await delay(3500);

  // Step 2: Gate 4 Crowd Surge (Trigger in D)
  window.showToast('Step 2/6: Crowd Surge', 'Simulating Gate 4 turnstile congestion...', 'toast-warning');
  await delay(600);
  await apiFetch('/api/incident', { method: 'POST', body: { type: 'crowd_surge', sector: 'D' } });
  await fetchStadiumState();
  await delay(3500);

  // Step 3: Dijkstra Route Planning
  window.showToast('Step 3/6: Safe Path', 'Calculating path avoiding low lighting and bottlenecks...', 'toast-warning');
  await delay(600);
  await runAgentAnalysis(activeIncident, 'E', 'A', 'woman');
  await delay(4000);

  // Step 4: Language Switch to Hindi
  window.showToast('Step 4/6: Translation', 'Switching active language context to Hindi...', 'toast-warning');
  await delay(600);
  setAppLanguage('hi');
  await delay(1500);

  // Step 5: Guided speech in Hindi
  window.showToast('Step 5/6: Speech Assistant', 'Simulating voice query: "मुझे असुरक्षित लग रहा है"', 'toast-warning');
  await delay(600);
  // Temporarily switch viewport to Fan View for visualization
  document.getElementById('fan-viewport').classList.remove('hidden');
  document.getElementById('staff-viewport').classList.add('hidden');
  switchTab('fan', 'guide');
  
  document.getElementById('fan-transcript-container').classList.remove('hidden');
  document.getElementById('fan-transcript-output').textContent = '"मुझे असुरक्षित लग रहा है"';
  await delay(1200);
  await triggerQueryIntent('unsafe');
  await delay(4000);

  // Step 6: Reset to English Baseline
  window.showToast('Step 6/6: Resetting', 'Restoring English Command Center environment...', 'toast-warning');
  await delay(600);
  setAppLanguage('en');
  // Return to Staff View
  document.getElementById('fan-viewport').classList.add('hidden');
  document.getElementById('staff-viewport').classList.remove('hidden');
  switchTab('staff', 'monitor');
  
  await apiFetch('/api/incident', { method: 'POST', body: { type: 'clear' } });
  await fetchStadiumState();
  await delay(1500);

  window.showToast('Pitch Demo Complete', 'SafeFlow transform operations successfully shown.', 'toast-success');
  btn.disabled = false;
  btn.textContent = 'Watch Auto Demo Flow';
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

let userAcknowledgedEvac = false;

window.triggerAdminEvacuationFlow = function() {
  document.getElementById('evac-confirm-modal').classList.remove('hidden');
};

window.closeEvacConfirmModal = function() {
  document.getElementById('evac-confirm-modal').classList.add('hidden');
};

window.confirmAndBroadcastEvacuation = async function() {
  try {
    const res = await apiFetch('/api/evacuate/trigger', { method: 'POST' });
    if (res.ok) {
      window.closeEvacConfirmModal();
      // Trigger evacuation alarm sound (beep-beep + announcement)
      if (window.orchestrator) window.orchestrator.triggerEvacuationSound();
      // Brief delay then voice announcement
      setTimeout(() => {
        const msg = userLanguage === 'hi'
          ? 'आपातकालीन निकासी। कृपया शांत रहें और निकटतम निकास की ओर बढ़ें।'
          : 'Emergency evacuation ordered. Please remain calm and proceed to the nearest exit immediately.';
        speakSpeech(msg, userLanguage);
      }, 1200);
      window.showToast('Evacuation Ordered', 'Global broadcast initiated. All sectors notified.', 'toast-danger');
      await fetchStadiumState();
    } else {
      const err = await res.json();
      window.showToast('Trigger Failure', err.error, 'toast-danger');
    }
  } catch (e) {
    window.showToast('Network Error', 'Failed to trigger evacuation.', 'toast-danger');
  }
};

window.acknowledgeEvacuation = async function() {
  try {
    await apiFetch('/api/evacuate/acknowledge', { method: 'POST' });
    userAcknowledgedEvac = true;
    document.getElementById('evac-ack-overlay').classList.add('hidden');
    window.showToast('Acknowledgement Sent', 'Proceeding safely to exits.', 'toast-success');
  } catch (e) {
    userAcknowledgedEvac = true;
    document.getElementById('evac-ack-overlay').classList.add('hidden');
  }
};
