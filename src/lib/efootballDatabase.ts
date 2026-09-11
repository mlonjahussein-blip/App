export interface EFootballMasterPlayer {
  id: string;
  fullName: string;
  commonName: string;
  aliases: string[]; // Variations seen in OCR like "K. MBAPPE", "MBAPPE", "K. MBAPPÉ"
  primaryPosition: 'CF' | 'SS' | 'LWF' | 'RWF' | 'AMF' | 'CMF' | 'DMF' | 'LB' | 'RB' | 'CB' | 'GK';
  secondaryPositions: string[];
  baseRating: number;
  maxRating: number;
  playstyle: string;
  club: string;
  nationality: string;
  cardType: 'Epic' | 'Big Time' | 'Show Time' | 'Highlight' | 'POTW' | 'Standard' | 'Legendary';
  keyAttributes: Record<string, number>;
  skills: string[];
}

export interface EFootballMasterCoach {
  id: string;
  name: string;
  aliasNames: string[];
  inGameName: string; // e.g. "L. Roman", "G. Zeitzler"
  tacticalStyle: string; // "Possession Game" | "Quick Counter" | "Long Ball Counter" | "Out Wide" | "Long Ball"
  affinityRating: number;
  tacticalDescription: string;
}

export const EFOOTBALL_MASTER_PLAYERS: EFootballMasterPlayer[] = [
  // ATTACKERS
  {
    id: 'mbappe_k',
    fullName: 'Kylian Mbappé',
    commonName: 'K. Mbappé',
    aliases: ['K. MBAPPE', 'MBAPPE', 'KYLIAN MBAPPE', 'K. MBAPPÉ', 'MBAPPÉ', 'K MBAPPE'],
    primaryPosition: 'CF',
    secondaryPositions: ['LWF', 'SS', 'RWF'],
    baseRating: 91,
    maxRating: 101,
    playstyle: 'Goal Poacher',
    club: 'Real Madrid',
    nationality: 'France',
    cardType: 'Show Time',
    keyAttributes: { Speed: 99, Acceleration: 98, Finishing: 95, Dribbling: 94, OffensiveAwareness: 96 },
    skills: ['Double Touch', 'First-time Shot', 'Long Range Shooting', 'Speeding Bullet', 'Acrobatic Finishing', 'Outside Curler']
  },
  {
    id: 'haaland_e',
    fullName: 'Erling Haaland',
    commonName: 'E. Haaland',
    aliases: ['E. HAALAND', 'HAALAND', 'ERLING HAALAND', 'E HAALAND'],
    primaryPosition: 'CF',
    secondaryPositions: ['SS'],
    baseRating: 90,
    maxRating: 100,
    playstyle: 'Goal Poacher',
    club: 'Manchester City',
    nationality: 'Norway',
    cardType: 'Highlight',
    keyAttributes: { Finishing: 98, PhysicalContact: 96, Speed: 94, OffensiveAwareness: 97, Heading: 90 },
    skills: ['Heading', 'First-time Shot', 'Acrobatic Finishing', 'Aerial Superiority', 'Fighting Spirit']
  },
  {
    id: 'messi_l',
    fullName: 'Lionel Messi',
    commonName: 'L. Messi',
    aliases: ['L. MESSI', 'MESSI', 'LIONEL MESSI', 'L MESSI'],
    primaryPosition: 'RWF',
    secondaryPositions: ['SS', 'AMF', 'CF'],
    baseRating: 92,
    maxRating: 104,
    playstyle: 'Deep-Lying Forward',
    club: 'Inter Miami',
    nationality: 'Argentina',
    cardType: 'Big Time',
    keyAttributes: { TightPossession: 99, Balance: 99, Finishing: 96, LowPass: 94, Curl: 97, Dribbling: 98 },
    skills: ['Double Touch', 'Through Passing', 'One-touch Pass', 'Long Range Curler', 'Outside Curler', 'Sole Control']
  },
  {
    id: 'ronaldo_c',
    fullName: 'Cristiano Ronaldo',
    commonName: 'C. Ronaldo',
    aliases: ['C. RONALDO', 'RONALDO', 'CRISTIANO RONALDO', 'C RONALDO', 'CR7'],
    primaryPosition: 'CF',
    secondaryPositions: ['LWF', 'SS'],
    baseRating: 88,
    maxRating: 99,
    playstyle: 'Goal Poacher',
    club: 'Al Nassr',
    nationality: 'Portugal',
    cardType: 'Highlight',
    keyAttributes: { Finishing: 96, Heading: 94, Jumping: 95, PhysicalContact: 90, KickingPower: 96 },
    skills: ['Knuckle Shot', 'Heading', 'Acrobatic Finishing', 'Aerial Superiority', 'First-time Shot', 'Penalty Specialist']
  },
  {
    id: 'vinicius_jr',
    fullName: 'Vinícius Júnior',
    commonName: 'Vinícius Jr.',
    aliases: ['VINICIUS JR', 'V. JUNIOR', 'VINICIUS JUNIOR', 'V. JÚNIOR', 'VINÍCIUS JR', 'VINI JR'],
    primaryPosition: 'LWF',
    secondaryPositions: ['CF', 'SS', 'LM'],
    baseRating: 89,
    maxRating: 99,
    playstyle: 'Roaming Flank',
    club: 'Real Madrid',
    nationality: 'Brazil',
    cardType: 'Show Time',
    keyAttributes: { Speed: 98, Acceleration: 98, Dribbling: 96, TightPossession: 94, Finishing: 89 },
    skills: ['Double Touch', 'Flip Flap', 'Sole Control', 'First-time Shot', 'Outside Curler']
  },
  {
    id: 'salah_m',
    fullName: 'Mohamed Salah',
    commonName: 'M. Salah',
    aliases: ['M. SALAH', 'SALAH', 'MOHAMED SALAH', 'M SALAH'],
    primaryPosition: 'RWF',
    secondaryPositions: ['CF', 'SS', 'RM'],
    baseRating: 90,
    maxRating: 99,
    playstyle: 'Prolific Winger',
    club: 'Liverpool',
    nationality: 'Egypt',
    cardType: 'Highlight',
    keyAttributes: { Speed: 95, Finishing: 94, OffensiveAwareness: 95, Acceleration: 95, Curl: 88 },
    skills: ['Long Range Curler', 'Cut Behind & Turn', 'First-time Shot', 'Outside Curler', 'Through Passing']
  },
  {
    id: 'kane_h',
    fullName: 'Harry Kane',
    commonName: 'H. Kane',
    aliases: ['H. KANE', 'KANE', 'HARRY KANE', 'H KANE'],
    primaryPosition: 'CF',
    secondaryPositions: ['SS', 'AMF'],
    baseRating: 90,
    maxRating: 98,
    playstyle: 'Deep-Lying Forward',
    club: 'Bayern München',
    nationality: 'England',
    cardType: 'Highlight',
    keyAttributes: { Finishing: 97, KickingPower: 95, LowPass: 90, Heading: 90, OffensiveAwareness: 96 },
    skills: ['One-touch Pass', 'Through Passing', 'First-time Shot', 'Long Range Shooting', 'Heading']
  },
  {
    id: 'rummenigge_k',
    fullName: 'Karl-Heinz Rummenigge',
    commonName: 'K. Rummenigge',
    aliases: ['K. RUMMENIGGE', 'RUMMENIGGE', 'KARL-HEINZ RUMMENIGGE'],
    primaryPosition: 'CF',
    secondaryPositions: ['SS', 'RWF'],
    baseRating: 93,
    maxRating: 103,
    playstyle: 'Goal Poacher',
    club: 'Epic Legends',
    nationality: 'Germany',
    cardType: 'Epic',
    keyAttributes: { Speed: 96, Acceleration: 95, Finishing: 97, OffensiveAwareness: 98, KickingPower: 94 },
    skills: ['Double Touch', 'First-time Shot', 'Long Range Shooting', 'Acrobatic Finishing', 'Outside Curler']
  },
  {
    id: 'cruyff_j',
    fullName: 'Johan Cruyff',
    commonName: 'J. Cruijff',
    aliases: ['J. CRUIJFF', 'CRUYFF', 'JOHAN CRUYFF', 'J. CRUYFF', 'CRUIJFF'],
    primaryPosition: 'SS',
    secondaryPositions: ['AMF', 'CF', 'LWF'],
    baseRating: 93,
    maxRating: 103,
    playstyle: 'Hole Player',
    club: 'Epic Legends',
    nationality: 'Netherlands',
    cardType: 'Epic',
    keyAttributes: { TightPossession: 97, Dribbling: 96, LowPass: 92, Finishing: 93, Acceleration: 94 },
    skills: ['Double Touch', 'One-touch Pass', 'Through Passing', 'Outside Curler', 'First-time Shot']
  },
  {
    id: 'shevchenko_a',
    fullName: 'Andriy Shevchenko',
    commonName: 'A. Shevchenko',
    aliases: ['A. SHEVCHENKO', 'SHEVCHENKO', 'ANDRIY SHEVCHENKO'],
    primaryPosition: 'CF',
    secondaryPositions: ['SS'],
    baseRating: 92,
    maxRating: 102,
    playstyle: 'Goal Poacher',
    club: 'Epic Legends',
    nationality: 'Ukraine',
    cardType: 'Epic',
    keyAttributes: { Speed: 95, Finishing: 96, OffensiveAwareness: 96, KickingPower: 94 },
    skills: ['First-time Shot', 'Long Range Shooting', 'Heading', 'Acrobatic Finishing']
  },
  {
    id: 'neymar_jr',
    fullName: 'Neymar Jr',
    commonName: 'Neymar Jr',
    aliases: ['NEYMAR JR', 'NEYMAR', 'NEYMAR JÚNIOR', 'NEYMAR JR.'],
    primaryPosition: 'LWF',
    secondaryPositions: ['AMF', 'SS', 'CF'],
    baseRating: 90,
    maxRating: 102,
    playstyle: 'Creative Playmaker',
    club: 'Al Hilal',
    nationality: 'Brazil',
    cardType: 'Epic',
    keyAttributes: { Dribbling: 99, TightPossession: 98, Acceleration: 95, Finishing: 92, Curl: 94 },
    skills: ['Double Touch', 'Flip Flap', 'Sole Control', 'Marseille Turn', 'Long Range Curler', 'Through Passing']
  },
  {
    id: 'yamal_l',
    fullName: 'Lamine Yamal',
    commonName: 'L. Yamal',
    aliases: ['L. YAMAL', 'LAMINE YAMAL', 'YAMAL'],
    primaryPosition: 'RWF',
    secondaryPositions: ['LWF', 'AMF'],
    baseRating: 88,
    maxRating: 99,
    playstyle: 'Roaming Flank',
    club: 'FC Barcelona',
    nationality: 'Spain',
    cardType: 'Show Time',
    keyAttributes: { Acceleration: 97, Dribbling: 96, Curl: 92, LowPass: 89, Balance: 95 },
    skills: ['Double Touch', 'Long Range Curler', 'Through Passing', 'Pinpoint Crossing']
  },
  {
    id: 'son_hm',
    fullName: 'Son Heung-Min',
    commonName: 'H. Son',
    aliases: ['H. SON', 'SON HEUNG-MIN', 'SON', 'HEUNG-MIN SON', 'H M SON'],
    primaryPosition: 'LWF',
    secondaryPositions: ['CF', 'SS', 'RWF'],
    baseRating: 89,
    maxRating: 98,
    playstyle: 'Roaming Flank',
    club: 'Tottenham Hotspur',
    nationality: 'Korea Republic',
    cardType: 'Highlight',
    keyAttributes: { Speed: 95, Finishing: 94, KickingPower: 94, LongRangeCurler: 93, Curl: 90 },
    skills: ['Long Range Curler', 'First-time Shot', 'Double Touch', 'Outside Curler', 'Knuckle Shot']
  },
  {
    id: 'leao_r',
    fullName: 'Rafael Leão',
    commonName: 'R. Leão',
    aliases: ['R. LEAO', 'RAFAEL LEAO', 'LEAO', 'R. LEÃO', 'RAFAEL LEÃO'],
    primaryPosition: 'LWF',
    secondaryPositions: ['CF', 'SS'],
    baseRating: 88,
    maxRating: 98,
    playstyle: 'Prolific Winger',
    club: 'AC Milan',
    nationality: 'Portugal',
    cardType: 'Highlight',
    keyAttributes: { Speed: 98, Acceleration: 96, PhysicalContact: 92, Dribbling: 94, Finishing: 88 },
    skills: ['Double Touch', 'Sole Control', 'First-time Shot', 'Long Range Shooting']
  },

  // MIDFIELDERS
  {
    id: 'rodri_h',
    fullName: 'Rodri',
    commonName: 'Rodri',
    aliases: ['RODRI', 'RODRIGO', 'RODRIGO HERNANDEZ', 'RODRIGO H.'],
    primaryPosition: 'DMF',
    secondaryPositions: ['CMF', 'CB'],
    baseRating: 91,
    maxRating: 100,
    playstyle: 'Anchor Man',
    club: 'Manchester City',
    nationality: 'Spain',
    cardType: 'Highlight',
    keyAttributes: { DefensiveAwareness: 96, Tackling: 95, PhysicalContact: 94, LowPass: 94, LoftedPass: 92 },
    skills: ['One-touch Pass', 'Through Passing', 'Interception', 'Blocker', 'Weighted Pass', 'Aerial Superiority']
  },
  {
    id: 'debruyne_k',
    fullName: 'Kevin De Bruyne',
    commonName: 'K. De Bruyne',
    aliases: ['K. DE BRUYNE', 'DE BRUYNE', 'KEVIN DE BRUYNE', 'K DE BRUYNE'],
    primaryPosition: 'AMF',
    secondaryPositions: ['CMF', 'RWF'],
    baseRating: 91,
    maxRating: 100,
    playstyle: 'Creative Playmaker',
    club: 'Manchester City',
    nationality: 'Belgium',
    cardType: 'Highlight',
    keyAttributes: { LowPass: 98, LoftedPass: 98, KickingPower: 95, Finishing: 90, Curl: 92 },
    skills: ['Through Passing', 'Pinpoint Crossing', 'Weighted Pass', 'Long Range Shooting', 'One-touch Pass', 'Outside Curler']
  },
  {
    id: 'bellingham_j',
    fullName: 'Jude Bellingham',
    commonName: 'J. Bellingham',
    aliases: ['J. BELLINGHAM', 'BELLINGHAM', 'JUDE BELLINGHAM', 'J BELLINGHAM'],
    primaryPosition: 'AMF',
    secondaryPositions: ['CMF', 'SS', 'CF'],
    baseRating: 90,
    maxRating: 101,
    playstyle: 'Hole Player',
    club: 'Real Madrid',
    nationality: 'England',
    cardType: 'Show Time',
    keyAttributes: { OffensiveAwareness: 95, Stamina: 96, PhysicalContact: 90, Finishing: 90, LowPass: 91 },
    skills: ['One-touch Pass', 'Double Touch', 'Interception', 'First-time Shot', 'Fighting Spirit']
  },
  {
    id: 'gullit_r',
    fullName: 'Ruud Gullit',
    commonName: 'R. Gullit',
    aliases: ['R. GULLIT', 'GULLIT', 'RUUD GULLIT'],
    primaryPosition: 'AMF',
    secondaryPositions: ['CF', 'CMF', 'DMF', 'CB', 'SS'],
    baseRating: 93,
    maxRating: 104,
    playstyle: 'Classic No. 10',
    club: 'Epic Legends',
    nationality: 'Netherlands',
    cardType: 'Epic',
    keyAttributes: { PhysicalContact: 97, Heading: 94, LowPass: 93, Finishing: 92, DefensiveAwareness: 86, Speed: 90 },
    skills: ['One-touch Pass', 'Aerial Superiority', 'Heading', 'Through Passing', 'Interception', 'Double Touch']
  },
  {
    id: 'vieira_p',
    fullName: 'Patrick Vieira',
    commonName: 'P. Vieira',
    aliases: ['P. VIEIRA', 'VIEIRA', 'PATRICK VIEIRA'],
    primaryPosition: 'DMF',
    secondaryPositions: ['CMF', 'CB'],
    baseRating: 93,
    maxRating: 103,
    playstyle: 'The Destroyer',
    club: 'Epic Legends',
    nationality: 'France',
    cardType: 'Epic',
    keyAttributes: { DefensiveAwareness: 97, Tackling: 98, PhysicalContact: 98, Speed: 88, Interception: 98 },
    skills: ['Interception', 'Blocker', 'Man Marking', 'Aerial Superiority', 'Fighting Spirit', 'Sliding Tackle']
  },
  {
    id: 'pirlo_a',
    fullName: 'Andrea Pirlo',
    commonName: 'A. Pirlo',
    aliases: ['A. PIRLO', 'PIRLO', 'ANDREA PIRLO'],
    primaryPosition: 'DMF',
    secondaryPositions: ['CMF', 'AMF'],
    baseRating: 92,
    maxRating: 102,
    playstyle: 'Orchestrator',
    club: 'Epic Legends',
    nationality: 'Italy',
    cardType: 'Epic',
    keyAttributes: { LowPass: 99, LoftedPass: 99, PlaceKicking: 99, Curl: 97, TightPossession: 95 },
    skills: ['Weighted Pass', 'Through Passing', 'One-touch Pass', 'Low Lofted Pass', 'Pinpoint Crossing']
  },
  {
    id: 'modric_l',
    fullName: 'Luka Modrić',
    commonName: 'L. Modrić',
    aliases: ['L. MODRIC', 'MODRIC', 'LUKA MODRIC', 'L. MODRIĆ', 'MODRIĆ'],
    primaryPosition: 'CMF',
    secondaryPositions: ['AMF', 'DMF'],
    baseRating: 89,
    maxRating: 98,
    playstyle: 'Orchestrator',
    club: 'Real Madrid',
    nationality: 'Croatia',
    cardType: 'Highlight',
    keyAttributes: { LowPass: 96, TightPossession: 95, Balance: 92, OutsideCurler: 98, Stamina: 90 },
    skills: ['Outside Curler', 'One-touch Pass', 'Through Passing', 'Interception', 'Weighted Pass']
  },
  {
    id: 'dejong_f',
    fullName: 'Frenkie de Jong',
    commonName: 'F. de Jong',
    aliases: ['F. DE JONG', 'DE JONG', 'FRENKIE DE JONG', 'F DE JONG'],
    primaryPosition: 'CMF',
    secondaryPositions: ['DMF', 'CB', 'AMF'],
    baseRating: 89,
    maxRating: 98,
    playstyle: 'Orchestrator',
    club: 'FC Barcelona',
    nationality: 'Netherlands',
    cardType: 'Highlight',
    keyAttributes: { Dribbling: 95, LowPass: 94, TightPossession: 96, Speed: 87, DefensiveAwareness: 84 },
    skills: ['Double Touch', 'One-touch Pass', 'Through Passing', 'Interception', 'Sole Control']
  },
  {
    id: 'pedri_g',
    fullName: 'Pedri',
    commonName: 'Pedri',
    aliases: ['PEDRI', 'PEDRO GONZALEZ'],
    primaryPosition: 'CMF',
    secondaryPositions: ['AMF', 'LMF'],
    baseRating: 88,
    maxRating: 98,
    playstyle: 'Creative Playmaker',
    club: 'FC Barcelona',
    nationality: 'Spain',
    cardType: 'Highlight',
    keyAttributes: { TightPossession: 96, LowPass: 94, Balance: 94, Dribbling: 93 },
    skills: ['Sole Control', 'Through Passing', 'One-touch Pass', 'Double Touch']
  },
  {
    id: 'valverde_f',
    fullName: 'Federico Valverde',
    commonName: 'F. Valverde',
    aliases: ['F. VALVERDE', 'VALVERDE', 'FEDERICO VALVERDE', 'F VALVERDE'],
    primaryPosition: 'CMF',
    secondaryPositions: ['RWF', 'RB', 'DMF'],
    baseRating: 89,
    maxRating: 99,
    playstyle: 'Box-to-Box',
    club: 'Real Madrid',
    nationality: 'Uruguay',
    cardType: 'Highlight',
    keyAttributes: { Speed: 94, Stamina: 98, KickingPower: 97, DefensiveAwareness: 85, LowPass: 89 },
    skills: ['Long Range Shooting', 'Fighting Spirit', 'Interception', 'One-touch Pass']
  },
  {
    id: 'rice_d',
    fullName: 'Declan Rice',
    commonName: 'D. Rice',
    aliases: ['D. RICE', 'RICE', 'DECLAN RICE', 'D RICE'],
    primaryPosition: 'DMF',
    secondaryPositions: ['CMF', 'CB'],
    baseRating: 89,
    maxRating: 98,
    playstyle: 'The Destroyer',
    club: 'Arsenal',
    nationality: 'England',
    cardType: 'Highlight',
    keyAttributes: { DefensiveAwareness: 95, Tackling: 96, Stamina: 97, PhysicalContact: 92 },
    skills: ['Interception', 'Blocker', 'Man Marking', 'Fighting Spirit', 'Aerial Superiority']
  },
  {
    id: 'wirtz_f',
    fullName: 'Florian Wirtz',
    commonName: 'F. Wirtz',
    aliases: ['F. WIRTZ', 'WIRTZ', 'FLORIAN WIRTZ', 'F WIRTZ'],
    primaryPosition: 'AMF',
    secondaryPositions: ['SS', 'LWF'],
    baseRating: 88,
    maxRating: 98,
    playstyle: 'Hole Player',
    club: 'Bayer Leverkusen',
    nationality: 'Germany',
    cardType: 'Highlight',
    keyAttributes: { LowPass: 93, Dribbling: 94, Acceleration: 92, Finishing: 88, Balance: 94 },
    skills: ['One-touch Pass', 'Through Passing', 'Double Touch', 'Sole Control']
  },
  {
    id: 'musiala_j',
    fullName: 'Jamal Musiala',
    commonName: 'J. Musiala',
    aliases: ['J. MUSIALA', 'MUSIALA', 'JAMAL MUSIALA', 'J MUSIALA'],
    primaryPosition: 'AMF',
    secondaryPositions: ['LWF', 'CMF', 'SS'],
    baseRating: 88,
    maxRating: 98,
    playstyle: 'Creative Playmaker',
    club: 'Bayern München',
    nationality: 'Germany',
    cardType: 'Highlight',
    keyAttributes: { Dribbling: 98, TightPossession: 98, Balance: 97, Acceleration: 94, Finishing: 87 },
    skills: ['Double Touch', 'Sole Control', 'Flip Flap', 'First-time Shot', 'Through Passing']
  },

  // DEFENDERS
  {
    id: 'vandijk_v',
    fullName: 'Virgil van Dijk',
    commonName: 'V. van Dijk',
    aliases: ['V. VAN DIJK', 'VAN DIJK', 'VIRGIL VAN DIJK', 'V VAN DIJK'],
    primaryPosition: 'CB',
    secondaryPositions: [],
    baseRating: 90,
    maxRating: 100,
    playstyle: 'Build Up',
    club: 'Liverpool',
    nationality: 'Netherlands',
    cardType: 'Highlight',
    keyAttributes: { DefensiveAwareness: 98, Tackling: 97, PhysicalContact: 98, Heading: 94, Jumping: 92 },
    skills: ['Aerial Superiority', 'Man Marking', 'Interception', 'Blocker', 'Acrobatic Clearance']
  },
  {
    id: 'rudiger_a',
    fullName: 'Antonio Rüdiger',
    commonName: 'A. Rüdiger',
    aliases: ['A. RUDIGER', 'RUDIGER', 'ANTONIO RUDIGER', 'A. RÜDIGER', 'RÜDIGER', 'A RUDIGER'],
    primaryPosition: 'CB',
    secondaryPositions: ['RB'],
    baseRating: 89,
    maxRating: 98,
    playstyle: 'The Destroyer',
    club: 'Real Madrid',
    nationality: 'Germany',
    cardType: 'Highlight',
    keyAttributes: { Speed: 92, PhysicalContact: 96, DefensiveAwareness: 96, Tackling: 96, Aggression: 97 },
    skills: ['Blocker', 'Interception', 'Man Marking', 'Sliding Tackle', 'Acrobatic Clearance']
  },
  {
    id: 'maldini_p',
    fullName: 'Paolo Maldini',
    commonName: 'P. Maldini',
    aliases: ['P. MALDINI', 'MALDINI', 'PAOLO MALDINI'],
    primaryPosition: 'CB',
    secondaryPositions: ['LB'],
    baseRating: 93,
    maxRating: 104,
    playstyle: 'Build Up',
    club: 'Epic Legends',
    nationality: 'Italy',
    cardType: 'Epic',
    keyAttributes: { DefensiveAwareness: 99, Tackling: 99, Speed: 88, Interception: 99, Heading: 92 },
    skills: ['Man Marking', 'Interception', 'Blocker', 'Acrobatic Clearance', 'Sliding Tackle']
  },
  {
    id: 'nesta_a',
    fullName: 'Alessandro Nesta',
    commonName: 'A. Nesta',
    aliases: ['A. NESTA', 'NESTA', 'ALESSANDRO NESTA'],
    primaryPosition: 'CB',
    secondaryPositions: [],
    baseRating: 93,
    maxRating: 103,
    playstyle: 'The Destroyer',
    club: 'Epic Legends',
    nationality: 'Italy',
    cardType: 'Epic',
    keyAttributes: { DefensiveAwareness: 99, Tackling: 99, PhysicalContact: 95, Interception: 98 },
    skills: ['Man Marking', 'Interception', 'Sliding Tackle', 'Blocker', 'Aerial Superiority']
  },
  {
    id: 'saliba_w',
    fullName: 'William Saliba',
    commonName: 'W. Saliba',
    aliases: ['W. SALIBA', 'SALIBA', 'WILLIAM SALIBA', 'W SALIBA'],
    primaryPosition: 'CB',
    secondaryPositions: [],
    baseRating: 89,
    maxRating: 98,
    playstyle: 'Build Up',
    club: 'Arsenal',
    nationality: 'France',
    cardType: 'Highlight',
    keyAttributes: { DefensiveAwareness: 96, Tackling: 96, Speed: 88, PhysicalContact: 92 },
    skills: ['Interception', 'Man Marking', 'Blocker', 'Acrobatic Clearance']
  },
  {
    id: 'hernandez_t',
    fullName: 'Theo Hernández',
    commonName: 'T. Hernández',
    aliases: ['T. HERNANDEZ', 'THEO HERNANDEZ', 'T. HERNÁNDEZ', 'HERNANDEZ', 'THEO'],
    primaryPosition: 'LB',
    secondaryPositions: ['LMF', 'CB'],
    baseRating: 89,
    maxRating: 98,
    playstyle: 'Offensive Fullback',
    club: 'AC Milan',
    nationality: 'France',
    cardType: 'Highlight',
    keyAttributes: { Speed: 99, Acceleration: 96, PhysicalContact: 90, Stamina: 95, PinpointCrossing: 87 },
    skills: ['Double Touch', 'Pinpoint Crossing', 'Interception', 'Fighting Spirit']
  },
  {
    id: 'walker_k',
    fullName: 'Kyle Walker',
    commonName: 'K. Walker',
    aliases: ['K. WALKER', 'WALKER', 'KYLE WALKER', 'K WALKER'],
    primaryPosition: 'RB',
    secondaryPositions: ['CB'],
    baseRating: 88,
    maxRating: 97,
    playstyle: 'Defensive Fullback',
    club: 'Manchester City',
    nationality: 'England',
    cardType: 'Standard',
    keyAttributes: { Speed: 98, Acceleration: 95, PhysicalContact: 92, DefensiveAwareness: 90 },
    skills: ['Man Marking', 'Acrobatic Clearance', 'Interception', 'Fighting Spirit']
  },
  {
    id: 'robertocarlos',
    fullName: 'Roberto Carlos',
    commonName: 'R. Carlos',
    aliases: ['ROBERTO CARLOS', 'R. CARLOS', 'R CARLOS'],
    primaryPosition: 'LB',
    secondaryPositions: ['LMF'],
    baseRating: 92,
    maxRating: 102,
    playstyle: 'Offensive Fullback',
    club: 'Epic Legends',
    nationality: 'Brazil',
    cardType: 'Epic',
    keyAttributes: { Speed: 98, KickingPower: 99, Stamina: 99, Curl: 95, PinpointCrossing: 92 },
    skills: ['Knuckle Shot', 'Long Range Shooting', 'Pinpoint Crossing', 'Outside Curler']
  },
  {
    id: 'costacurta_a',
    fullName: 'Alessandro Costacurta',
    commonName: 'A. Costacurta',
    aliases: ['A. COSTACURTA', 'COSTACURTA', 'ALESSANDRO COSTACURTA'],
    primaryPosition: 'LB',
    secondaryPositions: ['RB', 'CB'],
    baseRating: 92,
    maxRating: 102,
    playstyle: 'Defensive Fullback',
    club: 'Epic Legends',
    nationality: 'Italy',
    cardType: 'Epic',
    keyAttributes: { DefensiveAwareness: 98, Tackling: 97, Interception: 98, Speed: 88, Stamina: 95 },
    skills: ['Man Marking', 'Interception', 'Blocker', 'Acrobatic Clearance']
  },

  // GOALKEEPERS
  {
    id: 'courtois_t',
    fullName: 'Thibaut Courtois',
    commonName: 'T. Courtois',
    aliases: ['T. COURTOIS', 'COURTOIS', 'THIBAUT COURTOIS', 'T COURTOIS'],
    primaryPosition: 'GK',
    secondaryPositions: [],
    baseRating: 90,
    maxRating: 99,
    playstyle: 'Defensive Goalkeeper',
    club: 'Real Madrid',
    nationality: 'Belgium',
    cardType: 'Highlight',
    keyAttributes: { GKReach: 98, GKReflexes: 97, GKAwareness: 96, GKCatching: 93, GKParrying: 95 },
    skills: ['GK Low Punt', 'Penalty Saver', 'GK High Punt']
  },
  {
    id: 'cech_p',
    fullName: 'Petr Čech',
    commonName: 'P. Čech',
    aliases: ['P. CECH', 'CECH', 'PETR CECH', 'P. ČECH', 'ČECH'],
    primaryPosition: 'GK',
    secondaryPositions: [],
    baseRating: 93,
    maxRating: 103,
    playstyle: 'Defensive Goalkeeper',
    club: 'Epic Legends',
    nationality: 'Czechia',
    cardType: 'Epic',
    keyAttributes: { GKReach: 99, GKReflexes: 98, GKAwareness: 97, GKCatching: 95, GKParrying: 97 },
    skills: ['GK Low Punt', 'Penalty Saver', 'Fighting Spirit']
  },
  {
    id: 'schmeichel_p',
    fullName: 'Peter Schmeichel',
    commonName: 'P. Schmeichel',
    aliases: ['P. SCHMEICHEL', 'SCHMEICHEL', 'PETER SCHMEICHEL'],
    primaryPosition: 'GK',
    secondaryPositions: [],
    baseRating: 93,
    maxRating: 103,
    playstyle: 'Defensive Goalkeeper',
    club: 'Epic Legends',
    nationality: 'Denmark',
    cardType: 'Epic',
    keyAttributes: { GKReach: 98, GKReflexes: 99, GKAwareness: 98, GKCatching: 94, GKParrying: 98 },
    skills: ['GK Low Punt', 'Penalty Saver', 'Fighting Spirit', 'Captaincy']
  },
  {
    id: 'alisson_b',
    fullName: 'Alisson Becker',
    commonName: 'Alisson',
    aliases: ['ALISSON', 'ALISSON BECKER', 'A. BECKER'],
    primaryPosition: 'GK',
    secondaryPositions: [],
    baseRating: 89,
    maxRating: 98,
    playstyle: 'Offensive Goalkeeper',
    club: 'Liverpool',
    nationality: 'Brazil',
    cardType: 'Highlight',
    keyAttributes: { GKReflexes: 97, GKReach: 96, GKAwareness: 96, GKParrying: 95 },
    skills: ['GK Low Punt', 'Penalty Saver']
  }
];

export const EFOOTBALL_MASTER_COACHES: EFootballMasterCoach[] = [
  {
    id: 'coach_guardiola',
    name: 'Pep Guardiola',
    inGameName: 'L. Roman',
    aliasNames: ['L. ROMAN', 'PEP GUARDIOLA', 'GUARDIOLA', 'L ROMAN'],
    tacticalStyle: 'Possession Game',
    affinityRating: 88,
    tacticalDescription: 'High tactical proficiency for short-passing build up and counter-pressing in opponent half.'
  },
  {
    id: 'coach_klopp',
    name: 'Jürgen Klopp',
    inGameName: 'G. Zeitzler',
    aliasNames: ['G. ZEITZLER', 'JURGEN KLOPP', 'KLOPP', 'G ZEITZLER', 'JÜRGEN KLOPP'],
    tacticalStyle: 'Quick Counter',
    affinityRating: 88,
    tacticalDescription: 'Immediate aggressive gegenpress upon turnover with lightning-quick vertical passing into front line.'
  },
  {
    id: 'coach_alonso',
    name: 'Xabi Alonso',
    inGameName: 'Xabi Alonso',
    aliasNames: ['XABI ALONSO', 'ALONSO'],
    tacticalStyle: 'Quick Counter',
    affinityRating: 88,
    tacticalDescription: 'Boosts acceleration and passing efficiency with fluid 3-back or 4-back wide transition systems.'
  },
  {
    id: 'coach_ancelotti',
    name: 'Carlo Ancelotti',
    inGameName: 'G. Ripa',
    aliasNames: ['G. RIPA', 'CARLO ANCELOTTI', 'ANCELOTTI', 'G RIPA'],
    tacticalStyle: 'Long Ball Counter',
    affinityRating: 87,
    tacticalDescription: 'Deep defensive block stability and rapid surgical counters utilizing pacey wingers.'
  },
  {
    id: 'coach_arteta',
    name: 'Mikel Arteta',
    inGameName: 'M. Arteta',
    aliasNames: ['M. ARTETA', 'MIKEL ARTETA', 'ARTETA'],
    tacticalStyle: 'Possession Game',
    affinityRating: 86,
    tacticalDescription: 'Structured positional play with inverted fullbacks dominating central midfield overloads.'
  },
  {
    id: 'coach_inzaghi',
    name: 'Simone Inzaghi',
    inGameName: 'S. Inzaghi',
    aliasNames: ['S. INZAGHI', 'SIMONE INZAGHI', 'INZAGHI'],
    tacticalStyle: 'Long Ball Counter',
    affinityRating: 85,
    tacticalDescription: 'Specialized for 3-5-2 with overlapping centre backs and high-tempo direct through passes.'
  },
  {
    id: 'coach_scaloni',
    name: 'Lionel Scaloni',
    inGameName: 'L. Scaloni',
    aliasNames: ['L. SCALONI', 'LIONEL SCALONI', 'SCALONI'],
    tacticalStyle: 'Quick Counter',
    affinityRating: 87,
    tacticalDescription: 'Relentless team-wide pressing, rapid horizontal circulation, and clutch finishing boosts.'
  }
];

// String Normalization Utility
export function normalizeString(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics / accents
    .replace(/[^a-zA-Z0-9\s]/g, ' ') // remove special chars
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

// Levenshtein distance
export function levenshteinDistance(a: string, b: string): number {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix = new Array(bn + 1);
  for (let i = 0; i <= bn; ++i) {
    let row = (matrix[i] = new Array(an + 1));
    row[0] = i;
  }
  const firstRow = matrix[0];
  for (let j = 1; j <= an; ++j) {
    firstRow[j] = j;
  }
  for (let i = 1; i <= bn; ++i) {
    for (let j = 1; j <= an; ++j) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          )
        );
      }
    }
  }
  return matrix[bn][an];
}

// Similarity Ratio (0.0 to 1.0)
export function stringSimilarity(a: string, b: string): number {
  const normA = normalizeString(a);
  const normB = normalizeString(b);
  if (normA === normB) return 1.0;
  if (!normA || !normB) return 0.0;
  const maxLen = Math.max(normA.length, normB.length);
  const dist = levenshteinDistance(normA, normB);
  return Math.max(0, 1.0 - dist / maxLen);
}

export interface MatchCandidate {
  player: EFootballMasterPlayer;
  score: number; // 0 to 100
  matchReason: string;
}

// Fuzzy match extracted text against the Master Player Database
export function findDatabaseMatches(
  ocrText: string,
  targetPosition?: string,
  targetRating?: number
): MatchCandidate[] {
  const cleanInput = normalizeString(ocrText);
  if (!cleanInput || cleanInput.length < 2) {
    return [];
  }

  const results: MatchCandidate[] = [];

  for (const player of EFOOTBALL_MASTER_PLAYERS) {
    let bestSimilarity = 0;
    let matchType = '';

    // Check full name and common name
    const simFull = stringSimilarity(cleanInput, player.fullName);
    const simCommon = stringSimilarity(cleanInput, player.commonName);
    if (simFull > bestSimilarity) {
      bestSimilarity = simFull;
      matchType = 'Full Name Match';
    }
    if (simCommon > bestSimilarity) {
      bestSimilarity = simCommon;
      matchType = 'Common Name Match';
    }

    // Check all alias variations
    for (const alias of player.aliases) {
      const simAlias = stringSimilarity(cleanInput, alias);
      // Substring check: e.g. OCR is "K. MBAPPE 98" or "MBAPPE"
      const aliasNorm = normalizeString(alias);
      if (cleanInput.includes(aliasNorm) || aliasNorm.includes(cleanInput)) {
        const bonus = Math.min(aliasNorm.length, cleanInput.length) / Math.max(aliasNorm.length, cleanInput.length);
        if (bonus > bestSimilarity) {
          bestSimilarity = bonus;
          matchType = `Exact/Substring Alias '${alias}'`;
        }
      }
      if (simAlias > bestSimilarity) {
        bestSimilarity = simAlias;
        matchType = `Alias '${alias}' Match`;
      }
    }

    // Only consider candidates with reasonable similarity (e.g. > 0.60)
    if (bestSimilarity >= 0.60) {
      let finalScore = Math.round(bestSimilarity * 80); // Up to 80 points from text

      // Positional boost
      if (targetPosition) {
        if (player.primaryPosition === targetPosition) {
          finalScore += 12;
        } else if (player.secondaryPositions.includes(targetPosition)) {
          finalScore += 6;
        } else {
          finalScore -= 10; // Position mismatch penalty
        }
      }

      // Rating boost/penalty
      if (targetRating && targetRating >= 70 && targetRating <= 105) {
        const diff = Math.abs(targetRating - player.maxRating);
        if (diff <= 3) {
          finalScore += 8;
        } else if (diff > 12) {
          finalScore -= 10;
        }
      }

      results.push({
        player,
        score: Math.min(100, Math.max(0, finalScore)),
        matchReason: `${matchType} (${Math.round(bestSimilarity * 100)}% text similarity)`
      });
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);
  return results;
}

// Coach Matcher
export function searchMasterPlayers(query: string, limit: number = 8): EFootballMasterPlayer[] {
  const clean = normalizeString(query);
  if (!clean) return EFOOTBALL_MASTER_PLAYERS.slice(0, limit);

  const matched = EFOOTBALL_MASTER_PLAYERS.map(player => {
    let bestSim = Math.max(
      stringSimilarity(clean, player.commonName),
      stringSimilarity(clean, player.fullName)
    );
    for (const alias of player.aliases) {
      const aliasSim = stringSimilarity(clean, alias);
      const aliasNorm = normalizeString(alias);
      if (clean.includes(aliasNorm) || aliasNorm.includes(clean)) {
        bestSim = Math.max(bestSim, 0.9);
      }
      bestSim = Math.max(bestSim, aliasSim);
    }
    return { player, sim: bestSim };
  })
  .filter(item => item.sim >= 0.35)
  .sort((a, b) => b.sim - a.sim)
  .map(item => item.player);

  return matched.slice(0, limit);
}

export function findDatabaseCoach(ocrText: string): EFootballMasterCoach | null {
  const cleanInput = normalizeString(ocrText);
  if (!cleanInput) return null;

  let bestCoach: EFootballMasterCoach | null = null;
  let highestScore = 0;

  for (const coach of EFOOTBALL_MASTER_COACHES) {
    const simName = stringSimilarity(cleanInput, coach.name);
    const simInGame = stringSimilarity(cleanInput, coach.inGameName);
    let topScore = Math.max(simName, simInGame);

    for (const alias of coach.aliasNames) {
      const simAlias = stringSimilarity(cleanInput, alias);
      const aliasNorm = normalizeString(alias);
      if (cleanInput.includes(aliasNorm) || aliasNorm.includes(cleanInput)) {
        topScore = Math.max(topScore, 0.95);
      }
      topScore = Math.max(topScore, simAlias);
    }

    if (topScore > highestScore && topScore >= 0.70) {
      highestScore = topScore;
      bestCoach = coach;
    }
  }

  return bestCoach;
}
