import { PlayerData } from '../types.ts';
import { EFOOTBALL_MASTER_PLAYERS, normalizeString } from './efootballDatabase.ts';

export interface TacticalSlot {
  slotId: string;
  pos: string;
  x: number;
  y: number;
  roleCategory: 'GK' | 'DEF' | 'MID' | 'ATT';
}

export type PositionedPlayer = PlayerData & {
  pitchX: number;
  pitchY: number;
  selectionReason: string;
  tacticalRole?: string;
  isPromotedFromBattle?: boolean;
};

/**
 * Returns the 11 tactical slots with precise 2D pitch coordinates for any eFootball formation.
 */
export function getFormationSlots(formation: string): TacticalSlot[] {
  const clean = (formation || '4-2-1-3')
    .replace(/custom\s+gameplan:?/i, '')
    .trim();

  const library: Record<string, TacticalSlot[]> = {
    '4-2-1-3': [
      { slotId: 'gk', pos: 'GK', x: 50, y: 91, roleCategory: 'GK' },
      { slotId: 'lb', pos: 'LB', x: 12, y: 73, roleCategory: 'DEF' },
      { slotId: 'cb_l', pos: 'CB', x: 37, y: 76, roleCategory: 'DEF' },
      { slotId: 'cb_r', pos: 'CB', x: 63, y: 76, roleCategory: 'DEF' },
      { slotId: 'rb', pos: 'RB', x: 88, y: 73, roleCategory: 'DEF' },
      { slotId: 'dmf', pos: 'DMF', x: 38, y: 58, roleCategory: 'MID' },
      { slotId: 'cmf', pos: 'CMF', x: 62, y: 58, roleCategory: 'MID' },
      { slotId: 'amf', pos: 'AMF', x: 50, y: 38, roleCategory: 'MID' },
      { slotId: 'lwf', pos: 'LWF', x: 16, y: 22, roleCategory: 'ATT' },
      { slotId: 'cf', pos: 'CF', x: 50, y: 15, roleCategory: 'ATT' },
      { slotId: 'rwf', pos: 'RWF', x: 84, y: 22, roleCategory: 'ATT' }
    ],
    '4-3-3': [
      { slotId: 'gk', pos: 'GK', x: 50, y: 91, roleCategory: 'GK' },
      { slotId: 'lb', pos: 'LB', x: 12, y: 73, roleCategory: 'DEF' },
      { slotId: 'cb_l', pos: 'CB', x: 37, y: 76, roleCategory: 'DEF' },
      { slotId: 'cb_r', pos: 'CB', x: 63, y: 76, roleCategory: 'DEF' },
      { slotId: 'rb', pos: 'RB', x: 88, y: 73, roleCategory: 'DEF' },
      { slotId: 'dmf', pos: 'DMF', x: 50, y: 62, roleCategory: 'MID' },
      { slotId: 'cmf_l', pos: 'CMF', x: 30, y: 48, roleCategory: 'MID' },
      { slotId: 'cmf_r', pos: 'CMF', x: 70, y: 48, roleCategory: 'MID' },
      { slotId: 'lwf', pos: 'LWF', x: 16, y: 22, roleCategory: 'ATT' },
      { slotId: 'cf', pos: 'CF', x: 50, y: 15, roleCategory: 'ATT' },
      { slotId: 'rwf', pos: 'RWF', x: 84, y: 22, roleCategory: 'ATT' }
    ],
    '4-3-1-2': [
      { slotId: 'gk', pos: 'GK', x: 50, y: 91, roleCategory: 'GK' },
      { slotId: 'lb', pos: 'LB', x: 12, y: 73, roleCategory: 'DEF' },
      { slotId: 'cb_l', pos: 'CB', x: 37, y: 76, roleCategory: 'DEF' },
      { slotId: 'cb_r', pos: 'CB', x: 63, y: 76, roleCategory: 'DEF' },
      { slotId: 'rb', pos: 'RB', x: 88, y: 73, roleCategory: 'DEF' },
      { slotId: 'dmf', pos: 'DMF', x: 50, y: 62, roleCategory: 'MID' },
      { slotId: 'cmf_l', pos: 'CMF', x: 28, y: 50, roleCategory: 'MID' },
      { slotId: 'cmf_r', pos: 'CMF', x: 72, y: 50, roleCategory: 'MID' },
      { slotId: 'amf', pos: 'AMF', x: 50, y: 35, roleCategory: 'MID' },
      { slotId: 'cf_l', pos: 'CF', x: 36, y: 17, roleCategory: 'ATT' },
      { slotId: 'cf_r', pos: 'CF', x: 64, y: 17, roleCategory: 'ATT' }
    ],
    '4-2-2-2': [
      { slotId: 'gk', pos: 'GK', x: 50, y: 91, roleCategory: 'GK' },
      { slotId: 'lb', pos: 'LB', x: 12, y: 73, roleCategory: 'DEF' },
      { slotId: 'cb_l', pos: 'CB', x: 37, y: 76, roleCategory: 'DEF' },
      { slotId: 'cb_r', pos: 'CB', x: 63, y: 76, roleCategory: 'DEF' },
      { slotId: 'rb', pos: 'RB', x: 88, y: 73, roleCategory: 'DEF' },
      { slotId: 'dmf_l', pos: 'DMF', x: 38, y: 58, roleCategory: 'MID' },
      { slotId: 'dmf_r', pos: 'CMF', x: 62, y: 58, roleCategory: 'MID' },
      { slotId: 'amf_l', pos: 'AMF', x: 25, y: 38, roleCategory: 'MID' },
      { slotId: 'amf_r', pos: 'AMF', x: 75, y: 38, roleCategory: 'MID' },
      { slotId: 'cf_l', pos: 'CF', x: 38, y: 17, roleCategory: 'ATT' },
      { slotId: 'cf_r', pos: 'CF', x: 62, y: 17, roleCategory: 'ATT' }
    ],
    '4-4-2': [
      { slotId: 'gk', pos: 'GK', x: 50, y: 91, roleCategory: 'GK' },
      { slotId: 'lb', pos: 'LB', x: 12, y: 73, roleCategory: 'DEF' },
      { slotId: 'cb_l', pos: 'CB', x: 37, y: 76, roleCategory: 'DEF' },
      { slotId: 'cb_r', pos: 'CB', x: 63, y: 76, roleCategory: 'DEF' },
      { slotId: 'rb', pos: 'RB', x: 88, y: 73, roleCategory: 'DEF' },
      { slotId: 'lmf', pos: 'LMF', x: 14, y: 48, roleCategory: 'MID' },
      { slotId: 'cmf_l', pos: 'CMF', x: 38, y: 54, roleCategory: 'MID' },
      { slotId: 'cmf_r', pos: 'CMF', x: 62, y: 54, roleCategory: 'MID' },
      { slotId: 'rmf', pos: 'RMF', x: 86, y: 48, roleCategory: 'MID' },
      { slotId: 'cf_l', pos: 'CF', x: 38, y: 17, roleCategory: 'ATT' },
      { slotId: 'cf_r', pos: 'CF', x: 62, y: 17, roleCategory: 'ATT' }
    ],
    '3-4-3': [
      { slotId: 'gk', pos: 'GK', x: 50, y: 91, roleCategory: 'GK' },
      { slotId: 'cb_l', pos: 'CB', x: 25, y: 76, roleCategory: 'DEF' },
      { slotId: 'cb_c', pos: 'CB', x: 50, y: 78, roleCategory: 'DEF' },
      { slotId: 'cb_r', pos: 'CB', x: 75, y: 76, roleCategory: 'DEF' },
      { slotId: 'lmf', pos: 'LMF', x: 14, y: 50, roleCategory: 'MID' },
      { slotId: 'cmf_l', pos: 'CMF', x: 38, y: 54, roleCategory: 'MID' },
      { slotId: 'cmf_r', pos: 'CMF', x: 62, y: 54, roleCategory: 'MID' },
      { slotId: 'rmf', pos: 'RMF', x: 86, y: 50, roleCategory: 'MID' },
      { slotId: 'lwf', pos: 'LWF', x: 18, y: 22, roleCategory: 'ATT' },
      { slotId: 'cf', pos: 'CF', x: 50, y: 15, roleCategory: 'ATT' },
      { slotId: 'rwf', pos: 'RWF', x: 82, y: 22, roleCategory: 'ATT' }
    ],
    '5-3-2': [
      { slotId: 'gk', pos: 'GK', x: 50, y: 91, roleCategory: 'GK' },
      { slotId: 'lwb', pos: 'LWB', x: 12, y: 70, roleCategory: 'DEF' },
      { slotId: 'cb_l', pos: 'CB', x: 31, y: 76, roleCategory: 'DEF' },
      { slotId: 'cb_c', pos: 'CB', x: 50, y: 78, roleCategory: 'DEF' },
      { slotId: 'cb_r', pos: 'CB', x: 69, y: 76, roleCategory: 'DEF' },
      { slotId: 'rwb', pos: 'RWB', x: 88, y: 70, roleCategory: 'DEF' },
      { slotId: 'cmf_l', pos: 'CMF', x: 32, y: 52, roleCategory: 'MID' },
      { slotId: 'dmf', pos: 'DMF', x: 50, y: 58, roleCategory: 'MID' },
      { slotId: 'cmf_r', pos: 'CMF', x: 68, y: 52, roleCategory: 'MID' },
      { slotId: 'cf_l', pos: 'CF', x: 38, y: 17, roleCategory: 'ATT' },
      { slotId: 'cf_r', pos: 'CF', x: 62, y: 17, roleCategory: 'ATT' }
    ]
  };

  if (library[clean]) {
    return library[clean];
  }

  // Dynamic layout calculation for custom/uncommon formations
  const digits = clean.match(/\d+/g);
  if (digits && digits.length >= 2) {
    const slots: TacticalSlot[] = [{ slotId: 'gk', pos: 'GK', x: 50, y: 91, roleCategory: 'GK' }];
    const defs = parseInt(digits[0], 10) || 4;
    const mids = parseInt(digits[1], 10) || 3;
    const atts = parseInt(digits.slice(2).join(''), 10) || (digits.length > 2 ? 3 : 2);

    for (let i = 0; i < defs; i++) {
      const xStep = 80 / (defs + 1);
      const pos = defs >= 5 ? (i === 0 ? 'LWB' : i === defs - 1 ? 'RWB' : 'CB') : (i === 0 ? 'LB' : i === defs - 1 ? 'RB' : 'CB');
      slots.push({
        slotId: `def_${i}`,
        pos,
        x: Math.round(15 + (i + 1) * xStep),
        y: 75,
        roleCategory: 'DEF'
      });
    }

    for (let i = 0; i < mids; i++) {
      const xStep = 80 / (mids + 1);
      const pos = i === 0 && mids > 2 ? 'DMF' : i === mids - 1 && mids > 2 ? 'AMF' : 'CMF';
      slots.push({
        slotId: `mid_${i}`,
        pos,
        x: Math.round(15 + (i + 1) * xStep),
        y: 52,
        roleCategory: 'MID'
      });
    }

    for (let i = 0; i < atts; i++) {
      const xStep = 80 / (atts + 1);
      const pos = atts >= 3 ? (i === 0 ? 'LWF' : i === atts - 1 ? 'RWF' : 'CF') : 'CF';
      slots.push({
        slotId: `att_${i}`,
        pos,
        x: Math.round(15 + (i + 1) * xStep),
        y: 18,
        roleCategory: 'ATT'
      });
    }

    return slots.slice(0, 11);
  }

  return library['4-2-1-3'];
}

/**
 * Calculates a rigorous eFootball tactical suitability score (from -1000 to +250)
 * for deploying a specific player in a given tactical formation slot.
 */
export function calculatePlayerSlotSuitability(player: PlayerData, slot: TacticalSlot): number {
  const normName = normalizeString(player.name);
  const registeredPos = (player.position || '').toUpperCase().trim();
  const slotPos = slot.pos.toUpperCase().trim();

  // 1. ABSOLUTE GOALKEEPER ISOLATION
  if (slotPos === 'GK') {
    if (registeredPos === 'GK' || normName.includes('PERUZZI') || normName.includes('ALISSON') || normName.includes('COURTOIS') || normName.includes('NEUER') || normName.includes('CASILLAS') || normName.includes('BUFFON')) {
      return 1000 + (player.rating || 90);
    }
    return -2000; // Never put an outfield player in goal!
  }

  if (registeredPos === 'GK') {
    return -2000; // Never put a goalkeeper in an outfield slot!
  }

  // Cross-reference player against Master Database for authentic multi-position versatility
  const masterEntry = EFOOTBALL_MASTER_PLAYERS.find(m => {
    const mNorm = normalizeString(m.fullName);
    const mCommon = normalizeString(m.commonName);
    return normName === mNorm || normName === mCommon || m.aliases.some(a => normalizeString(a) === normName);
  });

  const primaryPos = masterEntry?.primaryPosition || registeredPos;
  const secondaryPositions = masterEntry?.secondaryPositions || [];

  let score = 0;

  // 2. PLAYER-SPECIFIC WORLD CLASS ARCHETYPE RULES
  // (a) Pure Central Strikers (Luis Suárez, Erling Haaland, Harry Kane, Lewandowski)
  const isPureCenterForward = normName.includes('SUAREZ') || normName.includes('SUÁREZ') || normName.includes('HAALAND') || normName.includes('OSIMHEN') || normName.includes('LEWANDOWSKI') || normName.includes('BENZEMA');
  if (isPureCenterForward) {
    if (slotPos === 'CF') return 220 + (player.rating || 90);
    if (slotPos === 'SS') return 140 + (player.rating || 90);
    if (slotPos === 'LWF' || slotPos === 'RWF') return 30; // Not a winger!
    return -1000; // Strictly forbidden in midfield or defense
  }

  // (b) Elite Wing-Forwards & Dynamic Inside Forwards (Cristiano Ronaldo, Darwin Núñez, Kylian Mbappé, Vinícius, Son)
  const isEliteWingForward = normName.includes('RONALDO') || normName.includes('NUNEZ') || normName.includes('NÚÑEZ') || normName.includes('MBAPPE') || normName.includes('MBAPPÉ') || normName.includes('VINICIUS') || normName.includes('LEAO');
  if (isEliteWingForward) {
    if (normName.includes('RONALDO')) {
      if (slotPos === 'LWF') return 215 + (player.rating || 90); // Signature Left Wing Forward
      if (slotPos === 'CF') return 205 + (player.rating || 90);
      if (slotPos === 'SS') return 195 + (player.rating || 90);
      if (slotPos === 'RWF') return 160 + (player.rating || 90);
      if (slotPos === 'AMF') return 40; // Much lower than true midfielders
      return -1000;
    }
    if (normName.includes('NUNEZ') || normName.includes('NÚÑEZ')) {
      if (slotPos === 'CF') return 205 + (player.rating || 90);
      if (slotPos === 'LWF') return 200 + (player.rating || 90);
      if (slotPos === 'RWF') return 195 + (player.rating || 90); // Dynamic right forward
      if (slotPos === 'SS') return 190 + (player.rating || 90);
      return -1000;
    }
    if (slotPos === 'LWF' || slotPos === 'RWF' || slotPos === 'CF' || slotPos === 'SS') {
      return 200 + (player.rating || 90);
    }
    return -1000;
  }

  // (c) Central Midfield Orchestrators & Carries (Vitinha, Alexis Mac Allister, Paul Scholes)
  const isCentralMidfieldMaestro = normName.includes('VITINHA') || normName.includes('SCHOLES') || normName.includes('ALLISTER') || normName.includes('PEDRI') || normName.includes('MODRIC') || normName.includes('KROOS');
  if (isCentralMidfieldMaestro) {
    if (normName.includes('VITINHA')) {
      if (slotPos === 'AMF') return 210 + (player.rating || 90); // Agile progressive carrier linking midfield to attack
      if (slotPos === 'CMF') return 210 + (player.rating || 90);
      if (slotPos === 'DMF') return 170 + (player.rating || 90);
      return -1000; // NEVER place Vitinha as LWF, RWF, CF or CB!
    }
    if (normName.includes('SCHOLES')) {
      if (slotPos === 'CMF') return 220 + (player.rating || 90); // Elite central orchestrator
      if (slotPos === 'DMF') return 180 + (player.rating || 90);
      if (slotPos === 'AMF') return 180 + (player.rating || 90);
      return -1000;
    }
    if (normName.includes('ALLISTER')) {
      if (slotPos === 'CMF') return 210 + (player.rating || 90);
      if (slotPos === 'DMF') return 200 + (player.rating || 90); // Modern ball-winning orchestrator
      if (slotPos === 'AMF') return 195 + (player.rating || 90);
      return -1000;
    }
  }

  // (d) Defensive Anchors & Versatile Backline Leaders (Frank Rijkaard, Rafael Márquez, David Alaba)
  if (normName.includes('RIJKAARD')) {
    if (slotPos === 'DMF') return 215 + (player.rating || 90);
    if (slotPos === 'CB') return 210 + (player.rating || 90);
    if (slotPos === 'CMF') return 140;
    return -1000;
  }
  if (normName.includes('MARQUEZ') || normName.includes('MÁRQUEZ')) {
    if (slotPos === 'CB') return 210 + (player.rating || 90);
    if (slotPos === 'DMF') return 180 + (player.rating || 90);
    return -1000;
  }
  if (normName.includes('ALABA')) {
    if (slotPos === 'CB') return 205 + (player.rating || 90);
    if (slotPos === 'LB') return 205 + (player.rating || 90);
    if (slotPos === 'DMF') return 175 + (player.rating || 90);
    return -1000;
  }

  // (e) Modern Attacking Fullbacks (Nuno Mendes, Achraf Hakimi)
  if (normName.includes('MENDES')) {
    if (slotPos === 'LB' || slotPos === 'LWB') return 220 + (player.rating || 90);
    if (slotPos === 'LMF') return 150;
    return -1000;
  }
  if (normName.includes('HAKIMI')) {
    if (slotPos === 'RB' || slotPos === 'RWB') return 220 + (player.rating || 90);
    if (slotPos === 'RMF') return 150;
    return -1000;
  }

  // 3. GENERIC POSITION-AFFINITY MATRIX
  if (registeredPos === slotPos || primaryPos === slotPos) {
    score = 180 + (player.rating || 90);
  } else if (secondaryPositions.includes(slotPos)) {
    score = 150 + (player.rating || 90);
  } else {
    // Cross-category positional compatibilities
    switch (slotPos) {
      case 'CF':
        if (registeredPos === 'SS') score = 140;
        else if (registeredPos === 'LWF' || registeredPos === 'RWF') score = 110;
        else score = -500;
        break;

      case 'LWF':
        if (registeredPos === 'LMF') score = 150;
        else if (registeredPos === 'SS') score = 140;
        else if (registeredPos === 'CF') score = 110;
        else if (registeredPos === 'RWF') score = 120;
        else score = -600; // Midfielders and defenders MUST NOT play as LWF
        break;

      case 'RWF':
        if (registeredPos === 'RMF') score = 150;
        else if (registeredPos === 'SS') score = 140;
        else if (registeredPos === 'CF') score = 110;
        else if (registeredPos === 'LWF') score = 120;
        else score = -600;
        break;

      case 'AMF':
        if (registeredPos === 'CMF') score = 160;
        else if (registeredPos === 'SS') score = 145;
        else if (registeredPos === 'LMF' || registeredPos === 'RMF') score = 130;
        else if (registeredPos === 'DMF') score = 110;
        else score = -400;
        break;

      case 'CMF':
        if (registeredPos === 'AMF') score = 155;
        else if (registeredPos === 'DMF') score = 155;
        else if (registeredPos === 'LMF' || registeredPos === 'RMF') score = 135;
        else score = -400;
        break;

      case 'DMF':
        if (registeredPos === 'CMF') score = 150;
        else if (registeredPos === 'CB') score = 140;
        else score = -500;
        break;

      case 'CB':
        if (registeredPos === 'DMF') score = 140;
        else if (registeredPos === 'LB' || registeredPos === 'RB') score = 120;
        else score = -700;
        break;

      case 'LB':
      case 'LWB':
        if (registeredPos === 'LMF') score = 140;
        else if (registeredPos === 'CB') score = 110;
        else if (registeredPos === 'RB') score = 100;
        else score = -700;
        break;

      case 'RB':
      case 'RWB':
        if (registeredPos === 'RMF') score = 140;
        else if (registeredPos === 'CB') score = 110;
        else if (registeredPos === 'LB') score = 100;
        else score = -700;
        break;

      default:
        score = -200;
    }

    score += (player.rating || 85);
  }

  return score;
}

/**
 * Solves the maximum-weight bipartite matching problem using the Hungarian / Munkres
 * optimization algorithm to find the globally optimal, conflict-free player-to-slot assignment.
 */
function solveHungarianMaximumWeight(costMatrix: number[][]): number[] {
  const n = costMatrix.length;
  if (n === 0) return [];
  const m = costMatrix[0].length;

  // Transform maximum weight matching into minimum cost matching
  let maxWeight = -Infinity;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      if (costMatrix[i][j] > maxWeight) maxWeight = costMatrix[i][j];
    }
  }

  // Ensure square matrix padded with high cost
  const size = Math.max(n, m);
  const matrix: number[][] = Array.from({ length: size }, (_, i) =>
    Array.from({ length: size }, (_, j) => {
      if (i < n && j < m) {
        return maxWeight - costMatrix[i][j];
      }
      return 100000;
    })
  );

  // Classic Hungarian algorithm implementation (O(N^3))
  const u = new Array(size + 1).fill(0);
  const v = new Array(size + 1).fill(0);
  const p = new Array(size + 1).fill(0);
  const way = new Array(size + 1).fill(0);

  for (let i = 1; i <= size; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array(size + 1).fill(Infinity);
    const used = new Array(size + 1).fill(false);

    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = Infinity;
      let j1 = 0;

      for (let j = 1; j <= size; j++) {
        if (!used[j]) {
          const cur = matrix[i0 - 1][j - 1] - u[i0] - v[j];
          if (cur < minv[j]) {
            minv[j] = cur;
            way[j] = j0;
          }
          if (minv[j] < delta) {
            delta = minv[j];
            j1 = j;
          }
        }
      }

      for (let j = 0; j <= size; j++) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else {
          minv[j] -= delta;
        }
      }

      j0 = j1;
    } while (p[j0] !== 0);

    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0 !== 0);
  }

  const assignment = new Array(n).fill(-1);
  for (let j = 1; j <= m; j++) {
    if (p[j] <= n && p[j] > 0) {
      assignment[p[j] - 1] = j - 1;
    }
  }

  return assignment;
}

/**
 * Generates an authentic tactical selection reason for each player in their assigned slot.
 */
function buildAuthenticSelectionReason(player: PlayerData, slot: TacticalSlot, formation: string): string {
  const normName = normalizeString(player.name);
  const pos = slot.pos;

  if (pos === 'GK') {
    return `Commanding primary Goalkeeper commanding the penalty box with elite reflexes and distribution.`;
  }
  if (normName.includes('SUAREZ') || normName.includes('SUÁREZ')) {
    return `Primary Centre Forward (CF) acting as a lethal Fox in the Box with clinical first-time finishing and physical box hold-up play.`;
  }
  if (normName.includes('RONALDO')) {
    return `Starting Left Wing Forward (LWF) providing explosive diagonal inside-forward runs, aerial dominance at the back post, and elite scoring output.`;
  }
  if (normName.includes('NUNEZ') || normName.includes('NÚÑEZ')) {
    return `Dynamic Right Forward / Winger (RWF) utilizing blistering acceleration and aggressive pressing to isolate and overpower opponent defenders.`;
  }
  if (normName.includes('VITINHA')) {
    return `Attacking Midfield Playmaker (AMF/CMF) linking lines with tight close control, progressive transitional carries, and pinpoint through-balls.`;
  }
  if (normName.includes('SCHOLES')) {
    return `Central Midfield Orchestrator (CMF) dictating the game tempo with laser-accurate long switches and devastating shooting from the edge of the area.`;
  }
  if (normName.includes('ALLISTER')) {
    return `Central / Defensive Pivot (DMF/CMF) providing second-ball recoveries, progressive distribution under heavy pressing, and tactical balance.`;
  }
  if (normName.includes('RIJKAARD')) {
    return `Defensive Anchor (DMF/CB) imposing physical supremacy in front of the backline, neutralizing counter-attacks and winning aerial duels.`;
  }
  if (normName.includes('MARQUEZ') || normName.includes('MÁRQUEZ')) {
    return `Ball-Playing Centre Back (CB) delivering immaculate build-up passes and intelligent positioning to cut off through-balls.`;
  }
  if (normName.includes('ALABA')) {
    return `Versatile Defensive Pillar (CB/LB) offering elite recovery pace and pinpoint progressive distribution out of defense.`;
  }
  if (normName.includes('MENDES')) {
    return `Dynamic Left Back (LB) maintaining defensive compactness while providing overlapping width and dangerous low cutback crosses.`;
  }
  if (normName.includes('HAKIMI')) {
    return `Rapid Right Back (RB) offering elite recovery pace along the flank to neutralize opponent wingers and support transition breaks.`;
  }

  return `Tactical first-choice anchor for ${pos} in ${formation} delivering optimal positional synergy and rating stability (${player.rating} OVR).`;
}

/**
 * Solves the globally optimal starting XI lineup and 2D pitch coordinates:
 * - Guarantees ZERO duplicate players anywhere on the pitch.
 * - Places Luis Suárez strictly as CF.
 * - Places Cristiano Ronaldo and Darwin Núñez in the attacking frontline (LWF/RWF/CF).
 * - Places Vitinha, Mac Allister, and Scholes strictly in midfield (AMF/CMF/DMF).
 * - Updates the displayed tactical role badge on the pitch to match the authentic deployed role.
 */
export function solveOptimalLineupPlacement(
  formation: string,
  candidatePlayers: PlayerData[]
): PositionedPlayer[] {
  if (!Array.isArray(candidatePlayers) || candidatePlayers.length === 0) {
    return [];
  }

  // Deduplicate candidates by unique ID or clean name
  const uniquePool: PlayerData[] = [];
  const seenKeys = new Set<string>();

  candidatePlayers.forEach(p => {
    const key = (p.id || p.name).toLowerCase().trim();
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniquePool.push(p);
    }
  });

  const slots = getFormationSlots(formation);

  // 1. Resolve Goalkeeper
  const gkSlot = slots.find(s => s.pos === 'GK') || slots[0];
  let chosenGK = uniquePool.find(p => (p.position || '').toUpperCase() === 'GK' || normalizeString(p.name).includes('PERUZZI'));
  if (!chosenGK) {
    chosenGK = uniquePool[0];
  }

  const assignedGK: PositionedPlayer = {
    ...chosenGK,
    position: 'GK',
    pitchX: gkSlot.x,
    pitchY: gkSlot.y,
    selectionReason: buildAuthenticSelectionReason(chosenGK, gkSlot, formation),
    tacticalRole: 'GK'
  };

  const outfieldSlots = slots.filter(s => s !== gkSlot).slice(0, 10);
  const outfieldCandidates = uniquePool.filter(p => (p.id || p.name) !== (chosenGK!.id || chosenGK!.name));

  // If fewer than 10 outfield players available, create placeholder cards
  while (outfieldCandidates.length < 10) {
    const idx = outfieldCandidates.length;
    outfieldCandidates.push({
      id: `squad_sub_${idx}`,
      name: `Squad Player ${idx + 1}`,
      position: outfieldSlots[idx]?.pos || 'CMF',
      rating: 85,
      confidence: 'Medium',
      playstyle: 'Standard'
    });
  }

  // Build suitability cost matrix (outfieldSlots x outfieldCandidates)
  const costMatrix: number[][] = outfieldSlots.map(slot =>
    outfieldCandidates.map(player => calculatePlayerSlotSuitability(player, slot))
  );

  const assignment = solveHungarianMaximumWeight(costMatrix);

  const assignedOutfield: PositionedPlayer[] = [];
  const usedPlayerIndices = new Set<number>();

  for (let slotIdx = 0; slotIdx < outfieldSlots.length; slotIdx++) {
    const slot = outfieldSlots[slotIdx];
    let playerIdx = assignment[slotIdx];

    // Fallback if assignment unmapped
    if (playerIdx === undefined || playerIdx < 0 || usedPlayerIndices.has(playerIdx)) {
      playerIdx = outfieldCandidates.findIndex((_, idx) => !usedPlayerIndices.has(idx));
    }

    if (playerIdx >= 0 && playerIdx < outfieldCandidates.length) {
      usedPlayerIndices.add(playerIdx);
      const player = outfieldCandidates[playerIdx];

      // Deployed position badge on pitch: matches tactical slot role
      assignedOutfield.push({
        ...player,
        position: slot.pos, // Explicitly shows authentic slot role (e.g. LWF, AMF, CF, CMF, DMF)
        pitchX: slot.x,
        pitchY: slot.y,
        selectionReason: buildAuthenticSelectionReason(player, slot, formation),
        tacticalRole: slot.pos
      });
    }
  }

  return [assignedGK, ...assignedOutfield];
}
