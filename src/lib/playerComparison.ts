import { PlayerData } from '../types.ts';

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
