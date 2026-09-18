import { PlayerData, AnalysisResult, SquadRatingsBreakdown, IndividualInstruction } from '../types.ts';

export interface ComparisonBattle {
  id: string;
  playerA: PlayerData;
  playerB: PlayerData;
  position: string;
  category: 'starter_vs_sub' | 'same_position' | 'tactical_alternative' | 'custom';
  title: string;
  context: string;
  recommendedStarter: PlayerData;
  substitutePlayer?: PlayerData;
  verdictReason: string;
  secondaryRole: string;
}

export interface ComparisonStartingPlayer extends PlayerData {
  pitchX: number;
  pitchY: number;
  selectionReason: string;
  isPromotedFromBattle?: boolean;
  battleVerdict?: string;
  h2hRivalName?: string;
  h2hRivalRating?: number;
}

export interface ComparisonBenchPlayer extends PlayerData {
  secondaryRole: string;
  impactMinute: string;
  rotationNote?: string;
}

export interface ComparisonChangeItem {
  position: string;
  starterName: string;
  starterRating: number;
  rivalName?: string;
  rivalRating?: number;
  type: 'promoted' | 'confirmed' | 'uncontested';
  reason: string;
}

export interface ComparisonStartingXIResult {
  formation: string;
  tacticalPlaystyle: string;
  startingXI: ComparisonStartingPlayer[];
  benchPlayers: ComparisonBenchPlayer[];
  averageRating: number;
  promotionsCount: number;
  confirmedCount: number;
  changesSummary: ComparisonChangeItem[];
  squadRatings: SquadRatingsBreakdown;
  individualInstructions: IndividualInstruction[];
  inMatchAdjustments: {
    counteringWideOverloads: string;
    counteringCentralThroughBalls: string;
    leadingLate: string;
    trailingLate: string;
  };
}

// Normalizes positions to group tactical equivalents
export function normalizePositionGroup(pos: string): string {
  const p = (pos || '').toUpperCase().trim();
  if (['LB', 'LWB'].includes(p)) return 'LB';
  if (['RB', 'RWB'].includes(p)) return 'RB';
  if (['LWF', 'LWG', 'LMF'].includes(p)) return 'LWF';
  if (['RWF', 'RWG', 'RMF'].includes(p)) return 'RWF';
  if (['CF', 'SS'].includes(p)) return 'CF';
  if (['DMF'].includes(p)) return 'DMF';
  if (['CMF'].includes(p)) return 'CMF';
  if (['AMF'].includes(p)) return 'AMF';
  if (['CB'].includes(p)) return 'CB';
  if (['GK'].includes(p)) return 'GK';
  return p;
}

export function isPlayerStarter(player: PlayerData, allPlayers: PlayerData[]): boolean {
  if (player.cardArea === 'starting_xi') return true;
  if (player.cardArea === 'substitute' || player.cardArea === 'reserve') return false;
  if (player.isBench === true) return false;
  if (player.isBench === false) return true;

  // Fallback based on index in array
  const idx = allPlayers.findIndex(p => (p.id && p.id === player.id) || p.name === player.name);
  return idx >= 0 && idx < 11;
}

// Generates an automated, tactical head-to-head verdict
export function generateTacticalComparisonVerdict(
  p1: PlayerData,
  p2: PlayerData,
  tacticalPlaystyle = 'Quick Counter',
  category: string
): { recommendedStarter: PlayerData; verdictReason: string; secondaryRole: string } {
  const rating1 = Number(p1.rating) || 85;
  const rating2 = Number(p2.rating) || 85;

  let starter = rating1 >= rating2 ? p1 : p2;
  let sub = starter === p1 ? p2 : p1;

  const style1 = p1.playstyle || 'Standard';
  const style2 = p2.playstyle || 'Standard';
  const pos = p1.position.toUpperCase();

  let secondaryRole = 'Impact Substitution (65\' - 70\')';
  let verdictReason = '';

  if (category === 'starter_vs_sub') {
    secondaryRole = 'High-Impact 2nd Half Substitution';
    verdictReason = `${starter.name} (${starter.rating} OVR, ${style1}) is recommended for the starting lineup under your ${tacticalPlaystyle} setup due to superior baseline consistency and role alignment. Keep ${sub.name} (${sub.rating} OVR, ${style2}) as your designated replacement around the 65th minute to capitalize on opponent fatigue and dynamic match momentum.`;
  } else if (category === 'same_position') {
    if (pos === 'CB') {
      secondaryRole = 'Defensive Rotation & Pairing Partner';
      verdictReason = `Between these two center-backs, ${starter.name} (${starter.rating} OVR) provides primary defensive stability. ${sub.name} (${sub.rating} OVR) should be paired alongside or rotated based on condition arrows (A/B form) to maintain a rock-solid backline.`;
    } else if (pos === 'CF') {
      secondaryRole = 'Game-Changer Substitution';
      verdictReason = `${starter.name} (${starter.rating} OVR) provides the clinical finishing and movement profile to spearhead the attack from the opening whistle. ${sub.name} (${sub.rating} OVR) offers an alternate threat off the bench when chasing a goal or breaking down a low block.`;
    } else if (pos === 'LB' || pos === 'RB') {
      secondaryRole = 'Fullback Rotation & Stamina Cover';
      verdictReason = `${starter.name} is the primary choice for modern flank coverage with an OVR of ${starter.rating}. Because fullbacks cover heavy mileage in ${tacticalPlaystyle}, ${sub.name} is a vital bench asset to prevent defensive lapses late in the match.`;
    } else {
      secondaryRole = 'Tactical Rotational Option';
      verdictReason = `${starter.name} (${starter.rating} OVR) edges out ${sub.name} (${sub.rating} OVR) for the starting spot in ${tacticalPlaystyle}. Both cards are viable, with ${starter.name} offering higher tactical reliability.`;
    }
  } else {
    secondaryRole = 'Tactical Alternative';
    verdictReason = `${starter.name} (${starter.position}, ${starter.rating} OVR) is favored in the initial lineup over ${sub.name} (${sub.position}, ${sub.rating} OVR), giving your squad better balance in the ${tacticalPlaystyle} framework.`;
  }

  return { recommendedStarter: starter, verdictReason, secondaryRole };
}

/**
 * Scans all squad players to detect every player pair that needs comparison:
 * 1. Starting XI vs Substitutes in the same position (e.g. Starting CF vs Sub CF, Starting LB vs Sub LB)
 * 2. Starting XI peers playing the same position (e.g. CB and CB, CMF and CMF)
 * 3. Substitutes depth peers (e.g. Sub CF 1 vs Sub CF 2)
 * 4. Starting XI vs Substitutes in compatible/equivalent positions (e.g. LWF vs LMF, CF vs SS)
 * 5. Fallback pair if no duplicate positions exist
 */
export function detectAllSquadComparisons(
  players: PlayerData[],
  tacticalPlaystyle = 'Quick Counter'
): ComparisonBattle[] {
  if (!Array.isArray(players) || players.length < 2) {
    return [];
  }

  const starters: PlayerData[] = [];
  const substitutes: PlayerData[] = [];

  players.forEach((p, idx) => {
    if (isPlayerStarter(p, players)) {
      starters.push(p);
    } else {
      substitutes.push(p);
    }
  });

  // If no substitutes were found (e.g. all 11 or flags missing), first 11 starters, rest subs
  if (substitutes.length === 0 && players.length > 11) {
    starters.length = 0;
    substitutes.length = 0;
    players.forEach((p, idx) => {
      if (idx < 11) starters.push(p);
      else substitutes.push(p);
    });
  }

  const battles: ComparisonBattle[] = [];
  const seenPairKeys = new Set<string>();

  const getPairKey = (p1: PlayerData, p2: PlayerData) => {
    const k1 = p1.id || p1.name;
    const k2 = p2.id || p2.name;
    return [k1, k2].sort().join(':::');
  };

  const addBattle = (
    pA: PlayerData,
    pB: PlayerData,
    position: string,
    category: ComparisonBattle['category'],
    title: string,
    context: string
  ) => {
    if (pA.name === pB.name && pA.id === pB.id) return;
    const key = getPairKey(pA, pB);
    if (seenPairKeys.has(key)) return;
    seenPairKeys.add(key);

    const { recommendedStarter, verdictReason, secondaryRole } = generateTacticalComparisonVerdict(
      pA,
      pB,
      tacticalPlaystyle,
      category
    );

    battles.push({
      id: `battle_${battles.length + 1}_${pA.position}_${pB.position}`,
      playerA: pA,
      playerB: pB,
      position,
      category,
      title,
      context,
      recommendedStarter,
      substitutePlayer: recommendedStarter === pA ? pB : pA,
      verdictReason,
      secondaryRole
    });
  };

  const pairedSubIds = new Set<string>();

  // 1. Starting XI vs Substitutes in the exact same position (LB vs LB, CB vs CB, CF vs CF, etc.)
  substitutes.forEach((sub) => {
    const subPos = (sub.position || '').toUpperCase();
    const matchingStarters = starters.filter(
      (st) => (st.position || '').toUpperCase() === subPos
    );

    matchingStarters.forEach((starter) => {
      pairedSubIds.add(sub.id || sub.name);
      addBattle(
        starter,
        sub,
        subPos,
        'starter_vs_sub',
        `${subPos} Position Battle: Starter vs Substitution`,
        `Direct competition for starting ${subPos} role between ${starter.name} (Starting XI) and ${sub.name} (Bench)`
      );
    });
  });

  // 2. Same Position inside Starting XI (e.g. CB and CB, CMF and CMF, CF and CF)
  for (let i = 0; i < starters.length; i++) {
    for (let j = i + 1; j < starters.length; j++) {
      const p1 = starters[i];
      const p2 = starters[j];
      const pos1 = (p1.position || '').toUpperCase();
      const pos2 = (p2.position || '').toUpperCase();

      if (pos1 && pos1 === pos2) {
        addBattle(
          p1,
          p2,
          pos1,
          'same_position',
          `${pos1} Starting XI Dual-Spot Comparison`,
          `Evaluating role distribution and primary anchor between starting ${pos1} cards: ${p1.name} and ${p2.name}`
        );
      }
    }
  }

  // 3. Same Position inside Substitutes (e.g. Sub CF 1 vs Sub CF 2)
  for (let i = 0; i < substitutes.length; i++) {
    for (let j = i + 1; j < substitutes.length; j++) {
      const p1 = substitutes[i];
      const p2 = substitutes[j];
      const pos1 = (p1.position || '').toUpperCase();
      const pos2 = (p2.position || '').toUpperCase();

      if (pos1 && pos1 === pos2) {
        addBattle(
          p1,
          p2,
          pos1,
          'same_position',
          `${pos1} Bench Depth & Priority Contest`,
          `Determining substitution hierarchy between bench ${pos1} options: ${p1.name} vs ${p2.name}`
        );
      }
    }
  }

  // 4. Starting XI vs Substitutes in tactical equivalent positions (e.g. LWF vs LMF, CF vs SS, LB vs LWB)
  substitutes.forEach((sub) => {
    const subId = sub.id || sub.name;
    if (!pairedSubIds.has(subId)) {
      const subGroup = normalizePositionGroup(sub.position);
      const compatibleStarters = starters.filter(
        (st) => normalizePositionGroup(st.position) === subGroup
      );

      compatibleStarters.forEach((starter) => {
        pairedSubIds.add(subId);
        addBattle(
          starter,
          sub,
          `${starter.position}/${sub.position}`,
          'tactical_alternative',
          `${starter.position} vs ${sub.position} Tactical Role Contender`,
          `Tactical comparison between starting ${starter.position} (${starter.name}) and bench alternative ${sub.position} (${sub.name})`
        );
      });
    }
  });

  // 5. Fallback: If no positional comparisons were detected, pair the top two players
  if (battles.length === 0 && players.length >= 2) {
    const sorted = [...players].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    addBattle(
      sorted[0],
      sorted[1],
      `${sorted[0].position || 'FWD'}/${sorted[1].position || 'FWD'}`,
      'same_position',
      `Squad Key Players Head-to-Head`,
      `Head-to-head comparison between top rated squad players ${sorted[0].name} and ${sorted[1].name}`
    );
  }

  return battles;
}

/**
 * Standard tactical pitch coordinates mapped for popular and custom formations
 */
export function generatePitchCoordinatesForFormation(
  formation: string,
  players: PlayerData[]
): (PlayerData & { pitchX: number; pitchY: number; selectionReason: string })[] {
  const gk = players.find(p => (p.position || '').toUpperCase() === 'GK') || players[0];
  const others = players.filter(p => p !== gk);

  const cleanForm = (formation || '4-2-1-3')
    .replace(/custom\s+gameplan:?/i, '')
    .trim();

  const coordsMap: Record<string, Array<{ pos: string; x: number; y: number }>> = {
    '4-2-1-3': [
      { pos: 'GK', x: 50, y: 91 },
      { pos: 'LB', x: 12, y: 73 },
      { pos: 'CB', x: 37, y: 76 },
      { pos: 'CB', x: 63, y: 76 },
      { pos: 'RB', x: 88, y: 73 },
      { pos: 'DMF', x: 38, y: 58 },
      { pos: 'CMF', x: 62, y: 58 },
      { pos: 'AMF', x: 50, y: 38 },
      { pos: 'LWF', x: 16, y: 22 },
      { pos: 'CF', x: 50, y: 15 },
      { pos: 'RWF', x: 84, y: 22 }
    ],
    '4-3-3': [
      { pos: 'GK', x: 50, y: 91 },
      { pos: 'LB', x: 12, y: 73 },
      { pos: 'CB', x: 37, y: 76 },
      { pos: 'CB', x: 63, y: 76 },
      { pos: 'RB', x: 88, y: 73 },
      { pos: 'DMF', x: 50, y: 62 },
      { pos: 'CMF', x: 30, y: 48 },
      { pos: 'CMF', x: 70, y: 48 },
      { pos: 'LWF', x: 16, y: 22 },
      { pos: 'CF', x: 50, y: 15 },
      { pos: 'RWF', x: 84, y: 22 }
    ],
    '4-3-1-2': [
      { pos: 'GK', x: 50, y: 91 },
      { pos: 'LB', x: 12, y: 73 },
      { pos: 'CB', x: 37, y: 76 },
      { pos: 'CB', x: 63, y: 76 },
      { pos: 'RB', x: 88, y: 73 },
      { pos: 'DMF', x: 50, y: 62 },
      { pos: 'CMF', x: 28, y: 50 },
      { pos: 'CMF', x: 72, y: 50 },
      { pos: 'AMF', x: 50, y: 35 },
      { pos: 'CF', x: 36, y: 17 },
      { pos: 'CF', x: 64, y: 17 }
    ],
    '3-4-3': [
      { pos: 'GK', x: 50, y: 91 },
      { pos: 'CB', x: 25, y: 76 },
      { pos: 'CB', x: 50, y: 78 },
      { pos: 'CB', x: 75, y: 76 },
      { pos: 'LMF', x: 14, y: 50 },
      { pos: 'CMF', x: 38, y: 54 },
      { pos: 'CMF', x: 62, y: 54 },
      { pos: 'RMF', x: 86, y: 50 },
      { pos: 'LWF', x: 18, y: 22 },
      { pos: 'CF', x: 50, y: 15 },
      { pos: 'RWF', x: 82, y: 22 }
    ],
    '5-3-2': [
      { pos: 'GK', x: 50, y: 91 },
      { pos: 'LWB', x: 12, y: 70 },
      { pos: 'CB', x: 31, y: 76 },
      { pos: 'CB', x: 50, y: 78 },
      { pos: 'CB', x: 69, y: 76 },
      { pos: 'RWB', x: 88, y: 70 },
      { pos: 'CMF', x: 32, y: 52 },
      { pos: 'DMF', x: 50, y: 58 },
      { pos: 'CMF', x: 68, y: 52 },
      { pos: 'CF', x: 38, y: 17 },
      { pos: 'CF', x: 62, y: 17 }
    ],
    '5-3-1-1': [
      { pos: 'GK', x: 50, y: 91 },
      { pos: 'LWB', x: 12, y: 70 },
      { pos: 'CB', x: 31, y: 76 },
      { pos: 'CB', x: 50, y: 78 },
      { pos: 'CB', x: 69, y: 76 },
      { pos: 'RWB', x: 88, y: 70 },
      { pos: 'CMF', x: 32, y: 52 },
      { pos: 'DMF', x: 50, y: 58 },
      { pos: 'CMF', x: 68, y: 52 },
      { pos: 'AMF', x: 50, y: 35 },
      { pos: 'CF', x: 50, y: 15 }
    ],
    '4-2-2-2': [
      { pos: 'GK', x: 50, y: 91 },
      { pos: 'LB', x: 12, y: 73 },
      { pos: 'CB', x: 37, y: 76 },
      { pos: 'CB', x: 63, y: 76 },
      { pos: 'RB', x: 88, y: 73 },
      { pos: 'DMF', x: 38, y: 58 },
      { pos: 'CMF', x: 62, y: 58 },
      { pos: 'AMF', x: 25, y: 38 },
      { pos: 'AMF', x: 75, y: 38 },
      { pos: 'CF', x: 38, y: 17 },
      { pos: 'CF', x: 62, y: 17 }
    ],
    '4-4-2': [
      { pos: 'GK', x: 50, y: 91 },
      { pos: 'LB', x: 12, y: 73 },
      { pos: 'CB', x: 37, y: 76 },
      { pos: 'CB', x: 63, y: 76 },
      { pos: 'RB', x: 88, y: 73 },
      { pos: 'LMF', x: 14, y: 48 },
      { pos: 'CMF', x: 38, y: 54 },
      { pos: 'CMF', x: 62, y: 54 },
      { pos: 'RMF', x: 86, y: 48 },
      { pos: 'CF', x: 38, y: 17 },
      { pos: 'CF', x: 62, y: 17 }
    ]
  };

  let layout = coordsMap[cleanForm];
  if (!layout) {
    const digits = cleanForm.match(/\d+/g);
    if (digits && digits.length >= 2) {
      layout = [{ pos: 'GK', x: 50, y: 90 }];
      const defs = parseInt(digits[0], 10) || 4;
      const mids = parseInt(digits[1], 10) || 3;
      const atts = parseInt(digits.slice(2).join(''), 10) || (digits.length > 2 ? 3 : 2);

      for (let i = 0; i < defs; i++) {
        const xStep = 80 / (defs + 1);
        layout.push({
          pos: defs >= 5 ? (i === 0 ? 'LWB' : i === defs - 1 ? 'RWB' : 'CB') : (i === 0 ? 'LB' : i === defs - 1 ? 'RB' : 'CB'),
          x: Math.round(10 + (i + 1) * xStep),
          y: 76
        });
      }
      for (let i = 0; i < mids; i++) {
        const xStep = 80 / (mids + 1);
        layout.push({
          pos: i === 0 ? 'DMF' : 'CMF',
          x: Math.round(10 + (i + 1) * xStep),
          y: 55
        });
      }
      for (let i = 0; i < atts; i++) {
        const xStep = 80 / (atts + 1);
        layout.push({
          pos: atts === 1 ? 'CF' : i === 0 ? 'LWF' : i === atts - 1 ? 'RWF' : 'AMF',
          x: Math.round(10 + (i + 1) * xStep),
          y: 22
        });
      }
    } else {
      layout = coordsMap['4-2-1-3'];
    }
  }

  const result: (PlayerData & { pitchX: number; pitchY: number; selectionReason: string })[] = [];
  const unassigned = [...players];

  for (let i = 0; i < layout.length; i++) {
    const slot = layout[i];
    let matchIdx = unassigned.findIndex(p => (p.position || '').toUpperCase() === slot.pos);
    if (matchIdx === -1 && slot.pos.includes('MF')) {
      matchIdx = unassigned.findIndex(p => (p.position || '').toUpperCase().includes('MF'));
    }
    if (matchIdx === -1 && slot.pos.includes('B')) {
      matchIdx = unassigned.findIndex(p => (p.position || '').toUpperCase().includes('B'));
    }
    if (matchIdx === -1 && (slot.pos.includes('F') || slot.pos.includes('SS') || slot.pos.includes('WF'))) {
      matchIdx = unassigned.findIndex(p => {
        const up = (p.position || '').toUpperCase();
        return up.includes('F') || up.includes('SS') || up.includes('WF');
      });
    }
    if (matchIdx === -1) {
      matchIdx = 0;
    }

    const p = unassigned.splice(matchIdx >= 0 ? matchIdx : 0, 1)[0] || {
      id: `slot_${i}`,
      name: `Player ${i + 1}`,
      position: slot.pos,
      rating: 85,
      confidence: 'Medium' as const
    };

    result.push({
      ...p,
      pitchX: slot.x,
      pitchY: slot.y,
      selectionReason: `Optimal tactical fit for ${slot.pos} position`
    });
  }

  return result;
}

/**
 * Generates an optimized Starting XI and bench recommendations derived from
 * the head-to-head tactical comparisons, making it universally available to
 * any active or past user analysis.
 */
export function generateComparisonStartingXI(
  allPlayers: PlayerData[],
  battles: ComparisonBattle[],
  formation = '4-2-1-3',
  tacticalPlaystyle = 'Quick Counter',
  originalBestXI?: (PlayerData & { pitchX: number; pitchY: number; selectionReason?: string })[]
): ComparisonStartingXIResult {
  // 1. Establish baseline starters
  let baselineStarters: (PlayerData & { pitchX: number; pitchY: number; selectionReason: string })[] = [];

  if (originalBestXI && originalBestXI.length >= 11) {
    baselineStarters = originalBestXI.slice(0, 11).map(p => ({
      ...p,
      selectionReason: p.selectionReason || `Tactical starter for ${p.position}`
    }));
  } else {
    // Derive initial 11 from allPlayers
    const startersPool = allPlayers.filter(p => isPlayerStarter(p, allPlayers));
    const fallbackPool = startersPool.length >= 11 ? startersPool : allPlayers.slice(0, 11);
    baselineStarters = generatePitchCoordinatesForFormation(formation, fallbackPool);
  }

  // 2. Resolve head-to-head battles and check for promotions/confirmations
  const finalStarters: ComparisonStartingPlayer[] = [];
  const changesSummary: ComparisonChangeItem[] = [];
  const assignedPlayerIds = new Set<string>();

  let promotionsCount = 0;
  let confirmedCount = 0;

  baselineStarters.forEach((starter) => {
    const starterId = starter.id || starter.name;
    const starterPos = (starter.position || '').toUpperCase();

    // Find any battle where this starter was directly challenged by a substitute in their position
    const relevantBattles = battles.filter(b => 
      (b.category === 'starter_vs_sub' || b.category === 'same_position') &&
      ((b.playerA.id === starter.id || b.playerA.name === starter.name) ||
       (b.playerB.id === starter.id || b.playerB.name === starter.name))
    );

    let chosenPlayer: PlayerData = starter;
    let isPromoted = false;
    let rival: PlayerData | undefined = undefined;
    let verdictText = '';

    for (const b of relevantBattles) {
      const winner = b.recommendedStarter;
      const loser = b.substitutePlayer;

      const isStarterWinner = (winner.id && winner.id === starter.id) || winner.name === starter.name;

      if (!isStarterWinner) {
        // Substitute beat the starter!
        chosenPlayer = winner;
        isPromoted = true;
        rival = starter;
        verdictText = b.verdictReason;
        break;
      } else {
        // Starter won this duel
        rival = loser;
        verdictText = b.verdictReason;
      }
    }

    // Guard against duplicates
    const chosenId = chosenPlayer.id || chosenPlayer.name;
    if (assignedPlayerIds.has(chosenId)) {
      // If already assigned elsewhere, retain original starter
      chosenPlayer = starter;
      isPromoted = false;
    }
    assignedPlayerIds.add(chosenPlayer.id || chosenPlayer.name);

    if (isPromoted && rival) {
      promotionsCount++;
      changesSummary.push({
        position: starterPos,
        starterName: chosenPlayer.name,
        starterRating: Number(chosenPlayer.rating) || 85,
        rivalName: rival.name,
        rivalRating: Number(rival.rating) || 85,
        type: 'promoted',
        reason: verdictText || `Promoted over ${rival.name} based on higher tactical synergy and rating.`
      });

      finalStarters.push({
        ...chosenPlayer,
        position: starter.position || chosenPlayer.position,
        pitchX: starter.pitchX,
        pitchY: starter.pitchY,
        isPromotedFromBattle: true,
        h2hRivalName: rival.name,
        h2hRivalRating: Number(rival.rating) || 85,
        battleVerdict: verdictText,
        selectionReason: `★ Promoted to Starting XI: Won head-to-head positional battle against ${rival.name} (${chosenPlayer.rating} OVR vs ${rival.rating} OVR). ${verdictText}`
      });
    } else if (rival) {
      confirmedCount++;
      changesSummary.push({
        position: starterPos,
        starterName: chosenPlayer.name,
        starterRating: Number(chosenPlayer.rating) || 85,
        rivalName: rival.name,
        rivalRating: Number(rival.rating) || 85,
        type: 'confirmed',
        reason: verdictText || `Confirmed starter after winning comparison contest against ${rival.name}.`
      });

      finalStarters.push({
        ...chosenPlayer,
        pitchX: starter.pitchX,
        pitchY: starter.pitchY,
        isPromotedFromBattle: false,
        h2hRivalName: rival.name,
        h2hRivalRating: Number(rival.rating) || 85,
        battleVerdict: verdictText,
        selectionReason: `★ Confirmed Starting XI Anchor: Prevailed in head-to-head comparison against ${rival.name}. ${verdictText}`
      });
    } else {
      changesSummary.push({
        position: starterPos,
        starterName: chosenPlayer.name,
        starterRating: Number(chosenPlayer.rating) || 85,
        type: 'uncontested',
        reason: `First-choice tactical anchor for ${starterPos} in ${tacticalPlaystyle}.`
      });

      finalStarters.push({
        ...chosenPlayer,
        pitchX: starter.pitchX,
        pitchY: starter.pitchY,
        isPromotedFromBattle: false,
        selectionReason: `★ Tactical Anchor: Uncontested starter for ${starterPos} under ${tacticalPlaystyle} guidelines.`
      });
    }
  });

  // 3. Bench Players (All remaining squad players not in finalStarters)
  const benchPlayers: ComparisonBenchPlayer[] = [];
  const startersIds = new Set(finalStarters.map(p => p.id || p.name));

  allPlayers.forEach((p) => {
    const id = p.id || p.name;
    if (!startersIds.has(id)) {
      // Find if player was in any battle
      const battle = battles.find(b => 
        (b.playerA.id === p.id || b.playerA.name === p.name) ||
        (b.playerB.id === p.id || b.playerB.name === p.name)
      );

      let secRole = battle?.secondaryRole || 'Rotational Depth';
      let impactMin = '65\' - 70\'';

      const pos = (p.position || '').toUpperCase();
      if (['CF', 'SS', 'LWF', 'RWF'].includes(pos)) {
        secRole = battle?.secondaryRole || 'Second-Half Game Changer (65\')';
        impactMin = '60\' - 65\'';
      } else if (['DMF', 'CMF', 'AMF'].includes(pos)) {
        secRole = battle?.secondaryRole || 'Midfield Stamina & Energy Injection';
        impactMin = '65\' - 75\'';
      } else if (['LB', 'RB', 'LWB', 'RWB'].includes(pos)) {
        secRole = battle?.secondaryRole || 'Flank Defensive Cover & Rotation';
        impactMin = '70\' - 80\'';
      } else if (['CB'].includes(pos)) {
        secRole = battle?.secondaryRole || 'Defensive Pairing Partner & Condition Cover';
        impactMin = 'Emergency / Condition';
      } else if (['GK'].includes(pos)) {
        secRole = 'Goalkeeping Backup & Form Cover';
        impactMin = 'Condition A/B Cover';
      }

      benchPlayers.push({
        ...p,
        secondaryRole: secRole,
        impactMinute: impactMin,
        rotationNote: `Rotate when condition arrow is superior (A/B Form) or introduce at ${impactMin} to inject fresh stamina.`
      });
    }
  });

  // 4. Calculate squad ratings for this Starting XI
  const ratingsList = finalStarters.map(p => Number(p.rating) || 85);
  const avgOvr = Math.round(ratingsList.reduce((a, b) => a + b, 0) / (ratingsList.length || 1));

  const attackPlayers = finalStarters.filter(p => ['CF', 'SS', 'LWF', 'RWF', 'AMF'].includes((p.position || '').toUpperCase()));
  const midPlayers = finalStarters.filter(p => ['CMF', 'DMF', 'AMF', 'LMF', 'RMF'].includes((p.position || '').toUpperCase()));
  const defPlayers = finalStarters.filter(p => ['CB', 'LB', 'RB', 'LWB', 'RWB'].includes((p.position || '').toUpperCase()));
  const gkPlayer = finalStarters.find(p => (p.position || '').toUpperCase() === 'GK');

  const attackScore = attackPlayers.length > 0 
    ? Math.round(attackPlayers.reduce((acc, p) => acc + (Number(p.rating) || 85), 0) / attackPlayers.length) 
    : avgOvr;
  const midScore = midPlayers.length > 0 
    ? Math.round(midPlayers.reduce((acc, p) => acc + (Number(p.rating) || 85), 0) / midPlayers.length) 
    : avgOvr;
  const defScore = defPlayers.length > 0 
    ? Math.round(defPlayers.reduce((acc, p) => acc + (Number(p.rating) || 85), 0) / defPlayers.length) 
    : avgOvr;
  const gkScore = gkPlayer ? Number(gkPlayer.rating) || 85 : avgOvr;

  const squadRatings: SquadRatingsBreakdown = {
    overall: avgOvr,
    attack: attackScore,
    midfield: midScore,
    defence: defScore,
    goalkeeping: gkScore,
    balance: Math.min(99, Math.round((attackScore + midScore + defScore) / 3)),
    depth: Math.min(99, 85 + Math.min(14, benchPlayers.length)),
    tacticalSuitability: Math.min(99, Math.round(avgOvr * 0.95)),
    ratingsRationale: `Ratings calculated from the comparison-optimized Starting XI for ${formation} in ${tacticalPlaystyle}.`
  };

  // 5. Individual Player Instructions for this lineup
  const cf = finalStarters.find(p => ['CF', 'SS'].includes((p.position || '').toUpperCase())) || finalStarters[finalStarters.length - 1];
  const dmf = finalStarters.find(p => (p.position || '').toUpperCase() === 'DMF') || 
              finalStarters.find(p => (p.position || '').toUpperCase() === 'CMF') || 
              finalStarters[5];
  const amfOrWinger = finalStarters.find(p => ['AMF', 'LWF', 'RWF'].includes((p.position || '').toUpperCase()) && p.name !== cf?.name) || finalStarters[7];
  const fullbackOrCb = finalStarters.find(p => ['LB', 'RB', 'CB'].includes((p.position || '').toUpperCase())) || finalStarters[1];

  const individualInstructions: IndividualInstruction[] = [
    {
      slot: 'Attack 1',
      category: 'Attack 1',
      player: cf ? cf.name : 'Central Forward',
      position: cf ? cf.position : 'CF',
      instruction: 'Counter Target',
      why: `Keeps ${cf ? cf.name : 'your striker'} hovering high in the opponent third without tracking back, preserving vital stamina to capitalize on rapid ${tacticalPlaystyle} breakaways.`
    },
    {
      slot: 'Attack 2',
      category: 'Attack 2',
      player: dmf ? dmf.name : 'Defensive Midfielder',
      position: dmf ? dmf.position : 'DMF',
      instruction: 'Defensive',
      why: `Restricts ${dmf ? dmf.name : 'the holding midfielder'} from making risky forward penetrations, cementing a rock-solid protective shield directly in front of the center-backs.`
    },
    {
      slot: 'Defence 1',
      category: 'Defence 1',
      player: amfOrWinger ? amfOrWinger.name : 'Attacking Midfielder',
      position: amfOrWinger ? amfOrWinger.position : 'AMF',
      instruction: 'Anchoring',
      why: `Prevents ${amfOrWinger ? amfOrWinger.name : 'the playmaker'} from drifting excessively wide, locking central attacking presence to link defense-to-attack transitions.`
    },
    {
      slot: 'Defence 2',
      category: 'Defence 2',
      player: fullbackOrCb ? fullbackOrCb.name : 'Defensive Anchor',
      position: fullbackOrCb ? fullbackOrCb.position : 'CB',
      instruction: 'Tight Marking (Based on Opponent Player)',
      why: `Closes down dangerous opponent wingers or attacking midfielders immediately when they receive possession, suppressing quick central cutbacks.`
    }
  ];

  // 6. Tactical in-match adjustments
  const inMatchAdjustments = {
    counteringWideOverloads: `Tight mark opponent wingers with ${finalStarters.find(p => ['LB', 'RB'].includes(p.position))?.name || 'fullbacks'} and trigger double-press when the ball enters the wide channels.`,
    counteringCentralThroughBalls: `Maintain compact central spacing between center-backs and ${dmf ? dmf.name : 'DMF'} to choke passing lanes through the middle.`,
    leadingLate: `Switch mentality to 1-bar Defensive at 75'. Introduce defensive subs from the bench to protect the lead.`,
    trailingLate: `Engage High Pressing and bring on designated super-sub forwards around the 65th minute to capitalize on tired legs.`
  };

  return {
    formation,
    tacticalPlaystyle,
    startingXI: finalStarters,
    benchPlayers,
    averageRating: avgOvr,
    promotionsCount,
    confirmedCount,
    changesSummary,
    squadRatings,
    individualInstructions,
    inMatchAdjustments
  };
}

/**
 * Updates an AnalysisResult to adopt the comparison-recommended starting XI
 */
export function applyComparisonStartingXIToAnalysis(
  originalAnalysis: AnalysisResult,
  comparisonResult: ComparisonStartingXIResult
): AnalysisResult {
  return {
    ...originalAnalysis,
    title: originalAnalysis.title.includes('Comparison-Optimized')
      ? originalAnalysis.title
      : `${originalAnalysis.title} (Comparison-Optimized)`,
    recommendedFormation: comparisonResult.formation || originalAnalysis.recommendedFormation,
    bestXI: {
      formation: comparisonResult.formation || originalAnalysis.bestXI?.formation || originalAnalysis.recommendedFormation,
      players: comparisonResult.startingXI.map(p => ({
        ...p,
        pitchX: p.pitchX,
        pitchY: p.pitchY,
        selectionReason: p.selectionReason
      }))
    },
    squadRatings: {
      ...originalAnalysis.squadRatings,
      ...comparisonResult.squadRatings
    },
    individualInstructions: comparisonResult.individualInstructions || originalAnalysis.individualInstructions,
    gamePlanRecommendations: {
      matchDayPreparation: originalAnalysis.gamePlanRecommendations?.matchDayPreparation || {
        conditionArrowPriorities: 'Prioritize A and B condition starters.',
        captaincyAndSetPieceTakers: 'Assign highest place-kicking and leadership stats.'
      },
      substitutionStrategy: {
        earlySecondHalfSub: comparisonResult.benchPlayers[0] 
          ? `Introduce ${comparisonResult.benchPlayers[0].name} (${comparisonResult.benchPlayers[0].position}) at 60'-65' for immediate tactical impact.` 
          : 'Introduce fresh forward at 65th minute.',
        closingStageSub: comparisonResult.benchPlayers[1]
          ? `Bring on ${comparisonResult.benchPlayers[1].name} at 75'-80' to consolidate stamina.`
          : 'Reinforce midfield with defensive sub at 80th minute.',
        staminaTriggers: [
          'Substitute fullbacks when stamina bar drops below 30%',
          'Rotate high-workrate central midfielders around 70th minute'
        ],
        superSubRecommendations: comparisonResult.benchPlayers.slice(0, 3).map(p => `${p.name} (${p.position}) - ${p.secondaryRole}`)
      },
      inMatchAdjustments: comparisonResult.inMatchAdjustments
    }
  };
}
