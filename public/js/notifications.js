// SafeFlow Notification Orchestrator

class NotificationOrchestrator {
  constructor() {
    this.lastToastTime = 0;
    this.cooldownMs = 3000;
    this.dupWindowMs = 45000;
    this.quietMode = false;
    this.incidentCache = new Map(); // key: type_sector, value: timestamp
  }

  /**
   * Sets quiet mode to ignore non-critical toasts
   */
  setQuietMode(enabled) {
    this.quietMode = enabled;
  }

  /**
   * Checks if an incident is unique and ready to trigger a visual pop-up.
   */
  shouldDisplay(incident) {
    if (this.quietMode && incident.priority !== 'Critical') {
      return false;
    }

    const cacheKey = `${incident.type}_${incident.sector || 'ALL'}`;
    const lastSeen = this.incidentCache.get(cacheKey);
    const now = Date.now();

    if (lastSeen && (now - lastSeen < this.dupWindowMs)) {
      // Duplicate warning suppressed inside the duplicate window
      return false;
    }

    this.incidentCache.set(cacheKey, now);
    return true;
  }

  /**
   * Dispatches toast popup ensuring cooldown limits.
   */
  triggerAlert(title, body, priority) {
    const isCritical = priority === 'Critical';
    const isHigh = priority === 'High';

    // Lower alerts are only added to the operations console log feed, not shown as popups
    if (!isCritical && !isHigh) {
      return;
    }

    const now = Date.now();
    const timeSinceLast = now - this.lastToastTime;

    if (timeSinceLast < this.cooldownMs) {
      const waitTime = this.cooldownMs - timeSinceLast;
      setTimeout(() => {
        this.displayToast(title, body, priority);
      }, waitTime);
      this.lastToastTime = now + waitTime;
    } else {
      this.displayToast(title, body, priority);
      this.lastToastTime = now;
    }
  }

  displayToast(title, body, priority) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    let typeClass = 'toast-success';
    
    if (priority === 'Critical') {
      typeClass = 'toast-danger';
      this.triggerAudioBeep();
      this.flashDeviceFrame();
    } else if (priority === 'High') {
      typeClass = 'toast-warning';
    }

    toast.className = `toast ${typeClass}`;
    toast.innerHTML = `<div class="toast-title">${title}</div><div class="toast-body">${body}</div>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  /**
   * Sound generator for critical emergency alerts — two short tones.
   */
  triggerAudioBeep() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const playBeep = (startTime, freq = 880, dur = 0.18) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.12, startTime + 0.02);
        gain.gain.setValueAtTime(0.12, startTime + dur - 0.03);
        gain.gain.linearRampToValueAtTime(0, startTime + dur);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(startTime);
        osc.stop(startTime + dur);
      };
      const t = audioCtx.currentTime;
      playBeep(t, 880, 0.18);
      playBeep(t + 0.28, 880, 0.18); // Second beep after gap
    } catch (e) {
      console.warn('AudioContext not supported.');
    }
  }

  /**
   * Evacuation alarm — three ascending tones (urgent pattern), plays once.
   */
  triggerEvacuationSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const playTone = (startTime, freq, dur) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.14, startTime + 0.03);
        gain.gain.setValueAtTime(0.14, startTime + dur - 0.05);
        gain.gain.linearRampToValueAtTime(0, startTime + dur);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(startTime);
        osc.stop(startTime + dur);
      };
      const t = audioCtx.currentTime;
      playTone(t, 500, 0.28);
      playTone(t + 0.38, 700, 0.28);
      playTone(t + 0.76, 900, 0.32); // Higher third tone — plays once, no loop
    } catch (e) {
      console.warn('AudioContext not supported.');
    }
  }

  /**
   * Flashes device frame in emergency crimson for critical risk levels
   */
  flashDeviceFrame() {
    const container = document.querySelector('.app-container');
    if (!container) return;
    
    container.style.transition = 'box-shadow 0.2s ease';
    container.style.boxShadow = '0 0 35px rgba(239, 71, 111, 0.5)';
    
    setTimeout(() => {
      container.style.boxShadow = '';
    }, 1200);
  }
}

// Instantiate and expose globally
window.orchestrator = new NotificationOrchestrator();

// Fallback helper for legacy showToast usages
window.showToast = function(title, body, typeClass = '') {
  let priority = 'Low';
  if (typeClass.includes('danger')) priority = 'Critical';
  else if (typeClass.includes('warning')) priority = 'High';
  else if (typeClass.includes('success')) priority = 'High'; // Treat success notifications as visible

  window.orchestrator.triggerAlert(title, body, priority);
};
export default window.orchestrator;
