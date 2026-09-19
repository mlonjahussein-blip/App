import { PlayerData, AnalysisResult, SquadRatingsBreakdown, IndividualInstruction } from '../types.ts';
import { solveOptimalLineupPlacement } from './tacticalPlacement.ts';

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
  return solveOptimalLineupPlacement(formation, players);
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
  // 1. Establish baseline starters using optimal placement solver
  let baselineCandidates: PlayerData[] = [];
  if (originalBestXI && originalBestXI.length >= 11) {
    baselineCandidates = originalBestXI.slice(0, 11);
  } else {
    const startersPool = allPlayers.filter(p => isPlayerStarter(p, allPlayers));
    baselineCandidates = startersPool.length >= 11 ? startersPool : allPlayers.slice(0, 11);
  }

  const baselineStarters = solveOptimalLineupPlacement(formation, baselineCandidates);

  // 2. Resolve head-to-head battles (Strictly starter vs sub/alternative; no starter vs starter replacements)
  const chosenPlayersPool: PlayerData[] = [];
  const changesSummary: ComparisonChangeItem[] = [];
  const assignedKeys = new Set<string>();

  const getPlayerKey = (p: PlayerData): string => (p.id || p.name).toLowerCase().trim();

  let promotionsCount = 0;
  let confirmedCount = 0;

  const playerBattleMetadata = new Map<string, {
    isPromoted: boolean;
    rival?: PlayerData;
    verdictText: string;
  }>();

  baselineStarters.forEach((starter) => {
    const starterKey = getPlayerKey(starter);
    const starterPos = (starter.position || '').toUpperCase();

    // Only consider duels where a substitute/alternative is challenging a starter
    const relevantBattles = battles.filter(b => 
      (b.category === 'starter_vs_sub' || b.category === 'tactical_alternative') &&
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
        // Substitute beat the starter! Check if substitute isn't already in lineup
        const winnerKey = getPlayerKey(winner);
        if (!assignedKeys.has(winnerKey)) {
          chosenPlayer = winner;
          isPromoted = true;
          rival = starter;
          verdictText = b.verdictReason;
          break;
        }
      } else {
        rival = loser;
        verdictText = b.verdictReason;
      }
    }

    let chosenKey = getPlayerKey(chosenPlayer);
    if (assignedKeys.has(chosenKey)) {
      // Revert to starter if winner already assigned
      chosenPlayer = starter;
      chosenKey = starterKey;
      isPromoted = false;
    }

    // If starter is also already assigned (prevent duplicate players like Scholes in 2 positions)
    if (assignedKeys.has(chosenKey)) {
      const unassignedFallback = allPlayers.find(p => !assignedKeys.has(getPlayerKey(p)));
      if (unassignedFallback) {
        chosenPlayer = unassignedFallback;
        chosenKey = getPlayerKey(unassignedFallback);
        isPromoted = false;
        rival = undefined;
      }
    }

    assignedKeys.add(chosenKey);
    chosenPlayersPool.push(chosenPlayer);

    if (isPromoted && rival) {
      promotionsCount++;
      changesSummary.push({
        position: starterPos,
        starterName: chosenPlayer.name,
        starterRating: Number(chosenPlayer.rating) || 85,
        rivalName: rival.name,
        rivalRating: Number(rival.rating) || 85,
        type: 'promoted',
        reason: verdictText || `Promoted over ${rival.name} based on tactical synergy and rating.`
      });
      playerBattleMetadata.set(chosenKey, { isPromoted: true, rival, verdictText });
    } else if (rival) {
      confirmedCount++;
      changesSummary.push({
        position: starterPos,
        starterName: chosenPlayer.name,
        starterRating: Number(chosenPlayer.rating) || 85,
        rivalName: rival.name,
        rivalRating: Number(rival.rating) || 85,
        type: 'confirmed',
        reason: verdictText || `Confirmed starter after winning head-to-head comparison.`
      });
      playerBattleMetadata.set(chosenKey, { isPromoted: false, rival, verdictText });
    } else {
      changesSummary.push({
        position: starterPos,
        starterName: chosenPlayer.name,
        starterRating: Number(chosenPlayer.rating) || 85,
        type: 'uncontested',
        reason: `First-choice tactical anchor for ${starterPos} in ${tacticalPlaystyle}.`
      });
      playerBattleMetadata.set(chosenKey, { isPromoted: false, verdictText: '' });
    }
  });

  // 3. Re-run optimal layout solver on the final chosen 11 to ensure pristine positioning and roles
  const optimallyPlacedXI = solveOptimalLineupPlacement(formation, chosenPlayersPool);

  const finalStarters: ComparisonStartingPlayer[] = optimallyPlacedXI.map((placed) => {
    const meta = playerBattleMetadata.get(getPlayerKey(placed));
    if (meta?.isPromoted && meta.rival) {
      return {
        ...placed,
        isPromotedFromBattle: true,
        h2hRivalName: meta.rival.name,
        h2hRivalRating: Number(meta.rival.rating) || 85,
        battleVerdict: meta.verdictText,
        selectionReason: `★ Promoted to Starting XI: Won head-to-head positional battle against ${meta.rival.name} (${placed.rating} OVR vs ${meta.rival.rating} OVR). ${meta.verdictText}`
      };
    } else if (meta?.rival) {
      return {
        ...placed,
        isPromotedFromBattle: false,
        h2hRivalName: meta.rival.name,
        h2hRivalRating: Number(meta.rival.rating) || 85,
        battleVerdict: meta.verdictText,
        selectionReason: `★ Confirmed Starting XI Anchor: Prevailed in head-to-head comparison against ${meta.rival.name}. ${meta.verdictText}`
      };
    }
    return {
      ...placed,
      isPromotedFromBattle: false,
      selectionReason: placed.selectionReason || `★ Tactical Anchor: Uncontested starter for ${placed.position} under ${tacticalPlaystyle} guidelines.`
    };
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
