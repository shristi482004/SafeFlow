// SafeFlow Stadium Interactive SVG Controller

const SECTOR_CENTERS = {
  A: { x: 300, y: 114 },
  B: { x: 420, y: 175 },
  C: { x: 420, y: 275 },
  D: { x: 300, y: 335 },
  E: { x: 180, y: 275 },
  F: { x: 180, y: 175 }
};

export function updateStadiumMap(stadiumState) {
  if (!stadiumState || !stadiumState.sectors) return;

  const mapPrefixes = ['', 'fan-'];

  const activeIncidents = stadiumState.activeIncidents || [];

  Object.keys(stadiumState.sectors).forEach(id => {
    const s = stadiumState.sectors[id];
    const hasOpenIncident = activeIncidents.some(
      inc => inc.sector === id
        && inc.status !== 'Responding'
        && inc.status !== 'User_Resolved'
        && inc.status !== 'Resolved'
    );

    mapPrefixes.forEach(prefix => {
      const pathEl = document.getElementById(`${prefix}sector-${id}`);
      const densityLabelEl = document.getElementById(`${prefix}density-${id}`);
      const lightLabelEl = document.getElementById(`${prefix}light-${id}`);

      if (pathEl) {
        pathEl.classList.remove('sector-low', 'sector-med', 'sector-high', 'sector-alert-active');

        if (s.status !== 'Normal' && hasOpenIncident) {
          pathEl.classList.add('sector-alert-active');
        } else if (s.density < 50) {
          pathEl.classList.add('sector-low');
        } else if (s.density < 80) {
          pathEl.classList.add('sector-med');
        } else {
          pathEl.classList.add('sector-high');
        }
      }

      if (densityLabelEl) {
        densityLabelEl.textContent = `${s.density}%`;
      }

      if (lightLabelEl) {
        const lang = localStorage.getItem('sf_lang') || 'en';
        let lightVal = s.lighting || 'Unknown';
        if (lang === 'hi') {
          if (lightVal === 'High') lightVal = 'उच्च';
          else if (lightVal === 'Medium') lightVal = 'मध्यम';
          else if (lightVal === 'Low') lightVal = 'कम';
        }
        lightLabelEl.textContent = `L: ${lightVal}`;
      }
    });
  });
}

/**
 * Attaches interactive tooltip hover triggers to the SVG elements.
 */
export function setupMapInteractions(stadiumStateProvider) {
  const popover = document.getElementById('sector-popup-card');
  if (!popover) return;

  const mapPrefixes = ['', 'fan-'];

  Object.keys(SECTOR_CENTERS).forEach(id => {
    mapPrefixes.forEach(prefix => {
      const el = document.getElementById(`${prefix}sector-${id}`);
      if (!el) return;

      el.addEventListener('mouseenter', (e) => {
        const state = stadiumStateProvider();
        if (!state || !state.sectors || !state.sectors[id]) return;

        const sector = state.sectors[id];
        document.getElementById('pop-sector-title').textContent = sector.name || `Sector ${id}`;
        document.getElementById('pop-sector-density').textContent = `Density: ${sector.density}%`;
        document.getElementById('pop-sector-lighting').textContent = `Lighting: ${sector.lighting}`;
        document.getElementById('pop-sector-guards').textContent = `Security: ${sector.securityGuards} Guards`;
        document.getElementById('pop-sector-status').textContent = `Status: ${sector.status}`;

        popover.classList.remove('hidden');
        
        const rect = el.getBoundingClientRect();
        const x = rect.left + rect.width / 2 - popover.offsetWidth / 2;
        const y = rect.top - popover.offsetHeight - 8;
        
        popover.style.left = `${x + window.scrollX}px`;
        popover.style.top = `${y + window.scrollY}px`;
      });

      el.addEventListener('mouseleave', () => {
        popover.classList.add('hidden');
      });

      el.addEventListener('click', () => {
        // Dispatch click event for route source/destination selection
        const event = new CustomEvent('sectorSelected', { detail: { sectorId: id } });
        window.dispatchEvent(event);
      });
    });
  });
}

/**
 * Draws the routing path line dynamically using coordinates on both maps.
 */
export function drawRoutingPath(pathSectors) {
  const routeLineIds = ['route-line', 'fan-route-line'];

  routeLineIds.forEach(lineId => {
    const routeLine = document.getElementById(lineId);
    if (!routeLine) return;

    if (!pathSectors || pathSectors.length === 0) {
      routeLine.classList.add('hidden');
      routeLine.setAttribute('points', '');
      return;
    }

    const pointsString = pathSectors
      .map(id => SECTOR_CENTERS[id])
      .filter(Boolean)
      .map(coord => `${coord.x},${coord.y}`)
      .join(' ');

    routeLine.setAttribute('points', pointsString);
    routeLine.classList.remove('hidden');
  });
}

/**
 * Hides the route drawing
 */
export function clearRoutingPath() {
  drawRoutingPath([]);
}

window.drawRoutingPath = drawRoutingPath;
window.clearRoutingPath = clearRoutingPath;
window.SECTOR_CENTERS = SECTOR_CENTERS;
