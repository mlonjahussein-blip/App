// src/lib/efootballDatabase.ts
var EFOOTBALL_MASTER_PLAYERS = [
  // ATTACKERS
  {
    id: "mbappe_k",
    fullName: "Kylian Mbapp\xE9",
    commonName: "K. Mbapp\xE9",
    aliases: ["K. MBAPPE", "MBAPPE", "KYLIAN MBAPPE", "K. MBAPP\xC9", "MBAPP\xC9", "K MBAPPE"],
    primaryPosition: "CF",
    secondaryPositions: ["LWF", "SS", "RWF"],
    baseRating: 91,
    maxRating: 101,
    playstyle: "Goal Poacher",
    club: "Real Madrid",
    nationality: "France",
    cardType: "Show Time",
    keyAttributes: { Speed: 99, Acceleration: 98, Finishing: 95, Dribbling: 94, OffensiveAwareness: 96 },
    skills: ["Double Touch", "First-time Shot", "Long Range Shooting", "Speeding Bullet", "Acrobatic Finishing", "Outside Curler"]
  },
  {
    id: "haaland_e",
    fullName: "Erling Haaland",
    commonName: "E. Haaland",
    aliases: ["E. HAALAND", "HAALAND", "ERLING HAALAND", "E HAALAND"],
    primaryPosition: "CF",
    secondaryPositions: ["SS"],
    baseRating: 90,
    maxRating: 100,
    playstyle: "Goal Poacher",
    club: "Manchester City",
    nationality: "Norway",
    cardType: "Highlight",
    keyAttributes: { Finishing: 98, PhysicalContact: 96, Speed: 94, OffensiveAwareness: 97, Heading: 90 },
    skills: ["Heading", "First-time Shot", "Acrobatic Finishing", "Aerial Superiority", "Fighting Spirit"]
  },
  {
    id: "messi_l",
    fullName: "Lionel Messi",
    commonName: "L. Messi",
    aliases: ["L. MESSI", "MESSI", "LIONEL MESSI", "L MESSI"],
    primaryPosition: "RWF",
    secondaryPositions: ["SS", "AMF", "CF"],
    baseRating: 92,
    maxRating: 104,
    playstyle: "Deep-Lying Forward",
    club: "Inter Miami",
    nationality: "Argentina",
    cardType: "Big Time",
    keyAttributes: { TightPossession: 99, Balance: 99, Finishing: 96, LowPass: 94, Curl: 97, Dribbling: 98 },
    skills: ["Double Touch", "Through Passing", "One-touch Pass", "Long Range Curler", "Outside Curler", "Sole Control"]
  },
  {
    id: "ronaldo_c",
    fullName: "Cristiano Ronaldo",
    commonName: "C. Ronaldo",
    aliases: ["C. RONALDO", "RONALDO", "CRISTIANO RONALDO", "C RONALDO", "CR7"],
    primaryPosition: "CF",
    secondaryPositions: ["LWF", "SS"],
    baseRating: 88,
    maxRating: 99,
    playstyle: "Goal Poacher",
    club: "Al Nassr",
    nationality: "Portugal",
    cardType: "Highlight",
    keyAttributes: { Finishing: 96, Heading: 94, Jumping: 95, PhysicalContact: 90, KickingPower: 96 },
    skills: ["Knuckle Shot", "Heading", "Acrobatic Finishing", "Aerial Superiority", "First-time Shot", "Penalty Specialist"]
  },
  {
    id: "vinicius_jr",
    fullName: "Vin\xEDcius J\xFAnior",
    commonName: "Vin\xEDcius Jr.",
    aliases: ["VINICIUS JR", "V. JUNIOR", "VINICIUS JUNIOR", "V. J\xDANIOR", "VIN\xCDCIUS JR", "VINI JR"],
    primaryPosition: "LWF",
    secondaryPositions: ["CF", "SS", "LM"],
    baseRating: 89,
    maxRating: 99,
    playstyle: "Roaming Flank",
    club: "Real Madrid",
    nationality: "Brazil",
    cardType: "Show Time",
    keyAttributes: { Speed: 98, Acceleration: 98, Dribbling: 96, TightPossession: 94, Finishing: 89 },
    skills: ["Double Touch", "Flip Flap", "Sole Control", "First-time Shot", "Outside Curler"]
  },
  {
    id: "salah_m",
    fullName: "Mohamed Salah",
    commonName: "M. Salah",
    aliases: ["M. SALAH", "SALAH", "MOHAMED SALAH", "M SALAH"],
    primaryPosition: "RWF",
    secondaryPositions: ["CF", "SS", "RM"],
    baseRating: 90,
    maxRating: 99,
    playstyle: "Prolific Winger",
    club: "Liverpool",
    nationality: "Egypt",
    cardType: "Highlight",
    keyAttributes: { Speed: 95, Finishing: 94, OffensiveAwareness: 95, Acceleration: 95, Curl: 88 },
    skills: ["Long Range Curler", "Cut Behind & Turn", "First-time Shot", "Outside Curler", "Through Passing"]
  },
  {
    id: "kane_h",
    fullName: "Harry Kane",
    commonName: "H. Kane",
    aliases: ["H. KANE", "KANE", "HARRY KANE", "H KANE"],
    primaryPosition: "CF",
    secondaryPositions: ["SS", "AMF"],
    baseRating: 90,
    maxRating: 98,
    playstyle: "Deep-Lying Forward",
    club: "Bayern M\xFCnchen",
    nationality: "England",
    cardType: "Highlight",
    keyAttributes: { Finishing: 97, KickingPower: 95, LowPass: 90, Heading: 90, OffensiveAwareness: 96 },
    skills: ["One-touch Pass", "Through Passing", "First-time Shot", "Long Range Shooting", "Heading"]
  },
  {
    id: "rummenigge_k",
    fullName: "Karl-Heinz Rummenigge",
    commonName: "K. Rummenigge",
    aliases: ["K. RUMMENIGGE", "RUMMENIGGE", "KARL-HEINZ RUMMENIGGE"],
    primaryPosition: "CF",
    secondaryPositions: ["SS", "RWF"],
    baseRating: 93,
    maxRating: 103,
    playstyle: "Goal Poacher",
    club: "Epic Legends",
    nationality: "Germany",
    cardType: "Epic",
    keyAttributes: { Speed: 96, Acceleration: 95, Finishing: 97, OffensiveAwareness: 98, KickingPower: 94 },
    skills: ["Double Touch", "First-time Shot", "Long Range Shooting", "Acrobatic Finishing", "Outside Curler"]
  },
  {
    id: "suarez_l",
    fullName: "Luis Su\xE1rez",
    commonName: "L. Su\xE1rez",
    aliases: ["L. SUAREZ", "SUAREZ", "LUIS SUAREZ", "L. SU\xC1REZ", "LUIS SU\xC1REZ", "EL PISTOLERO"],
    primaryPosition: "CF",
    secondaryPositions: ["SS"],
    baseRating: 92,
    maxRating: 102,
    playstyle: "Goal Poacher",
    club: "Inter Miami",
    nationality: "Uruguay",
    cardType: "Epic",
    keyAttributes: { Finishing: 98, OffensiveAwareness: 97, PhysicalContact: 92, Balance: 88, KickingPower: 93 },
    skills: ["First-time Shot", "Long Range Shooting", "Acrobatic Finishing", "Sole Control", "Fighting Spirit", "Gamesmanship"]
  },
  {
    id: "cruyff_j",
    fullName: "Johan Cruyff",
    commonName: "J. Cruijff",
    aliases: ["J. CRUIJFF", "CRUYFF", "JOHAN CRUYFF", "J. CRUYFF", "CRUIJFF"],
    primaryPosition: "SS",
    secondaryPositions: ["AMF", "CF", "LWF"],
    baseRating: 93,
    maxRating: 103,
    playstyle: "Hole Player",
    club: "Epic Legends",
    nationality: "Netherlands",
    cardType: "Epic",
    keyAttributes: { TightPossession: 97, Dribbling: 96, LowPass: 92, Finishing: 93, Acceleration: 94 },
    skills: ["Double Touch", "One-touch Pass", "Through Passing", "Outside Curler", "First-time Shot"]
  },
  {
    id: "shevchenko_a",
    fullName: "Andriy Shevchenko",
    commonName: "A. Shevchenko",
    aliases: ["A. SHEVCHENKO", "SHEVCHENKO", "ANDRIY SHEVCHENKO"],
    primaryPosition: "CF",
    secondaryPositions: ["SS"],
    baseRating: 92,
    maxRating: 102,
    playstyle: "Goal Poacher",
    club: "Epic Legends",
    nationality: "Ukraine",
    cardType: "Epic",
    keyAttributes: { Speed: 95, Finishing: 96, OffensiveAwareness: 96, KickingPower: 94 },
    skills: ["First-time Shot", "Long Range Shooting", "Heading", "Acrobatic Finishing"]
  },
  {
    id: "neymar_jr",
    fullName: "Neymar Jr",
    commonName: "Neymar Jr",
    aliases: ["NEYMAR JR", "NEYMAR", "NEYMAR J\xDANIOR", "NEYMAR JR."],
    primaryPosition: "LWF",
    secondaryPositions: ["AMF", "SS", "CF"],
    baseRating: 90,
    maxRating: 102,
    playstyle: "Creative Playmaker",
    club: "Al Hilal",
    nationality: "Brazil",
    cardType: "Epic",
    keyAttributes: { Dribbling: 99, TightPossession: 98, Acceleration: 95, Finishing: 92, Curl: 94 },
    skills: ["Double Touch", "Flip Flap", "Sole Control", "Marseille Turn", "Long Range Curler", "Through Passing"]
  },
  {
    id: "yamal_l",
    fullName: "Lamine Yamal",
    commonName: "L. Yamal",
    aliases: ["L. YAMAL", "LAMINE YAMAL", "YAMAL"],
    primaryPosition: "RWF",
    secondaryPositions: ["LWF", "AMF"],
    baseRating: 88,
    maxRating: 99,
    playstyle: "Roaming Flank",
    club: "FC Barcelona",
    nationality: "Spain",
    cardType: "Show Time",
    keyAttributes: { Acceleration: 97, Dribbling: 96, Curl: 92, LowPass: 89, Balance: 95 },
    skills: ["Double Touch", "Long Range Curler", "Through Passing", "Pinpoint Crossing"]
  },
  {
    id: "son_hm",
    fullName: "Son Heung-Min",
    commonName: "H. Son",
    aliases: ["H. SON", "SON HEUNG-MIN", "SON", "HEUNG-MIN SON", "H M SON"],
    primaryPosition: "LWF",
    secondaryPositions: ["CF", "SS", "RWF"],
    baseRating: 89,
    maxRating: 98,
    playstyle: "Roaming Flank",
    club: "Tottenham Hotspur",
    nationality: "Korea Republic",
    cardType: "Highlight",
    keyAttributes: { Speed: 95, Finishing: 94, KickingPower: 94, LongRangeCurler: 93, Curl: 90 },
    skills: ["Long Range Curler", "First-time Shot", "Double Touch", "Outside Curler", "Knuckle Shot"]
  },
  {
    id: "leao_r",
    fullName: "Rafael Le\xE3o",
    commonName: "R. Le\xE3o",
    aliases: ["R. LEAO", "RAFAEL LEAO", "LEAO", "R. LE\xC3O", "RAFAEL LE\xC3O"],
    primaryPosition: "LWF",
    secondaryPositions: ["CF", "SS"],
    baseRating: 88,
    maxRating: 98,
    playstyle: "Prolific Winger",
    club: "AC Milan",
    nationality: "Portugal",
    cardType: "Highlight",
    keyAttributes: { Speed: 98, Acceleration: 96, PhysicalContact: 92, Dribbling: 94, Finishing: 88 },
    skills: ["Double Touch", "Sole Control", "First-time Shot", "Long Range Shooting"]
  },
  // MIDFIELDERS
  {
    id: "rodri_h",
    fullName: "Rodri",
    commonName: "Rodri",
    aliases: ["RODRI", "RODRIGO", "RODRIGO HERNANDEZ", "RODRIGO H."],
    primaryPosition: "DMF",
    secondaryPositions: ["CMF", "CB"],
    baseRating: 91,
    maxRating: 100,
    playstyle: "Anchor Man",
    club: "Manchester City",
    nationality: "Spain",
    cardType: "Highlight",
    keyAttributes: { DefensiveAwareness: 96, Tackling: 95, PhysicalContact: 94, LowPass: 94, LoftedPass: 92 },
    skills: ["One-touch Pass", "Through Passing", "Interception", "Blocker", "Weighted Pass", "Aerial Superiority"]
  },
  {
    id: "debruyne_k",
    fullName: "Kevin De Bruyne",
    commonName: "K. De Bruyne",
    aliases: ["K. DE BRUYNE", "DE BRUYNE", "KEVIN DE BRUYNE", "K DE BRUYNE"],
    primaryPosition: "AMF",
    secondaryPositions: ["CMF", "RWF"],
    baseRating: 91,
    maxRating: 100,
    playstyle: "Creative Playmaker",
    club: "Manchester City",
    nationality: "Belgium",
    cardType: "Highlight",
    keyAttributes: { LowPass: 98, LoftedPass: 98, KickingPower: 95, Finishing: 90, Curl: 92 },
    skills: ["Through Passing", "Pinpoint Crossing", "Weighted Pass", "Long Range Shooting", "One-touch Pass", "Outside Curler"]
  },
  {
    id: "bellingham_j",
    fullName: "Jude Bellingham",
    commonName: "J. Bellingham",
    aliases: ["J. BELLINGHAM", "BELLINGHAM", "JUDE BELLINGHAM", "J BELLINGHAM"],
    primaryPosition: "AMF",
    secondaryPositions: ["CMF", "SS", "CF"],
    baseRating: 90,
    maxRating: 101,
    playstyle: "Hole Player",
    club: "Real Madrid",
    nationality: "England",
    cardType: "Show Time",
    keyAttributes: { OffensiveAwareness: 95, Stamina: 96, PhysicalContact: 90, Finishing: 90, LowPass: 91 },
    skills: ["One-touch Pass", "Double Touch", "Interception", "First-time Shot", "Fighting Spirit"]
  },
  {
    id: "gullit_r",
    fullName: "Ruud Gullit",
    commonName: "R. Gullit",
    aliases: ["R. GULLIT", "GULLIT", "RUUD GULLIT"],
    primaryPosition: "AMF",
    secondaryPositions: ["CF", "CMF", "DMF", "CB", "SS"],
    baseRating: 93,
    maxRating: 104,
    playstyle: "Classic No. 10",
    club: "Epic Legends",
    nationality: "Netherlands",
    cardType: "Epic",
    keyAttributes: { PhysicalContact: 97, Heading: 94, LowPass: 93, Finishing: 92, DefensiveAwareness: 86, Speed: 90 },
    skills: ["One-touch Pass", "Aerial Superiority", "Heading", "Through Passing", "Interception", "Double Touch"]
  },
  {
    id: "vieira_p",
    fullName: "Patrick Vieira",
    commonName: "P. Vieira",
    aliases: ["P. VIEIRA", "VIEIRA", "PATRICK VIEIRA"],
    primaryPosition: "DMF",
    secondaryPositions: ["CMF", "CB"],
    baseRating: 93,
    maxRating: 103,
    playstyle: "The Destroyer",
    club: "Epic Legends",
    nationality: "France",
    cardType: "Epic",
    keyAttributes: { DefensiveAwareness: 97, Tackling: 98, PhysicalContact: 98, Speed: 88, Interception: 98 },
    skills: ["Interception", "Blocker", "Man Marking", "Aerial Superiority", "Fighting Spirit", "Sliding Tackle"]
  },
  {
    id: "pirlo_a",
    fullName: "Andrea Pirlo",
    commonName: "A. Pirlo",
    aliases: ["A. PIRLO", "PIRLO", "ANDREA PIRLO"],
    primaryPosition: "DMF",
    secondaryPositions: ["CMF", "AMF"],
    baseRating: 92,
    maxRating: 102,
    playstyle: "Orchestrator",
    club: "Epic Legends",
    nationality: "Italy",
    cardType: "Epic",
    keyAttributes: { LowPass: 99, LoftedPass: 99, PlaceKicking: 99, Curl: 97, TightPossession: 95 },
    skills: ["Weighted Pass", "Through Passing", "One-touch Pass", "Low Lofted Pass", "Pinpoint Crossing"]
  },
  {
    id: "modric_l",
    fullName: "Luka Modri\u0107",
    commonName: "L. Modri\u0107",
    aliases: ["L. MODRIC", "MODRIC", "LUKA MODRIC", "L. MODRI\u0106", "MODRI\u0106"],
    primaryPosition: "CMF",
    secondaryPositions: ["AMF", "DMF"],
    baseRating: 89,
    maxRating: 98,
    playstyle: "Orchestrator",
    club: "Real Madrid",
    nationality: "Croatia",
    cardType: "Highlight",
    keyAttributes: { LowPass: 96, TightPossession: 95, Balance: 92, OutsideCurler: 98, Stamina: 90 },
    skills: ["Outside Curler", "One-touch Pass", "Through Passing", "Interception", "Weighted Pass"]
  },
  {
    id: "dejong_f",
    fullName: "Frenkie de Jong",
    commonName: "F. de Jong",
    aliases: ["F. DE JONG", "DE JONG", "FRENKIE DE JONG", "F DE JONG"],
    primaryPosition: "CMF",
    secondaryPositions: ["DMF", "CB", "AMF"],
    baseRating: 89,
    maxRating: 98,
    playstyle: "Orchestrator",
    club: "FC Barcelona",
    nationality: "Netherlands",
    cardType: "Highlight",
    keyAttributes: { Dribbling: 95, LowPass: 94, TightPossession: 96, Speed: 87, DefensiveAwareness: 84 },
    skills: ["Double Touch", "One-touch Pass", "Through Passing", "Interception", "Sole Control"]
  },
  {
    id: "pedri_g",
    fullName: "Pedri",
    commonName: "Pedri",
    aliases: ["PEDRI", "PEDRO GONZALEZ"],
    primaryPosition: "CMF",
    secondaryPositions: ["AMF", "LMF"],
    baseRating: 88,
    maxRating: 98,
    playstyle: "Creative Playmaker",
    club: "FC Barcelona",
    nationality: "Spain",
    cardType: "Highlight",
    keyAttributes: { TightPossession: 96, LowPass: 94, Balance: 94, Dribbling: 93 },
    skills: ["Sole Control", "Through Passing", "One-touch Pass", "Double Touch"]
  },
  {
    id: "valverde_f",
    fullName: "Federico Valverde",
    commonName: "F. Valverde",
    aliases: ["F. VALVERDE", "VALVERDE", "FEDERICO VALVERDE", "F VALVERDE"],
    primaryPosition: "CMF",
    secondaryPositions: ["RWF", "RB", "DMF"],
    baseRating: 89,
    maxRating: 99,
    playstyle: "Box-to-Box",
    club: "Real Madrid",
    nationality: "Uruguay",
    cardType: "Highlight",
    keyAttributes: { Speed: 94, Stamina: 98, KickingPower: 97, DefensiveAwareness: 85, LowPass: 89 },
    skills: ["Long Range Shooting", "Fighting Spirit", "Interception", "One-touch Pass"]
  },
  {
    id: "rice_d",
    fullName: "Declan Rice",
    commonName: "D. Rice",
    aliases: ["D. RICE", "RICE", "DECLAN RICE", "D RICE"],
    primaryPosition: "DMF",
    secondaryPositions: ["CMF", "CB"],
    baseRating: 89,
    maxRating: 98,
    playstyle: "The Destroyer",
    club: "Arsenal",
    nationality: "England",
    cardType: "Highlight",
    keyAttributes: { DefensiveAwareness: 95, Tackling: 96, Stamina: 97, PhysicalContact: 92 },
    skills: ["Interception", "Blocker", "Man Marking", "Fighting Spirit", "Aerial Superiority"]
  },
  {
    id: "wirtz_f",
    fullName: "Florian Wirtz",
    commonName: "F. Wirtz",
    aliases: ["F. WIRTZ", "WIRTZ", "FLORIAN WIRTZ", "F WIRTZ"],
    primaryPosition: "AMF",
    secondaryPositions: ["SS", "LWF"],
    baseRating: 88,
    maxRating: 98,
    playstyle: "Hole Player",
    club: "Bayer Leverkusen",
    nationality: "Germany",
    cardType: "Highlight",
    keyAttributes: { LowPass: 93, Dribbling: 94, Acceleration: 92, Finishing: 88, Balance: 94 },
    skills: ["One-touch Pass", "Through Passing", "Double Touch", "Sole Control"]
  },
  {
    id: "musiala_j",
    fullName: "Jamal Musiala",
    commonName: "J. Musiala",
    aliases: ["J. MUSIALA", "MUSIALA", "JAMAL MUSIALA", "J MUSIALA"],
    primaryPosition: "AMF",
    secondaryPositions: ["LWF", "CMF", "SS"],
    baseRating: 88,
    maxRating: 98,
    playstyle: "Creative Playmaker",
    club: "Bayern M\xFCnchen",
    nationality: "Germany",
    cardType: "Highlight",
    keyAttributes: { Dribbling: 98, TightPossession: 98, Balance: 97, Acceleration: 94, Finishing: 87 },
    skills: ["Double Touch", "Sole Control", "Flip Flap", "First-time Shot", "Through Passing"]
  },
  // DEFENDERS
  {
    id: "vandijk_v",
    fullName: "Virgil van Dijk",
    commonName: "V. van Dijk",
    aliases: ["V. VAN DIJK", "VAN DIJK", "VIRGIL VAN DIJK", "V VAN DIJK"],
    primaryPosition: "CB",
    secondaryPositions: [],
    baseRating: 90,
    maxRating: 100,
    playstyle: "Build Up",
    club: "Liverpool",
    nationality: "Netherlands",
    cardType: "Highlight",
    keyAttributes: { DefensiveAwareness: 98, Tackling: 97, PhysicalContact: 98, Heading: 94, Jumping: 92 },
    skills: ["Aerial Superiority", "Man Marking", "Interception", "Blocker", "Acrobatic Clearance"]
  },
  {
    id: "rudiger_a",
    fullName: "Antonio R\xFCdiger",
    commonName: "A. R\xFCdiger",
    aliases: ["A. RUDIGER", "RUDIGER", "ANTONIO RUDIGER", "A. R\xDCDIGER", "R\xDCDIGER", "A RUDIGER"],
    primaryPosition: "CB",
    secondaryPositions: ["RB"],
    baseRating: 89,
    maxRating: 98,
    playstyle: "The Destroyer",
    club: "Real Madrid",
    nationality: "Germany",
    cardType: "Highlight",
    keyAttributes: { Speed: 92, PhysicalContact: 96, DefensiveAwareness: 96, Tackling: 96, Aggression: 97 },
    skills: ["Blocker", "Interception", "Man Marking", "Sliding Tackle", "Acrobatic Clearance"]
  },
  {
    id: "maldini_p",
    fullName: "Paolo Maldini",
    commonName: "P. Maldini",
    aliases: ["P. MALDINI", "MALDINI", "PAOLO MALDINI"],
    primaryPosition: "CB",
    secondaryPositions: ["LB"],
    baseRating: 93,
    maxRating: 104,
    playstyle: "Build Up",
    club: "Epic Legends",
    nationality: "Italy",
    cardType: "Epic",
    keyAttributes: { DefensiveAwareness: 99, Tackling: 99, Speed: 88, Interception: 99, Heading: 92 },
    skills: ["Man Marking", "Interception", "Blocker", "Acrobatic Clearance", "Sliding Tackle"]
  },
  {
    id: "nesta_a",
    fullName: "Alessandro Nesta",
    commonName: "A. Nesta",
    aliases: ["A. NESTA", "NESTA", "ALESSANDRO NESTA"],
    primaryPosition: "CB",
    secondaryPositions: [],
    baseRating: 93,
    maxRating: 103,
    playstyle: "The Destroyer",
    club: "Epic Legends",
    nationality: "Italy",
    cardType: "Epic",
    keyAttributes: { DefensiveAwareness: 99, Tackling: 99, PhysicalContact: 95, Interception: 98 },
    skills: ["Man Marking", "Interception", "Sliding Tackle", "Blocker", "Aerial Superiority"]
  },
  {
    id: "saliba_w",
    fullName: "William Saliba",
    commonName: "W. Saliba",
    aliases: ["W. SALIBA", "SALIBA", "WILLIAM SALIBA", "W SALIBA"],
    primaryPosition: "CB",
    secondaryPositions: [],
    baseRating: 89,
    maxRating: 98,
    playstyle: "Build Up",
    club: "Arsenal",
    nationality: "France",
    cardType: "Highlight",
    keyAttributes: { DefensiveAwareness: 96, Tackling: 96, Speed: 88, PhysicalContact: 92 },
    skills: ["Interception", "Man Marking", "Blocker", "Acrobatic Clearance"]
  },
  {
    id: "hernandez_t",
    fullName: "Theo Hern\xE1ndez",
    commonName: "T. Hern\xE1ndez",
    aliases: ["T. HERNANDEZ", "THEO HERNANDEZ", "T. HERN\xC1NDEZ", "HERNANDEZ", "THEO"],
    primaryPosition: "LB",
    secondaryPositions: ["LMF", "CB"],
    baseRating: 89,
    maxRating: 98,
    playstyle: "Offensive Fullback",
    club: "AC Milan",
    nationality: "France",
    cardType: "Highlight",
    keyAttributes: { Speed: 99, Acceleration: 96, PhysicalContact: 90, Stamina: 95, PinpointCrossing: 87 },
    skills: ["Double Touch", "Pinpoint Crossing", "Interception", "Fighting Spirit"]
  },
  {
    id: "walker_k",
    fullName: "Kyle Walker",
    commonName: "K. Walker",
    aliases: ["K. WALKER", "WALKER", "KYLE WALKER", "K WALKER"],
    primaryPosition: "RB",
    secondaryPositions: ["CB"],
    baseRating: 88,
    maxRating: 97,
    playstyle: "Defensive Fullback",
    club: "Manchester City",
    nationality: "England",
    cardType: "Standard",
    keyAttributes: { Speed: 98, Acceleration: 95, PhysicalContact: 92, DefensiveAwareness: 90 },
    skills: ["Man Marking", "Acrobatic Clearance", "Interception", "Fighting Spirit"]
  },
  {
    id: "robertocarlos",
    fullName: "Roberto Carlos",
    commonName: "R. Carlos",
    aliases: ["ROBERTO CARLOS", "R. CARLOS", "R CARLOS"],
    primaryPosition: "LB",
    secondaryPositions: ["LMF"],
    baseRating: 92,
    maxRating: 102,
    playstyle: "Offensive Fullback",
    club: "Epic Legends",
    nationality: "Brazil",
    cardType: "Epic",
    keyAttributes: { Speed: 98, KickingPower: 99, Stamina: 99, Curl: 95, PinpointCrossing: 92 },
    skills: ["Knuckle Shot", "Long Range Shooting", "Pinpoint Crossing", "Outside Curler"]
  },
  {
    id: "costacurta_a",
    fullName: "Alessandro Costacurta",
    commonName: "A. Costacurta",
    aliases: ["A. COSTACURTA", "COSTACURTA", "ALESSANDRO COSTACURTA"],
    primaryPosition: "LB",
    secondaryPositions: ["RB", "CB"],
    baseRating: 92,
    maxRating: 102,
    playstyle: "Defensive Fullback",
    club: "Epic Legends",
    nationality: "Italy",
    cardType: "Epic",
    keyAttributes: { DefensiveAwareness: 98, Tackling: 97, Interception: 98, Speed: 88, Stamina: 95 },
    skills: ["Man Marking", "Interception", "Blocker", "Acrobatic Clearance"]
  },
  // GOALKEEPERS
  {
    id: "courtois_t",
    fullName: "Thibaut Courtois",
    commonName: "T. Courtois",
    aliases: ["T. COURTOIS", "COURTOIS", "THIBAUT COURTOIS", "T COURTOIS"],
    primaryPosition: "GK",
    secondaryPositions: [],
    baseRating: 90,
    maxRating: 99,
    playstyle: "Defensive Goalkeeper",
    club: "Real Madrid",
    nationality: "Belgium",
    cardType: "Highlight",
    keyAttributes: { GKReach: 98, GKReflexes: 97, GKAwareness: 96, GKCatching: 93, GKParrying: 95 },
    skills: ["GK Low Punt", "Penalty Saver", "GK High Punt"]
  },
  {
    id: "cech_p",
    fullName: "Petr \u010Cech",
    commonName: "P. \u010Cech",
    aliases: ["P. CECH", "CECH", "PETR CECH", "P. \u010CECH", "\u010CECH"],
    primaryPosition: "GK",
    secondaryPositions: [],
    baseRating: 93,
    maxRating: 103,
    playstyle: "Defensive Goalkeeper",
    club: "Epic Legends",
    nationality: "Czechia",
    cardType: "Epic",
    keyAttributes: { GKReach: 99, GKReflexes: 98, GKAwareness: 97, GKCatching: 95, GKParrying: 97 },
    skills: ["GK Low Punt", "Penalty Saver", "Fighting Spirit"]
  },
  {
    id: "schmeichel_p",
    fullName: "Peter Schmeichel",
    commonName: "P. Schmeichel",
    aliases: ["P. SCHMEICHEL", "SCHMEICHEL", "PETER SCHMEICHEL"],
    primaryPosition: "GK",
    secondaryPositions: [],
    baseRating: 93,
    maxRating: 103,
    playstyle: "Defensive Goalkeeper",
    club: "Epic Legends",
    nationality: "Denmark",
    cardType: "Epic",
    keyAttributes: { GKReach: 98, GKReflexes: 99, GKAwareness: 98, GKCatching: 94, GKParrying: 98 },
    skills: ["GK Low Punt", "Penalty Saver", "Fighting Spirit", "Captaincy"]
  },
  {
    id: "saka_b",
    fullName: "Bukayo Saka",
    commonName: "B. Saka",
    aliases: ["B. SAKA", "SAKA", "BUKAYO SAKA", "B SAKA"],
    primaryPosition: "RWF",
    secondaryPositions: ["LWF", "RM", "LM"],
    baseRating: 89,
    maxRating: 99,
    playstyle: "Roaming Flank",
    club: "Arsenal",
    nationality: "England",
    cardType: "Show Time",
    keyAttributes: { Speed: 95, Acceleration: 96, Dribbling: 95, Balance: 94, Finishing: 89 },
    skills: ["Double Touch", "Long Range Curler", "First-time Shot", "Pinpoint Crossing", "Through Passing"]
  },
  {
    id: "foden_p",
    fullName: "Phil Foden",
    commonName: "P. Foden",
    aliases: ["P. FODEN", "FODEN", "PHIL FODEN", "P FODEN"],
    primaryPosition: "AMF",
    secondaryPositions: ["RWF", "LWF", "CMF", "SS"],
    baseRating: 89,
    maxRating: 99,
    playstyle: "Creative Playmaker",
    club: "Manchester City",
    nationality: "England",
    cardType: "Show Time",
    keyAttributes: { Dribbling: 96, TightPossession: 97, Balance: 96, LowPass: 92, Finishing: 90 },
    skills: ["Double Touch", "Sole Control", "First-time Shot", "Long Range Curler", "Through Passing"]
  },
  {
    id: "palmer_c",
    fullName: "Cole Palmer",
    commonName: "C. Palmer",
    aliases: ["C. PALMER", "PALMER", "COLE PALMER", "C PALMER"],
    primaryPosition: "AMF",
    secondaryPositions: ["RWF", "SS", "CMF"],
    baseRating: 89,
    maxRating: 99,
    playstyle: "Hole Player",
    club: "Chelsea",
    nationality: "England",
    cardType: "Show Time",
    keyAttributes: { Finishing: 93, PlaceKicking: 92, LowPass: 92, TightPossession: 94, Curl: 91 },
    skills: ["Sole Control", "Long Range Curler", "First-time Shot", "Through Passing", "Penalty Specialist"]
  },
  {
    id: "martinez_l",
    fullName: "Lautaro Mart\xEDnez",
    commonName: "L. Mart\xEDnez",
    aliases: ["L. MARTINEZ", "LAUTARO MARTINEZ", "LAUTARO", "L. MART\xCDNEZ", "LAUTARO MART\xCDNEZ"],
    primaryPosition: "CF",
    secondaryPositions: ["SS"],
    baseRating: 89,
    maxRating: 98,
    playstyle: "Goal Poacher",
    club: "Inter",
    nationality: "Argentina",
    cardType: "Highlight",
    keyAttributes: { OffensiveAwareness: 96, Finishing: 95, PhysicalContact: 90, Heading: 89, Balance: 90 },
    skills: ["First-time Shot", "Acrobatic Finishing", "Heading", "Fighting Spirit", "Sole Control"]
  },
  {
    id: "osimhen_v",
    fullName: "Victor Osimhen",
    commonName: "V. Osimhen",
    aliases: ["V. OSIMHEN", "OSIMHEN", "VICTOR OSIMHEN", "V OSIMHEN"],
    primaryPosition: "CF",
    secondaryPositions: [],
    baseRating: 89,
    maxRating: 98,
    playstyle: "Goal Poacher",
    club: "Galatasaray",
    nationality: "Nigeria",
    cardType: "Highlight",
    keyAttributes: { Speed: 97, Acceleration: 94, Jumping: 96, Heading: 92, Finishing: 93 },
    skills: ["Heading", "Acrobatic Finishing", "First-time Shot", "Fighting Spirit"]
  },
  {
    id: "kvaratskhelia_k",
    fullName: "Khvicha Kvaratskhelia",
    commonName: "K. Kvaratskhelia",
    aliases: ["KVARATSKHELIA", "K. KVARATSKHELIA", "KVARADONA"],
    primaryPosition: "LWF",
    secondaryPositions: ["AMF", "SS", "RWF"],
    baseRating: 88,
    maxRating: 98,
    playstyle: "Prolific Winger",
    club: "Napoli",
    nationality: "Georgia",
    cardType: "Highlight",
    keyAttributes: { Dribbling: 96, Speed: 93, Acceleration: 94, Curl: 90, Finishing: 88 },
    skills: ["Double Touch", "Flip Flap", "Sole Control", "Long Range Curler", "First-time Shot"]
  },
  {
    id: "ronaldinho_g",
    fullName: "Ronaldinho Ga\xFAcho",
    commonName: "Ronaldinho",
    aliases: ["RONALDINHO", "RONALDINHO GAUCHO", "RONALDINHO G.", "RONALDINHO GA\xDACHO"],
    primaryPosition: "LWF",
    secondaryPositions: ["AMF", "SS"],
    baseRating: 93,
    maxRating: 104,
    playstyle: "Creative Playmaker",
    club: "Epic Legends",
    nationality: "Brazil",
    cardType: "Epic",
    keyAttributes: { Dribbling: 99, TightPossession: 99, Curl: 98, Balance: 96, LowPass: 94 },
    skills: ["Flip Flap", "Double Touch", "Sole Control", "No Look Pass", "Long Range Curler", "Through Passing"]
  },
  {
    id: "romario_f",
    fullName: "Rom\xE1rio",
    commonName: "Rom\xE1rio",
    aliases: ["ROMARIO", "ROM\xC1RIO"],
    primaryPosition: "CF",
    secondaryPositions: ["SS"],
    baseRating: 93,
    maxRating: 103,
    playstyle: "Fox in the Box",
    club: "Epic Legends",
    nationality: "Brazil",
    cardType: "Epic",
    keyAttributes: { OffensiveAwareness: 98, Finishing: 99, Acceleration: 96, Balance: 96, TightPossession: 95 },
    skills: ["First-time Shot", "Sole Control", "Double Touch", "Outside Curler", "Acrobatic Finishing"]
  },
  {
    id: "beckham_d",
    fullName: "David Beckham",
    commonName: "D. Beckham",
    aliases: ["D. BECKHAM", "BECKHAM", "DAVID BECKHAM"],
    primaryPosition: "RWF",
    secondaryPositions: ["CMF", "AMF", "DMF"],
    baseRating: 92,
    maxRating: 103,
    playstyle: "Cross Specialist",
    club: "Epic Legends",
    nationality: "England",
    cardType: "Epic",
    keyAttributes: { LoftedPass: 99, PlaceKicking: 99, Curl: 99, LowPass: 94, Stamina: 96 },
    skills: ["Pinpoint Crossing", "Weighted Pass", "Long Range Shooting", "Through Passing", "Outside Curler"]
  },
  {
    id: "barella_n",
    fullName: "Nicol\xF2 Barella",
    commonName: "N. Barella",
    aliases: ["N. BARELLA", "BARELLA", "NICOLO BARELLA", "NICOL\xD2 BARELLA"],
    primaryPosition: "CMF",
    secondaryPositions: ["AMF", "DMF"],
    baseRating: 89,
    maxRating: 98,
    playstyle: "Box-to-Box",
    club: "Inter",
    nationality: "Italy",
    cardType: "Highlight",
    keyAttributes: { Stamina: 98, Balance: 94, LowPass: 92, DefensiveAwareness: 86, Speed: 88 },
    skills: ["One-touch Pass", "Through Passing", "Interception", "Fighting Spirit", "Double Touch"]
  },
  {
    id: "camavinga_e",
    fullName: "Eduardo Camavinga",
    commonName: "E. Camavinga",
    aliases: ["E. CAMAVINGA", "CAMAVINGA", "EDUARDO CAMAVINGA"],
    primaryPosition: "CMF",
    secondaryPositions: ["DMF", "LB"],
    baseRating: 88,
    maxRating: 98,
    playstyle: "Box-to-Box",
    club: "Real Madrid",
    nationality: "France",
    cardType: "Highlight",
    keyAttributes: { Tackling: 92, PhysicalContact: 90, LowPass: 91, Speed: 88, Stamina: 94 },
    skills: ["Interception", "One-touch Pass", "Double Touch", "Blocker", "Fighting Spirit"]
  },
  {
    id: "tchouameni_a",
    fullName: "Aur\xE9lien Tchouam\xE9ni",
    commonName: "A. Tchouam\xE9ni",
    aliases: ["A. TCHOUAMENI", "TCHOUAMENI", "AURELIEN TCHOUAMENI", "A. TCHOUAM\xC9NI", "TCHOUAM\xC9NI"],
    primaryPosition: "DMF",
    secondaryPositions: ["CMF", "CB"],
    baseRating: 88,
    maxRating: 98,
    playstyle: "Anchor Man",
    club: "Real Madrid",
    nationality: "France",
    cardType: "Highlight",
    keyAttributes: { DefensiveAwareness: 94, Tackling: 95, PhysicalContact: 95, Interception: 96, LowPass: 89 },
    skills: ["Interception", "Blocker", "Aerial Superiority", "Man Marking", "One-touch Pass"]
  },
  {
    id: "bastoni_a",
    fullName: "Alessandro Bastoni",
    commonName: "A. Bastoni",
    aliases: ["A. BASTONI", "BASTONI", "ALESSANDRO BASTONI"],
    primaryPosition: "CB",
    secondaryPositions: ["LB"],
    baseRating: 89,
    maxRating: 98,
    playstyle: "Build Up",
    club: "Inter",
    nationality: "Italy",
    cardType: "Show Time",
    keyAttributes: { DefensiveAwareness: 96, Tackling: 96, LoftedPass: 92, LowPass: 90, PhysicalContact: 92 },
    skills: ["Interception", "Man Marking", "Blocker", "Pinpoint Crossing", "Weighted Pass"]
  },
  {
    id: "gabriel_m",
    fullName: "Gabriel Magalh\xE3es",
    commonName: "Gabriel",
    aliases: ["GABRIEL", "GABRIEL MAGALHAES", "G. MAGALHAES", "GABRIEL MAGALH\xC3ES"],
    primaryPosition: "CB",
    secondaryPositions: [],
    baseRating: 88,
    maxRating: 97,
    playstyle: "The Destroyer",
    club: "Arsenal",
    nationality: "Brazil",
    cardType: "Highlight",
    keyAttributes: { DefensiveAwareness: 96, PhysicalContact: 96, Heading: 94, Tackling: 95, Aggression: 96 },
    skills: ["Aerial Superiority", "Man Marking", "Interception", "Blocker", "Heading"]
  },
  {
    id: "dias_r",
    fullName: "R\xFAben Dias",
    commonName: "R. Dias",
    aliases: ["R. DIAS", "RUBEN DIAS", "DIAS", "R\xDABEN DIAS"],
    primaryPosition: "CB",
    secondaryPositions: [],
    baseRating: 89,
    maxRating: 98,
    playstyle: "The Destroyer",
    club: "Manchester City",
    nationality: "Portugal",
    cardType: "Highlight",
    keyAttributes: { DefensiveAwareness: 97, Tackling: 97, PhysicalContact: 96, Aggression: 95 },
    skills: ["Man Marking", "Interception", "Blocker", "Aerial Superiority", "Captaincy"]
  },
  {
    id: "gvardiol_j",
    fullName: "Jo\u0161ko Gvardiol",
    commonName: "J. Gvardiol",
    aliases: ["J. GVARDIOL", "GVARDIOL", "JOSKO GVARDIOL", "JO\u0160KO GVARDIOL"],
    primaryPosition: "LB",
    secondaryPositions: ["CB"],
    baseRating: 88,
    maxRating: 98,
    playstyle: "Extra Frontman",
    club: "Manchester City",
    nationality: "Croatia",
    cardType: "Highlight",
    keyAttributes: { DefensiveAwareness: 94, Tackling: 95, Speed: 90, PhysicalContact: 93, LowPass: 88 },
    skills: ["Interception", "Man Marking", "Blocker", "Acrobatic Clearance"]
  },
  {
    id: "dimarco_f",
    fullName: "Federico Dimarco",
    commonName: "F. Dimarco",
    aliases: ["F. DIMARCO", "DIMARCO", "FEDERICO DIMARCO"],
    primaryPosition: "LB",
    secondaryPositions: ["LMF", "CB"],
    baseRating: 88,
    maxRating: 97,
    playstyle: "Cross Specialist",
    club: "Inter",
    nationality: "Italy",
    cardType: "Highlight",
    keyAttributes: { LoftedPass: 96, PinpointCrossing: 97, Curl: 94, Speed: 88, KickingPower: 92 },
    skills: ["Pinpoint Crossing", "Long Range Curler", "Weighted Pass", "One-touch Pass"]
  },
  {
    id: "frimpong_j",
    fullName: "Jeremie Frimpong",
    commonName: "J. Frimpong",
    aliases: ["J. FRIMPONG", "FRIMPONG", "JEREMIE FRIMPONG"],
    primaryPosition: "RB",
    secondaryPositions: ["RMF", "RWF"],
    baseRating: 88,
    maxRating: 98,
    playstyle: "Offensive Fullback",
    club: "Bayer Leverkusen",
    nationality: "Netherlands",
    cardType: "Highlight",
    keyAttributes: { Speed: 99, Acceleration: 99, Dribbling: 92, Balance: 95, Stamina: 94 },
    skills: ["Double Touch", "Sole Control", "Pinpoint Crossing", "Fighting Spirit"]
  },
  {
    id: "alexanderarnold_t",
    fullName: "Trent Alexander-Arnold",
    commonName: "T. Alexander-Arnold",
    aliases: ["T. ALEXANDER-ARNOLD", "ALEXANDER-ARNOLD", "TRENT", "TRENT ALEXANDER-ARNOLD", "TAA"],
    primaryPosition: "RB",
    secondaryPositions: ["RMF", "CMF", "DMF"],
    baseRating: 89,
    maxRating: 98,
    playstyle: "Cross Specialist",
    club: "Liverpool",
    nationality: "England",
    cardType: "Show Time",
    keyAttributes: { LoftedPass: 99, PinpointCrossing: 99, PlaceKicking: 95, Curl: 94, LowPass: 93 },
    skills: ["Pinpoint Crossing", "Weighted Pass", "Low Lofted Pass", "Outside Curler", "Through Passing"]
  },
  {
    id: "donnarumma_g",
    fullName: "Gianluigi Donnarumma",
    commonName: "G. Donnarumma",
    aliases: ["G. DONNARUMMA", "DONNARUMMA", "GIANLUIGI DONNARUMMA"],
    primaryPosition: "GK",
    secondaryPositions: [],
    baseRating: 89,
    maxRating: 98,
    playstyle: "Defensive Goalkeeper",
    club: "Paris Saint-Germain",
    nationality: "Italy",
    cardType: "Highlight",
    keyAttributes: { GKReach: 99, GKReflexes: 98, GKAwareness: 96, GKParrying: 95 },
    skills: ["GK Low Punt", "Penalty Saver"]
  },
  {
    id: "maignan_m",
    fullName: "Mike Maignan",
    commonName: "M. Maignan",
    aliases: ["M. MAIGNAN", "MAIGNAN", "MIKE MAIGNAN"],
    primaryPosition: "GK",
    secondaryPositions: [],
    baseRating: 89,
    maxRating: 98,
    playstyle: "Offensive Goalkeeper",
    club: "AC Milan",
    nationality: "France",
    cardType: "Highlight",
    keyAttributes: { GKReflexes: 97, GKReach: 96, GKAwareness: 96, GKCatching: 94 },
    skills: ["GK Low Punt", "Penalty Saver", "GK High Punt"]
  },
  {
    id: "ederson_m",
    fullName: "Ederson",
    commonName: "Ederson",
    aliases: ["EDERSON", "EDERSON MORAES", "E. MORAES"],
    primaryPosition: "GK",
    secondaryPositions: [],
    baseRating: 89,
    maxRating: 98,
    playstyle: "Offensive Goalkeeper",
    club: "Manchester City",
    nationality: "Brazil",
    cardType: "Highlight",
    keyAttributes: { LowPass: 88, LoftedPass: 92, KickingPower: 96, GKReflexes: 96, GKReach: 95 },
    skills: ["GK Low Punt", "Weighted Pass", "Low Lofted Pass"]
  },
  {
    id: "neuer_m",
    fullName: "Manuel Neuer",
    commonName: "M. Neuer",
    aliases: ["M. NEUER", "NEUER", "MANUEL NEUER"],
    primaryPosition: "GK",
    secondaryPositions: [],
    baseRating: 89,
    maxRating: 98,
    playstyle: "Offensive Goalkeeper",
    club: "Bayern M\xFCnchen",
    nationality: "Germany",
    cardType: "Highlight",
    keyAttributes: { GKReflexes: 97, GKReach: 96, GKAwareness: 97, GKCatching: 94 },
    skills: ["GK Low Punt", "GK High Punt", "Penalty Saver"]
  },
  {
    id: "terstegen_m",
    fullName: "Marc-Andr\xE9 ter Stegen",
    commonName: "M. ter Stegen",
    aliases: ["TER STEGEN", "M. TER STEGEN", "MARC-ANDRE TER STEGEN", "MARC-ANDR\xC9 TER STEGEN"],
    primaryPosition: "GK",
    secondaryPositions: [],
    baseRating: 89,
    maxRating: 98,
    playstyle: "Offensive Goalkeeper",
    club: "FC Barcelona",
    nationality: "Germany",
    cardType: "Highlight",
    keyAttributes: { GKReflexes: 98, GKReach: 96, GKAwareness: 96, GKParrying: 95 },
    skills: ["GK Low Punt", "Penalty Saver"]
  },
  {
    id: "alisson_b",
    fullName: "Alisson Becker",
    commonName: "Alisson",
    aliases: ["ALISSON", "ALISSON BECKER", "A. BECKER"],
    primaryPosition: "GK",
    secondaryPositions: [],
    baseRating: 89,
    maxRating: 98,
    playstyle: "Offensive Goalkeeper",
    club: "Liverpool",
    nationality: "Brazil",
    cardType: "Highlight",
    keyAttributes: { GKReflexes: 97, GKReach: 96, GKAwareness: 96, GKParrying: 95 },
    skills: ["GK Low Punt", "Penalty Saver"]
  },
  {
    id: "vitinha_v",
    fullName: "V\xEDtor Machado Ferreira",
    commonName: "Vitinha",
    aliases: ["VITINHA", "V. FERREIRA", "VITOR FERREIRA", "VITOR MACHADO", "V. MACHADO"],
    primaryPosition: "CMF",
    secondaryPositions: ["AMF", "DMF"],
    baseRating: 90,
    maxRating: 101,
    playstyle: "Orchestrator",
    club: "Paris Saint-Germain",
    nationality: "Portugal",
    cardType: "Highlight",
    keyAttributes: { LowPass: 95, LoftedPass: 92, TightPossession: 96, Dribbling: 93, Balance: 92, Stamina: 94 },
    skills: ["One-touch Pass", "Through Passing", "Double Touch", "Sole Control", "Weighted Pass", "Outside Curler"]
  },
  {
    id: "scholes_p",
    fullName: "Paul Scholes",
    commonName: "P. Scholes",
    aliases: ["P. SCHOLES", "SCHOLES", "PAUL SCHOLES", "P SCHOLES"],
    primaryPosition: "CMF",
    secondaryPositions: ["AMF", "DMF"],
    baseRating: 93,
    maxRating: 104,
    playstyle: "Orchestrator",
    club: "Manchester United",
    nationality: "England",
    cardType: "Epic",
    keyAttributes: { KickingPower: 99, LoftedPass: 98, LowPass: 96, Finishing: 92, LongRangeShooting: 98, Stamina: 90 },
    skills: ["Long Range Shooting", "Dipping Shot", "Weighted Pass", "Through Passing", "One-touch Pass", "Pinpoint Crossing"]
  },
  {
    id: "mac_allister_a",
    fullName: "Alexis Mac Allister",
    commonName: "A. Mac Allister",
    aliases: ["A. MAC ALLISTER", "MAC ALLISTER", "ALLISTER", "ALEXIS MAC ALLISTER", "A MAC ALLISTER"],
    primaryPosition: "CMF",
    secondaryPositions: ["AMF", "DMF"],
    baseRating: 91,
    maxRating: 103,
    playstyle: "Orchestrator",
    club: "Liverpool",
    nationality: "Argentina",
    cardType: "Highlight",
    keyAttributes: { LowPass: 94, LoftedPass: 90, TightPossession: 93, Balance: 90, Interception: 85, Stamina: 93 },
    skills: ["One-touch Pass", "Through Passing", "Interception", "Long Range Shooting", "Sole Control"]
  },
  {
    id: "nunez_d",
    fullName: "Darwin N\xFA\xF1ez",
    commonName: "D. N\xFA\xF1ez",
    aliases: ["D. NUNEZ", "NUNEZ", "DARWIN NUNEZ", "D. N\xDA\xD1EZ", "DARWIN N\xDA\xD1EZ", "D NUNEZ"],
    primaryPosition: "CF",
    secondaryPositions: ["LWF", "SS", "RWF"],
    baseRating: 91,
    maxRating: 103,
    playstyle: "Goal Poacher",
    club: "Liverpool",
    nationality: "Uruguay",
    cardType: "Highlight",
    keyAttributes: { Speed: 97, Acceleration: 94, PhysicalContact: 93, Finishing: 92, Heading: 88, OffensiveAwareness: 94 },
    skills: ["First-time Shot", "Heading", "Acrobatic Finishing", "Fighting Spirit", "Speeding Bullet"]
  },
  {
    id: "rijkaard_f",
    fullName: "Frank Rijkaard",
    commonName: "F. Rijkaard",
    aliases: ["F. RIJKAARD", "RIJKAARD", "FRANK RIJKAARD", "F RIJKAARD"],
    primaryPosition: "DMF",
    secondaryPositions: ["CB", "CMF"],
    baseRating: 93,
    maxRating: 102,
    playstyle: "The Destroyer",
    club: "AC Milan",
    nationality: "Netherlands",
    cardType: "Epic",
    keyAttributes: { DefensiveAwareness: 98, Tackling: 97, Aggression: 96, PhysicalContact: 95, LowPass: 88, Heading: 90 },
    skills: ["Interception", "Blocker", "Aerial Superiority", "One-touch Pass", "Man Marking", "Fighting Spirit"]
  },
  {
    id: "marquez_r",
    fullName: "Rafael M\xE1rquez",
    commonName: "R. M\xE1rquez",
    aliases: ["R. MARQUEZ", "MARQUEZ", "RAFAEL MARQUEZ", "R. M\xC1RQUEZ", "RAFAEL M\xC1RQUEZ", "R MARQUEZ"],
    primaryPosition: "CB",
    secondaryPositions: ["DMF"],
    baseRating: 91,
    maxRating: 99,
    playstyle: "Build Up",
    club: "FC Barcelona",
    nationality: "Mexico",
    cardType: "Epic",
    keyAttributes: { DefensiveAwareness: 96, Tackling: 95, LoftedPass: 94, Heading: 90, PhysicalContact: 91, Interception: 94 },
    skills: ["Interception", "Man Marking", "Weighted Pass", "Aerial Superiority", "Blocker", "Captaincy"]
  },
  {
    id: "alaba_d",
    fullName: "David Alaba",
    commonName: "D. Alaba",
    aliases: ["D. ALABA", "ALABA", "DAVID ALABA", "D ALABA"],
    primaryPosition: "CB",
    secondaryPositions: ["LB", "DMF", "CMF"],
    baseRating: 91,
    maxRating: 102,
    playstyle: "Build Up",
    club: "Real Madrid",
    nationality: "Austria",
    cardType: "Highlight",
    keyAttributes: { LowPass: 92, LoftedPass: 91, DefensiveAwareness: 94, Tackling: 93, PlaceKicking: 89, Speed: 88 },
    skills: ["Interception", "Pinpoint Crossing", "Through Passing", "Long Range Curler", "Man Marking"]
  },
  {
    id: "mendes_n",
    fullName: "Nuno Mendes",
    commonName: "N. Mendes",
    aliases: ["N. MENDES", "MENDES", "NUNO MENDES", "N MENDES"],
    primaryPosition: "LB",
    secondaryPositions: ["LWB", "LMF"],
    baseRating: 90,
    maxRating: 101,
    playstyle: "Offensive Fullback",
    club: "Paris Saint-Germain",
    nationality: "Portugal",
    cardType: "Highlight",
    keyAttributes: { Speed: 98, Acceleration: 97, PinpointCrossing: 90, Dribbling: 88, Stamina: 94, Tackling: 86 },
    skills: ["Pinpoint Crossing", "Double Touch", "Interception", "Acrobatic Clearance", "Speeding Bullet"]
  },
  {
    id: "hakimi_a",
    fullName: "Achraf Hakimi",
    commonName: "A. Hakimi",
    aliases: ["A. HAKIMI", "HAKIMI", "ACHRAF HAKIMI", "A HAKIMI"],
    primaryPosition: "RB",
    secondaryPositions: ["RWB", "RMF"],
    baseRating: 90,
    maxRating: 100,
    playstyle: "Offensive Fullback",
    club: "Paris Saint-Germain",
    nationality: "Morocco",
    cardType: "Highlight",
    keyAttributes: { Speed: 99, Acceleration: 98, Stamina: 95, PinpointCrossing: 88, Dribbling: 87, Finishing: 82 },
    skills: ["Pinpoint Crossing", "Outside Curler", "Double Touch", "Speeding Bullet", "Interception"]
  },
  {
    id: "peruzzi_a",
    fullName: "Angelo Peruzzi",
    commonName: "A. Peruzzi",
    aliases: ["A. PERUZZI", "PERUZZI", "ANGELO PERUZZI", "M. PERUZZI", "MATTIA PERUZZI"],
    primaryPosition: "GK",
    secondaryPositions: [],
    baseRating: 92,
    maxRating: 103,
    playstyle: "Defensive Goalkeeper",
    club: "Lazio",
    nationality: "Italy",
    cardType: "Epic",
    keyAttributes: { GKAwareness: 98, GKReflexes: 99, GKReach: 96, GKParrying: 97, PhysicalContact: 94 },
    skills: ["GK Low Punt", "Penalty Saver", "Captaincy", "Fighting Spirit"]
  }
];
function normalizeString(str) {
  if (!str) return "";
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9\s]/g, " ").replace(/\s+/g, " ").trim().toUpperCase();
}
function getAllEfhubCardsForPlayer(query) {
  const clean = normalizeString(query.trim());
  const baseMatches = !clean ? EFOOTBALL_MASTER_PLAYERS : EFOOTBALL_MASTER_PLAYERS.filter((player) => {
    const normName = normalizeString(player.fullName);
    const normCommon = normalizeString(player.commonName);
    const normClub = normalizeString(player.club);
    const normNat = normalizeString(player.nationality);
    if (normName.includes(clean) || normCommon.includes(clean) || normClub.includes(clean) || normNat.includes(clean)) {
      return true;
    }
    return player.aliases.some((a) => normalizeString(a).includes(clean));
  });
  const allCards = [];
  const generateFullAttributes = (pos, rating, keyAttrs = {}) => {
    const isAttacker = ["CF", "SS", "LWF", "RWF"].includes(pos);
    const isMidfielder = ["AMF", "CMF", "DMF", "LMF", "RMF"].includes(pos);
    const isDefender = ["CB", "LB", "RB", "LWB", "RWB"].includes(pos);
    const isGK = pos === "GK";
    const baseline = Math.min(99, Math.max(65, Math.round(rating * 0.88)));
    const attrs = {
      OffensiveAwareness: isAttacker ? Math.min(99, baseline + 12) : isMidfielder ? baseline + 5 : baseline - 10,
      BallControl: isAttacker || isMidfielder ? Math.min(99, baseline + 10) : baseline,
      Dribbling: isAttacker || isMidfielder ? Math.min(99, baseline + 11) : baseline - 5,
      TightPossession: isAttacker || isMidfielder ? Math.min(99, baseline + 10) : baseline - 5,
      LowPass: isMidfielder ? Math.min(99, baseline + 12) : isAttacker ? baseline + 5 : baseline - 2,
      LoftedPass: isMidfielder ? Math.min(99, baseline + 10) : baseline,
      Finishing: isAttacker ? Math.min(99, baseline + 14) : isMidfielder ? baseline + 3 : baseline - 15,
      Heading: isDefender || pos === "CF" ? Math.min(99, baseline + 10) : baseline - 5,
      PlaceKicking: isAttacker || isMidfielder ? baseline + 4 : baseline - 10,
      Curl: isAttacker || isMidfielder ? baseline + 8 : baseline - 8,
      Speed: isAttacker || pos === "LB" || pos === "RB" ? Math.min(99, baseline + 12) : baseline + 2,
      Acceleration: isAttacker || pos === "LB" || pos === "RB" ? Math.min(99, baseline + 13) : baseline + 2,
      KickingPower: baseline + 6,
      Jumping: isDefender || pos === "CF" || isGK ? baseline + 8 : baseline,
      PhysicalContact: isDefender || pos === "CF" ? Math.min(99, baseline + 12) : baseline - 2,
      Balance: isAttacker || isMidfielder ? Math.min(99, baseline + 10) : baseline - 5,
      Stamina: isMidfielder || pos === "LB" || pos === "RB" ? Math.min(99, baseline + 12) : baseline + 4,
      DefensiveAwareness: isDefender ? Math.min(99, baseline + 14) : pos === "DMF" ? Math.min(99, baseline + 10) : baseline - 20,
      Tackling: isDefender ? Math.min(99, baseline + 14) : pos === "DMF" ? Math.min(99, baseline + 10) : baseline - 20,
      Aggression: isDefender || pos === "DMF" ? Math.min(99, baseline + 12) : baseline - 10,
      DefensiveEngagement: isDefender || pos === "DMF" ? Math.min(99, baseline + 12) : baseline - 15
    };
    if (isGK) {
      attrs.GKAwareness = Math.min(99, baseline + 15);
      attrs.GKCatching = Math.min(99, baseline + 12);
      attrs.GKParrying = Math.min(99, baseline + 13);
      attrs.GKReflexes = Math.min(99, baseline + 16);
      attrs.GKReach = Math.min(99, baseline + 15);
    }
    return { ...attrs, ...keyAttrs };
  };
  baseMatches.forEach((bp) => {
    const name = bp.fullName;
    const common = bp.commonName;
    const pos = bp.primaryPosition;
    const sec = bp.secondaryPositions || [];
    const club = bp.club;
    const nat = bp.nationality;
    const style = bp.playstyle;
    const skills = bp.skills || [];
    allCards.push({
      id: `${bp.id}_bt`,
      fullName: name,
      commonName: common,
      aliases: bp.aliases,
      primaryPosition: pos,
      secondaryPositions: sec,
      baseRating: 93,
      maxRating: Math.max(102, bp.maxRating),
      playstyle: style,
      club,
      nationality: nat,
      cardType: "Big Time",
      cardTitle: `${nat || club} World Championship Big Time Edition`,
      boosterName: "\u26A1 Agility & Technique +2 Booster",
      keyAttributes: generateFullAttributes(pos, Math.max(102, bp.maxRating), bp.keyAttributes),
      skills: Array.from(/* @__PURE__ */ new Set([...skills, "Double Touch", "First-time Shot", "One-touch Pass"])),
      efhubUrl: `https://efhub.com/25/players/${bp.id}_bt/`
    });
    allCards.push({
      id: `${bp.id}_epic`,
      fullName: name,
      commonName: common,
      aliases: bp.aliases,
      primaryPosition: pos,
      secondaryPositions: sec,
      baseRating: 92,
      maxRating: Math.max(101, bp.maxRating - 1),
      playstyle: style,
      club,
      nationality: nat,
      cardType: "Epic",
      cardTitle: `${club} Historic Epic Special Edition`,
      boosterName: "\u{1F31F} Visionary Pass +2 Booster",
      keyAttributes: generateFullAttributes(pos, Math.max(101, bp.maxRating - 1), bp.keyAttributes),
      skills: Array.from(/* @__PURE__ */ new Set([...skills, "Through Passing", "Outside Curler"])),
      efhubUrl: `https://efhub.com/25/players/${bp.id}_epic/`
    });
    allCards.push({
      id: `${bp.id}_showtime`,
      fullName: name,
      commonName: common,
      aliases: bp.aliases,
      primaryPosition: pos,
      secondaryPositions: sec,
      baseRating: 91,
      maxRating: Math.max(100, bp.maxRating - 2),
      playstyle: style,
      club,
      nationality: nat,
      cardType: "Show Time",
      cardTitle: `Phenomenal Performance Show Time Edition`,
      boosterName: "\u2728 Game Changing Pass +2",
      keyAttributes: generateFullAttributes(pos, Math.max(100, bp.maxRating - 2), bp.keyAttributes),
      skills: Array.from(/* @__PURE__ */ new Set([...skills, "Sole Control", "Pinpoint Crossing"])),
      efhubUrl: `https://efhub.com/25/players/${bp.id}_st/`
    });
    allCards.push({
      id: `${bp.id}_highlight`,
      fullName: name,
      commonName: common,
      aliases: bp.aliases,
      primaryPosition: pos,
      secondaryPositions: sec,
      baseRating: 90,
      maxRating: Math.max(98, bp.maxRating - 3),
      playstyle: style,
      club,
      nationality: nat,
      cardType: "Highlight",
      cardTitle: `${club} Highlight Selection`,
      keyAttributes: generateFullAttributes(pos, Math.max(98, bp.maxRating - 3), bp.keyAttributes),
      skills,
      efhubUrl: `https://efhub.com/25/players/${bp.id}_hl/`
    });
    allCards.push({
      id: `${bp.id}_potw`,
      fullName: name,
      commonName: common,
      aliases: bp.aliases,
      primaryPosition: pos,
      secondaryPositions: sec,
      baseRating: 89,
      maxRating: Math.max(97, bp.maxRating - 4),
      playstyle: style,
      club,
      nationality: nat,
      cardType: "POTW",
      cardTitle: `Player of the Week (POTW Special Edition)`,
      keyAttributes: generateFullAttributes(pos, Math.max(97, bp.maxRating - 4), bp.keyAttributes),
      skills,
      efhubUrl: `https://efhub.com/25/players/${bp.id}_potw/`
    });
    allCards.push({
      id: `${bp.id}_standard`,
      fullName: name,
      commonName: common,
      aliases: bp.aliases,
      primaryPosition: pos,
      secondaryPositions: sec,
      baseRating: bp.baseRating || 88,
      maxRating: Math.max(92, bp.maxRating - 7),
      playstyle: style,
      club,
      nationality: nat,
      cardType: "Standard",
      cardTitle: `Standard Base Card`,
      keyAttributes: generateFullAttributes(pos, Math.max(92, bp.maxRating - 7), bp.keyAttributes),
      skills: skills.slice(0, 4),
      efhubUrl: `https://efhub.com/25/players/${bp.id}_std/`
    });
  });
  if (allCards.length === 0 && clean.length >= 2) {
    const formattedQuery = query.trim().split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    const commonQuery = formattedQuery.length > 10 ? formattedQuery.charAt(0) + ". " + formattedQuery.split(" ").pop() : formattedQuery;
    let detectedPos = "CF";
    if (clean.includes("gk") || clean.includes("keeper") || clean.includes("goal")) detectedPos = "GK";
    else if (clean.includes("cb") || clean.includes("defender") || clean.includes("back")) detectedPos = "CB";
    else if (clean.includes("lb") || clean.includes("left back")) detectedPos = "LB";
    else if (clean.includes("rb") || clean.includes("right back")) detectedPos = "RB";
    else if (clean.includes("dmf") || clean.includes("anchor")) detectedPos = "DMF";
    else if (clean.includes("cmf") || clean.includes("midfield")) detectedPos = "CMF";
    else if (clean.includes("amf") || clean.includes("playmaker")) detectedPos = "AMF";
    else if (clean.includes("lwf") || clean.includes("left wing")) detectedPos = "LWF";
    else if (clean.includes("rwf") || clean.includes("right wing")) detectedPos = "RWF";
    const cardVariants = [
      { type: "Show Time", title: "Phenomenal Show Time Edition", maxRating: 101, baseRating: 91, booster: "\u26A1 Agility & Technique +2" },
      { type: "Epic", title: "Historic Epic Special Card", maxRating: 100, baseRating: 90, booster: "\u{1F31F} Visionary Pass +2" },
      { type: "Highlight", title: "Club Highlight Selection", maxRating: 98, baseRating: 89 },
      { type: "POTW", title: "Player of the Week (POTW Edition)", maxRating: 97, baseRating: 88 },
      { type: "Standard", title: "Standard Player Card", maxRating: 93, baseRating: 84 }
    ];
    cardVariants.forEach((v, i) => {
      allCards.push({
        id: `dyn_${clean}_${i}`,
        fullName: formattedQuery,
        commonName: commonQuery,
        aliases: [clean.toUpperCase(), formattedQuery.toUpperCase()],
        primaryPosition: detectedPos,
        secondaryPositions: detectedPos === "CF" ? ["SS", "LWF"] : detectedPos === "CB" ? ["RB"] : ["CMF"],
        baseRating: v.baseRating,
        maxRating: v.maxRating,
        playstyle: detectedPos === "CF" ? "Goal Poacher" : detectedPos === "CB" ? "Build Up" : "Hole Player",
        club: "eFootball Club",
        nationality: "International",
        cardType: v.type,
        cardTitle: v.title,
        boosterName: v.booster,
        keyAttributes: generateFullAttributes(detectedPos, v.maxRating),
        skills: ["Double Touch", "First-time Shot", "One-touch Pass", "Through Passing", "Fighting Spirit"],
        efhubUrl: `https://efhub.com/25/players/${clean}_${i}/`
      });
    });
  }
  return allCards.sort((a, b) => b.maxRating - a.maxRating);
}

// server/serverless/efhubPlayer.ts
async function handler(req, res) {
  try {
    const input = req.query.id || req.query.url;
    if (!input) {
      return res.status(400).json({ error: "Player ID or URL is required." });
    }
    let targetUrl = input;
    if (!input.startsWith("http://") && !input.startsWith("https://")) {
      targetUrl = `https://efhub.com/players/${input}`;
    }
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
      }
    });
    if (!response.ok) {
      return res.status(404).json({ error: `eFHUB returned status ${response.status}` });
    }
    const html = await response.text();
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    const imgMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    let name = "Unknown Player";
    let rating = 90;
    let position = "CF";
    let playstyle = "Goal Poacher";
    if (titleMatch) {
      const parts = titleMatch[1].split("\u2014");
      if (parts[0]) name = parts[0].trim();
      if (parts[1]) {
        const ovrMatch = parts[1].match(/(\d+)\s*OVR/i);
        if (ovrMatch) rating = parseInt(ovrMatch[1], 10);
      }
    }
    if (descMatch) {
      const desc = descMatch[1];
      const mRate = desc.match(/is a (\d+)-rated/i);
      if (mRate) rating = parseInt(mRate[1], 10);
      const mPos = desc.match(/rated ([A-Z]{2,3}) in eFootball/i);
      if (mPos) position = mPos[1].toUpperCase();
      const mStyle = desc.match(/Playing style:\s*([^.]+)\./i);
      if (mStyle) playstyle = mStyle[1].trim();
    }
    const matched = EFOOTBALL_MASTER_PLAYERS.find(
      (p) => normalizeString(p.fullName) === normalizeString(name) || normalizeString(p.commonName) === normalizeString(name) || p.aliases.some((a) => normalizeString(a) === normalizeString(name))
    );
    const generated = getAllEfhubCardsForPlayer(name);
    const chosen = generated.find((c) => c.primaryPosition === position) || generated[0] || {
      id: `efhub_${Date.now()}`,
      fullName: name,
      commonName: name,
      aliases: [name.toUpperCase()],
      primaryPosition: position,
      secondaryPositions: position === "CF" ? ["SS"] : position === "CB" ? ["RB"] : ["CMF"],
      baseRating: Math.max(70, rating - 8),
      maxRating: rating,
      playstyle,
      club: matched?.club || "eFootball Club",
      nationality: matched?.nationality || "International",
      cardType: rating >= 102 ? "Big Time" : rating >= 100 ? "Epic" : rating >= 98 ? "Show Time" : rating >= 95 ? "Highlight" : "Standard",
      cardTitle: `${name} Official eFHUB Card`,
      keyAttributes: {},
      skills: matched?.skills || ["Double Touch", "First-time Shot", "One-touch Pass"],
      efhubUrl: targetUrl
    };
    const finalPlayer = {
      ...chosen,
      fullName: name,
      commonName: name,
      primaryPosition: position,
      maxRating: rating,
      playstyle: playstyle || chosen.playstyle,
      efhubUrl: targetUrl,
      imageUrl: imgMatch ? imgMatch[1] : void 0
    };
    return res.status(200).json({ success: true, player: finalPlayer });
  } catch (err) {
    console.error("Error in efhubPlayer serverless handler:", err);
    return res.status(500).json({ error: err?.message || "Failed to fetch player data" });
  }
}
export {
  handler as default
};
