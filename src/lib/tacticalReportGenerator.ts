import { 
  PlayerData, 
  PlayerTrainingReport, 
  TacticalPreferencesReport, 
  GamePlanRecommendations,
  KeyPlayerTrainingAdvice
} from '../types.ts';

/**
 * Generates comprehensive, game-accurate eFootball Player Training recommendations
 */
export function generatePlayerTrainingReport(
  players: PlayerData[],
  playstyle: string = 'Quick Counter'
): PlayerTrainingReport {
  const topPlayers = [...players]
    .filter(p => !(p as any).isUnidentified && !p.name.includes('Unidentified'))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 4);

  const fallbackNames = [
    { name: 'Primary Striker', pos: 'CF', rating: 98 },
    { name: 'Defensive Anchor', pos: 'DMF', rating: 96 },
    { name: 'Creative Playmaker', pos: 'AMF', rating: 97 },
    { name: 'Commanding CB', pos: 'CB', rating: 95 }
  ];

  const progressionAllocationAdvice: KeyPlayerTrainingAdvice[] = (topPlayers.length > 0 ? topPlayers : fallbackNames.map((f, i) => ({
    id: `fb_${i}`,
    name: f.name,
    position: f.pos,
    rating: f.rating,
    confidence: 'High' as const
  }))).map((player) => {
    const pos = (player.position || 'CF').toUpperCase();
    
    if (pos === 'CF' || pos === 'SS' || pos === 'LWF' || pos === 'RWF') {
      return {
        playerName: player.name,
        position: player.position,
        rating: player.rating,
        recommendedProgression: [
          { attributeGroup: 'Shooting (Finishing & Kicking Power)', points: 8, targetImpact: 'Reaches 90+ Finishing for consistent first-time shots inside the box.' },
          { attributeGroup: 'Dribbling (Tight Possession & Balance)', points: 6, targetImpact: 'Increases agility in tight penalty box scrambles.' },
          { attributeGroup: 'Dexterity (Offensive Awareness & Acceleration)', points: 10, targetImpact: 'Optimizes off-the-shoulder runs and initial 5-yard burst.' },
          { attributeGroup: 'Lower Body Strength (Speed & Stamina)', points: 8, targetImpact: 'Maintains top sprint speed on breakaways into minute 75+.' }
        ],
        recommendedSkills: ['First-time Shot', 'One-touch Pass', 'Sole Control', 'Acrobatic Finishing', 'Outside Curler'],
        specialTrainingFocus: `Fine-tune acceleration and finishing so ${player.name} can exploit half-space through-balls under ${playstyle}.`
      };
    } else if (pos === 'DMF' || pos === 'CMF') {
      return {
        playerName: player.name,
        position: player.position,
        rating: player.rating,
        recommendedProgression: [
          { attributeGroup: 'Passing (Low Pass & Lofted Pass)', points: 8, targetImpact: 'Guarantees laser-sharp transition passes that bypass high opponent presses.' },
          { attributeGroup: 'Defending (Tackling, Defensive Engagement)', points: 8, targetImpact: 'Boosts ball recovery rate when intercepting central cutbacks.' },
          { attributeGroup: 'Physical Contact & Stamina', points: 8, targetImpact: 'Wins shoulder-to-shoulder duels in the midfield second-ball scrap.' },
          { attributeGroup: 'Dexterity & Speed', points: 4, targetImpact: 'Maintains positional balance to close down counter-attacks promptly.' }
        ],
        recommendedSkills: ['One-touch Pass', 'Interception', 'Through Passing', 'Weighted Pass', 'Blocker'],
        specialTrainingFocus: `Prioritize defensive engagement and low passing accuracy to anchor the spine during high-tempo ${playstyle} transitions.`
      };
    } else if (pos === 'AMF') {
      return {
        playerName: player.name,
        position: player.position,
        rating: player.rating,
        recommendedProgression: [
          { attributeGroup: 'Passing (Low Pass & Curl)', points: 9, targetImpact: 'Pins through-balls through compact defensive 5-back lines.' },
          { attributeGroup: 'Dribbling & Tight Possession', points: 8, targetImpact: 'Smooth turns on the edge of the D to draw fouls or shoot.' },
          { attributeGroup: 'Dexterity & Offensive Awareness', points: 7, targetImpact: 'Finds pockets of space between opponent midfield and backlines.' },
          { attributeGroup: 'Shooting & Kicking Power', points: 6, targetImpact: 'Unlocks dangerous long-range finesse shots and dipping efforts.' }
        ],
        recommendedSkills: ['One-touch Pass', 'Through Passing', 'Double Touch', 'Long-Range Curler', 'Gamesmanship'],
        specialTrainingFocus: `Maximizes pass curl and tight possession so ${player.name} can serve as the primary offensive orchestrator.`
      };
    } else if (pos === 'CB' || pos === 'LB' || pos === 'RB') {
      return {
        playerName: player.name,
        position: player.position,
        rating: player.rating,
        recommendedProgression: [
          { attributeGroup: 'Defending (Defensive Awareness, Tackling, Aggression)', points: 12, targetImpact: 'Hits 92+ Defensive Awareness for automatic anticipation.' },
          { attributeGroup: 'Strength & Jumping', points: 8, targetImpact: 'Prevents opponent strikers from winning headers on corner kicks.' },
          { attributeGroup: 'Speed & Acceleration', points: 8, targetImpact: 'Crucial recovery pace against opponent Blitz Curler and speedy wingers.' },
          { attributeGroup: 'Pass (Low Pass)', points: 2, targetImpact: 'Prevents errant clearances from turning into defensive turnovers.' }
        ],
        recommendedSkills: ['Interception', 'Blocker', 'Aerial Superiority', 'Man Marking', 'Acrobatic Clearance'],
        specialTrainingFocus: `Invest progression points into speed and defensive engagement to withstand aggressive counter-presses.`
      };
    } else {
      // GK
      return {
        playerName: player.name,
        position: player.position,
        rating: player.rating,
        recommendedProgression: [
          { attributeGroup: 'GK 1 (GK Awareness & Jumping)', points: 10, targetImpact: 'Immediate reaction times to point-blank rebound shots.' },
          { attributeGroup: 'GK 2 (GK Clearing & GK Reach)', points: 10, targetImpact: 'Tips curving long shots around the woodwork.' },
          { attributeGroup: 'GK 3 (GK Catching & GK Reflexes)', points: 8, targetImpact: 'Zero fumbled parries into danger areas.' }
        ],
        recommendedSkills: ['GK Low Punt', 'GK High Punt', 'Penalty Saver'],
        specialTrainingFocus: 'Maximizes reach and reflexes to shut down finesse and dipping shots from outside the box.'
      };
    }
  });

  return {
    summary: `Structured progression point distribution designed to maximize breakpoint stat tiers (85, 90, and 95) across key tactical roles for ${playstyle}.`,
    progressionAllocationAdvice,
    positionSpecificTips: [
      {
        role: 'Goalkeeper (GK)',
        keyStatsToPrioritize: ['GK Reach', 'GK Reflexes', 'GK Awareness'],
        guidance: 'Allocate points to GK Reach and Reflexes until both reach at least 88+. In eFootball 2026/2027, Reach determines shot coverage on long curled efforts.'
      },
      {
        role: 'Centre Backs (CB)',
        keyStatsToPrioritize: ['Defensive Awareness', 'Tackling', 'Speed', 'Physical Contact'],
        guidance: 'Never neglect Speed. A CB with 95 Defending but sub-70 Speed will be destroyed by through-balls. Aim for at least 76+ Speed and 90+ Defensive Engagement.'
      },
      {
        role: 'Fullbacks (LB / RB)',
        keyStatsToPrioritize: ['Speed', 'Stamina', 'Low Pass', 'Interception'],
        guidance: 'If playing Offensive Fullbacks, give them 8+ points in Lower Body Strength so stamina survives till the 80th minute. Defensive Fullbacks should invest in Defending + Speed.'
      },
      {
        role: 'Defensive Midfield (DMF / CMF)',
        keyStatsToPrioritize: ['Defensive Engagement', 'Low Pass', 'Physical Contact', 'Stamina'],
        guidance: 'Anchor Men require high Tackling and Physical Contact. Orchestrators need 88+ Low Pass with One-touch Pass and Through Passing skills.'
      },
      {
        role: 'Attacking Midfield & Wingers (AMF / LWF / RWF)',
        keyStatsToPrioritize: ['Dribbling', 'Tight Possession', 'Acceleration', 'Curl'],
        guidance: 'Cap Acceleration to at least 88. Tight Possession enables smooth 180-degree pivots before opponent defenders can initiate match-up contact.'
      },
      {
        role: 'Centre Forwards (CF / SS)',
        keyStatsToPrioritize: ['Offensive Awareness', 'Finishing', 'Acceleration', 'Kicking Power'],
        guidance: 'Offensive Awareness 90+ ensures instinctive runs off the shoulder of the last defender. Pair with First-time Shot to minimize touch latency.'
      }
    ]
  };
}

/**
 * Generates Tactical Preferences report based on Playstyle and Formation
 */
export function generateTacticalPreferences(
  playstyle: string = 'Quick Counter',
  formation: string = '4-2-1-3'
): TacticalPreferencesReport {
  const normPlaystyle = playstyle.trim();

  if (normPlaystyle.toLowerCase().includes('possession')) {
    return {
      chosenPlaystyle: 'Possession Game',
      playstyleOverview: 'Patience, high positioning density, short triangular passing, and total territorial dominance. Forces the opponent into an exhausting low block.',
      attackingSetup: {
        title: 'Triangular Overloads & Controlled Incursions',
        buildUpStyle: 'Short Passing through the central pivot. CBs split wide to receive short balls from the keeper.',
        attackingArea: 'Center & Half-spaces. Wingers hold wide touchlines to stretch opponent fullbacks, opening pockets for the AMF.',
        positioningFocus: 'Support runs come toward the ball handler. Players rarely make blind forward runs; they offer close triangular options.',
        details: [
          'Maintain 2-3 passing outlets around every ball carrier at all times.',
          'Use Pass-and-Run sparingly to preserve midfield shape and prevent counter-attack vulnerability.',
          'Switch play to the weak-side fullback once opponent shifts horizontally.'
        ]
      },
      defensiveSetup: {
        title: 'Frontline Press with High Defensive Line',
        defensiveStyle: 'Aggressive immediate recovery in the opponent half to suffocate clearances.',
        containmentArea: 'Center. Direct opponent into tight central traps where two midfielders can double-team.',
        pressuringGuidelines: [
          'Trigger pressure the moment an opponent plays a backwards pass.',
          'Hold offside trap line around the midfield stripe; manually track runners with your DMF.'
        ],
        defensiveLineLevel: 'High (Level 8/10). Maintain compact intervals between midfield and defensive line.'
      },
      transitionSetup: {
        title: 'Immediate Gegenpress & Ball Retention',
        offensiveTransition: 'Secure the ball first. Do not force immediate 50-yard through-balls unless the CF has a 5-yard head start.',
        defensiveTransition: '3-second immediate counter-press. If the ball is not won within 3 seconds, drop the defensive line by 10 yards.',
        counterPressRules: [
          'Closest 2 players instantly close down the opponent receiver before they turn.',
          'DMF steps forward to intercept panicked clearance balls.'
        ]
      }
    };
  } else if (normPlaystyle.toLowerCase().includes('long ball counter')) {
    return {
      chosenPlaystyle: 'Long Ball Counter',
      playstyleOverview: 'Deep, unbreakable defensive block followed by lightning-fast, high-verticality direct releases into attacking forwards.',
      attackingSetup: {
        title: 'Vertical Exploitation & Direct Channel Runs',
        buildUpStyle: 'Direct and vertical. Upon ball recovery, forwards sprint forward in behind the opponent backline without delay.',
        attackingArea: 'Deep Channels & Central Pockets. CF pins centre-backs while wingers cut into the half-spaces.',
        positioningFocus: 'Forwards make automatic forward runs rather than dropping deep. Midfielders look to execute direct passes with 1-2 touches.',
        details: [
          'Hit the CF directly on recovery to hold up the ball or flick on to rushing wingers.',
          'Fullbacks remain disciplined; offensive attacks do not rely on fullback overlaps.',
          'Low crossing and far-post heading are primary goal-scoring routes.'
        ]
      },
      defensiveSetup: {
        title: 'Low Block & Central Wall',
        defensiveStyle: 'Drop deep into own penalty area to eliminate space behind the defensive line.',
        containmentArea: 'Middle and Box perimeter. Force opponent into low-percentage crosses or rushed long shots.',
        pressuringGuidelines: [
          'Do not pull CBs out of position. Use the Match-up button and protect the penalty spot.',
          'Allow opponent harmless possession in wide areas; win headers with tall CBs.'
        ],
        defensiveLineLevel: 'Deep (Level 3/10). Eliminates vulnerability to opponent through-balls.'
      },
      transitionSetup: {
        title: 'Zero-Delay Breakaway Launch',
        offensiveTransition: 'First pass must be forward. Utilize Lofted Through Passes or driven low ground passes into the striker.',
        defensiveTransition: 'All midfielders instantly sprint back into defensive shape. Zero counter-pressing in advanced areas.',
        counterPressRules: [
          'Fall back behind the ball immediately upon turnover.',
          'Delay opponent ball carrier without committing to a slide tackle.'
        ]
      }
    };
  } else if (normPlaystyle.toLowerCase().includes('out wide')) {
    return {
      chosenPlaystyle: 'Out Wide',
      playstyleOverview: 'Systematic flank overloads, overlapping fullbacks, and aerial bombardment into the penalty area targeting physical strikers.',
      attackingSetup: {
        title: 'Flank Overloads & Pinpoint Crossing',
        buildUpStyle: 'Direct distribution to touchline wingers and advancing fullbacks.',
        attackingArea: 'Flanks (Left and Right Touchlines). Stretch opponent pitch width to maximum.',
        positioningFocus: 'Midfielders and far-side wingers crash the penalty box when a cross is delivered.',
        details: [
          'Pair with a physical Target Man or Fox in the Box striker with Heading and Aerial Superiority.',
          'Use early stunning crosses (R2/RT + O/B) from deep fullback positions.',
          'Second balls at the top of the box are cleaned up by your arriving CMF/AMF.'
        ]
      },
      defensiveSetup: {
        title: 'Mid-Block with Wide Containment',
        defensiveStyle: 'Structured mid-block preventing opponent switches of play.',
        containmentArea: 'Flanks. Channel opponent into touchlines and use sideline as an extra defender.',
        pressuringGuidelines: [
          'Fullbacks close down opponent crossers quickly to block deliveries.',
          'DMF drops into the backline to provide aerial reinforcement.'
        ],
        defensiveLineLevel: 'Balanced (Level 5/10).'
      },
      transitionSetup: {
        title: 'Diagonal Release to Free Wingers',
        offensiveTransition: 'Launch diagonal cross-field balls to the unmarked winger.',
        defensiveTransition: 'Ensure cover behind advancing fullbacks; DMF must slide over to defend the vacant wide channel.',
        counterPressRules: [
          'Nearest winger harasses fullback to prevent easy diagonal switches.',
          'Central pivot balances between the two CBs.'
        ]
      }
    };
  } else if (normPlaystyle.toLowerCase().includes('overload')) {
    return {
      chosenPlaystyle: 'Overload (eFootball 2027)',
      playstyleOverview: 'Dynamic tactical overload shifting 4+ players into a single quadrant of the pitch to manufacture numerical superiority before snapping a diagonal switch.',
      attackingSetup: {
        title: 'Asymmetric Quad Overload & Weak-Side Isolation',
        buildUpStyle: 'Heavy concentration of short passes on one side of the pitch to draw the opponent block.',
        attackingArea: 'Strong-side half space switching suddenly to isolated weak-side forward.',
        positioningFocus: 'Fullback, AMF, winger, and CF converge within a 20-yard radius to create 4v3 and 5v4 scenarios.',
        details: [
          'Execute quick one-touch wall passes in the crowded zone.',
          'Once opponent shifts their whole team, execute a Stunning Lofted Pass to the completely unmarked weak-side winger.',
          'High reward system with immense tactical surprise.'
        ]
      },
      defensiveSetup: {
        title: 'Zonal Compaction & Aggressive Match-Up',
        defensiveStyle: 'Active zonal recovery pressing.',
        containmentArea: 'Wide and central channels.',
        pressuringGuidelines: [
          'Maintain situational awareness to avoid being caught on quick counter switches.',
          'Use tactical fouls in the middle third if the overload is broken.'
        ],
        defensiveLineLevel: 'Medium-High (Level 7/10).'
      },
      transitionSetup: {
        title: 'Rapid Reset & Re-Balancing',
        offensiveTransition: 'Flood the predetermined overload zone with 3 supporting runners.',
        defensiveTransition: 'The far-side winger and fullback must instantly sprint inward to restore central balance.',
        counterPressRules: [
          'Immediate double-team in the overload zone where player density is highest.'
        ]
      }
    };
  } else {
    // Quick Counter (Default)
    return {
      chosenPlaystyle: 'Quick Counter',
      playstyleOverview: 'High-octane direct counter-attacking. Relentless forward momentum upon winning the ball with rapid forward sprints and aggressive frontline pressing.',
      attackingSetup: {
        title: 'High-Speed Vertical Penetration',
        buildUpStyle: 'Direct and explosive. Forwards instantly dart forward when possession is won in any third.',
        attackingArea: 'Center and Half-spaces. Overwhelming opponent CBs through vertical runner volume.',
        positioningFocus: 'High offensive line. Supporting midfielders surge into the box to support second-phase shots.',
        details: [
          'Release through-balls early; do not take more than 2-3 touches in the middle third.',
          'Trigger 1-2 pass combinations with the AMF to pull opponent centre-backs out of line.',
          'Capitalize on high turnovers within 5-8 seconds of ball recovery.'
        ]
      },
      defensiveSetup: {
        title: 'High Defensive Line with Aggressive Choke Points',
        defensiveStyle: 'Aggressive frontline pressing to force turnovers in the opponent half.',
        containmentArea: 'Center. Squeeze opponent ball carriers into narrow lanes where fast tackles can be applied.',
        pressuringGuidelines: [
          'Apply pressure with the nearest forward while manually cutting passing channels with your DMF.',
          'Be prepared to sprint back manually if the opponent bypasses your initial press.'
        ],
        defensiveLineLevel: 'Very High (Level 8.5/10). Offside trap must be active.'
      },
      transitionSetup: {
        title: 'Instantaneous Counter-Press & Surge',
        offensiveTransition: 'All 3 front players immediately break into maximum sprint forward.',
        defensiveTransition: 'Aggressive instant counter-press. Try to recover the ball within 5 seconds of losing it.',
        counterPressRules: [
          'Hunt the ball in packs of two immediately upon loss of possession.',
          'Anchor DMF must never press high; hold him 15 yards ahead of the CB pairing.'
        ]
      }
    };
  }
}

/**
 * Generates Game Plan Recommendations (Match-day preparation, subs, in-match adjustments)
 */
export function generateGamePlanRecommendations(
  playstyle: string = 'Quick Counter',
  formation: string = '4-2-1-3',
  players: PlayerData[] = []
): GamePlanRecommendations {
  const superSubCandidates = players
    .filter(p => p.skills?.includes('Super-sub') || p.rating >= 88)
    .slice(0, 3)
    .map(p => `${p.name} (${p.position})`)
    .join(', ') || 'Speedy Winger, Fresh CF with Super-sub skill, High-stamina Box-to-Box CMF';

  return {
    matchDayPreparation: {
      conditionArrowPriorities: 'Always check player form arrows before kick-off. A top form (Blue/Top) player receives a +10% boost to key physical and technical stats. A bottom form (Red/Down) player loses up to 12% across speed, stamina, and finishing. Replace red/orange arrow starters with yellow/green bench options regardless of baseline rating difference.',
      captaincyAndSetPieceTakers: 'Assign a Captain with the "Captaincy" skill to reduce team stamina consumption and maintain composure. Select your highest Curl & Place Kicking specialist for long and short free kicks, and your tallest CB with "Aerial Superiority" as Target 1 on offensive corner kicks.',
      fluidFormationNotes: `When using ${formation}, consider activating Fluid Formations: shift into a compact 5-3-2 or 4-5-1 out of possession to congest central spaces, then expand back into ${formation} when in possession.`
    },
    substitutionStrategy: {
      earlySecondHalfSub: '60th - 65th Minute: Replace your highest-stamina drain positions (usually the central AMF or high-pressing wingers). If their stamina bar drops into the red zone, their sprint recovery drops by 35%, inviting counter-attacks.',
      closingStageSub: '75th - 80th Minute: Introduce your primary Super-sub forward. In eFootball, the Super-sub skill triggers a massive stat multiplier when subbed in during the 2nd half, dramatically improving finishing and burst speed.',
      staminaTriggers: [
        'Stamina bar < 25%: Immediate substitution required to prevent pulled muscles and defensive gaps.',
        'Winger unable to track back: Sub on a fresh wide player with high work rate.',
        'Midfielder booked with yellow card: Replace to avoid high-pressure second yellow dismissal.'
      ],
      superSubRecommendations: [
        `Recommended bench game-changers: ${superSubCandidates}`,
        'Keep 1 defensive specialist (Anchor Man or Defensive Fullback) on the bench to protect leads in the final 10 minutes.'
      ]
    },
    inMatchAdjustments: {
      leadingLate: 'When leading by 1 goal in the 80th+ minute: Lower attacking mentality by 1 notch (Blue -1). Apply "Deep Line" on your DMF and set "Defensive" instruction on both fullbacks to prevent late counter-attacks.',
      trailingLate: 'When trailing after the 70th minute: Raise attacking mentality by 1 notch (Red +1). Apply "Attacking Fullbacks" or switch to an aggressive 4-2-4 shape with an extra forward pinning the opponent centre-backs.',
      counteringWideOverloads: 'If opponent spams crosses from wide wingers: Apply "Tight Marking" or "Man Marking" on their primary crosser, and instruct your fullback to stay "Defensive".',
      counteringCentralThroughBalls: 'If opponent plays quick 1-2 central passes: Set your DMF to "Deep Line" to create a 3-CB barrier, and switch cursor control manually using the right stick to intercept through-ball channels.'
    }
  };
}
