import { SECTOR_GRAPH, VALID_SECTORS } from '../../../public/js/constants.js';

/**
 * Dijkstra's algorithm for safest route through stadium sectors.
 * Edge weights are dynamically computed from crowd density, lighting, and incident status.
 * @param {string} start - Starting sector ID
 * @param {string} end - Destination sector ID
 * @param {object} sectors - Current sector state map
 * @param {string} userType - User profile (woman, elderly, child, general)
 * @returns {string[]} Ordered array of sector IDs forming the safest path
 */
export function dijkstraSafePath(start, end, sectors, userType) {
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

/**
 * Computes the safest route based on starting sector and destination, adding safety warnings.
 */
export function computeSafeRoute(routingRequest, sectors, safetyZones) {
  const { startSector, destSector, userType } = routingRequest;
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
