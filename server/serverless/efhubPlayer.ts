import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  EFOOTBALL_MASTER_PLAYERS,
  normalizeString,
  getAllEfhubCardsForPlayer
} from '../../src/lib/efootballDatabase.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const input = ((req.query.id || req.query.url || '') as string).trim();
    if (!input) {
      return res.status(400).json({ error: 'Player ID or efHUB URL is required.' });
    }

    let targetUrl = input;
    // Canonicalize numeric ID (e.g. 88046292727298) or URL with numeric ID
    const numIdMatch = input.match(/\b(\d{7,16})\b/);
    if (numIdMatch && numIdMatch[1]) {
      targetUrl = `https://efhub.com/players/${numIdMatch[1]}`;
    } else if (!input.startsWith('http://') && !input.startsWith('https://')) {
      targetUrl = `https://efhub.com/players/${encodeURIComponent(input)}`;
    }

    // Extract potential player slug or ID from URL
    let slugName = '';
    try {
      const decodedTarget = decodeURIComponent(targetUrl);
      const urlSlugMatch = decodedTarget.match(/\/(?:players|player)\/(?:[0-9]+\/)?([a-zA-Z0-9_\-\s]+)/i);
      if (urlSlugMatch && urlSlugMatch[1] && !/^\d+$/.test(urlSlugMatch[1])) {
        slugName = urlSlugMatch[1].replace(/[-_]+/g, ' ').trim();
      }
    } catch (e) {}

    let html = '';
    try {
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });
      if (response.ok) {
        html = await response.text();
      }
    } catch (fetchErr) {
      console.warn('Direct fetch error for player URL, using slug/database fallback:', fetchErr);
    }

    let name = slugName || 'Unknown Player';
    let maxRating = 90;
    let baseRating = 85;
    let position = 'CF';
    let playstyle = 'Goal Poacher';
    let cardType = 'Highlight';
    let club = 'eFootball Club';
    let nationality = 'International';
    let skills: string[] = [];
    let secondaryPositions: string[] = [];
    const keyAttributes: Record<string, number> = {};

    // 1. Next.js App Router RSC stream parsing (efhub.com)
    const EFHUB_SKILL_MAP: Record<string, string> = {
      doubleTouch: 'Double Touch',
      flipFlap: 'Flip Flap',
      marseilleTurn: 'Marseille Turn',
      sombrero: 'Sombrero',
      crossOverTurn: 'Cross Over Turn',
      cutBehindAndTurn: 'Cut Behind & Turn',
      scotchMove: 'Scotch Move',
      stepOnSkillControl: 'Sole Control',
      heading: 'Heading',
      longRangeShooting: 'Long-Range Shooting',
      chipShotControl: 'Chip Shot Control',
      longRangeCurler: 'Long-Range Curler',
      knuckleShot: 'Knuckle Shot',
      dippingShot: 'Dipping Shot',
      risingShot: 'Rising Shot',
      acrobaticFinishing: 'Acrobatic Finishing',
      heelTrick: 'Heel Trick',
      firstTimeShot: 'First-time Shot',
      oneTouchPass: 'One-touch Pass',
      throughPassing: 'Through Passing',
      weightedPass: 'Weighted Pass',
      pinpointCrossing: 'Pinpoint Crossing',
      outsideCurler: 'Outside Curler',
      rabona: 'Rabona',
      noLookPass: 'No Look Pass',
      lowLoftedPass: 'Weighted Pass',
      gkLowPunt: 'GK Low Punt',
      gkHighPunt: 'GK High Punt',
      longThrow: 'Long Throw',
      gkLongThrow: 'GK Long Throw',
      penaltySpecialist: 'Penalty Specialist',
      gkPenaltySaver: 'GK Penalty Saver',
      gamesmanship: 'Gamesmanship',
      manMarking: 'Man Marking',
      trackBack: 'Track Back',
      interception: 'Interception',
      blocker: 'Blocker',
      aerialSuperiority: 'Aerial Superiority',
      slidingTackle: 'Sliding Tackle',
      acrobaticClear: 'Acrobatic Clear',
      captaincy: 'Captaincy',
      superSub: 'Super-sub',
      fightingSpirit: 'Fighting Spirit',
      phenomenalPassing: 'Phenomenal Passing',
      phenomenalFinishing: 'Phenomenal Finishing',
      fortress: 'Fortress',
      gamechangingPass: 'Game-Changing Pass',
      momentumDribbling: 'Momentum Dribbling',
      longReachTackle: 'Sliding Tackle'
    };

    const keyMap: Record<string, string> = {
      offensiveAwareness: 'OffensiveAwareness',
      offensive_awareness: 'OffensiveAwareness',
      ballControl: 'BallControl',
      ball_control: 'BallControl',
      dribbling: 'Dribbling',
      tightPossession: 'TightPossession',
      tight_possession: 'TightPossession',
      lowPass: 'LowPass',
      low_pass: 'LowPass',
      loftedPass: 'LoftedPass',
      lofted_pass: 'LoftedPass',
      finishing: 'Finishing',
      heading: 'Heading',
      setPieceTaking: 'PlaceKicking',
      set_piece_taking: 'PlaceKicking',
      curl: 'Curl',
      speed: 'Speed',
      acceleration: 'Acceleration',
      kickingPower: 'KickingPower',
      kicking_power: 'KickingPower',
      jump: 'Jumping',
      jumping: 'Jumping',
      physicalContact: 'PhysicalContact',
      physical_contact: 'PhysicalContact',
      balance: 'Balance',
      stamina: 'Stamina',
      defensiveAwareness: 'DefensiveAwareness',
      defensive_awareness: 'DefensiveAwareness',
      ballWinning: 'Tackling',
      tackling: 'Tackling',
      defensiveEngagement: 'DefensiveEngagement',
      defensive_engagement: 'DefensiveEngagement',
      aggression: 'Aggression',
      gkAwareness: 'GKAwareness',
      gk_awareness: 'GKAwareness',
      gkCatching: 'GKCatching',
      gk_catching: 'GKCatching',
      gkClearing: 'GKParrying',
      gk_parrying: 'GKParrying',
      gkReflexes: 'GKReflexes',
      gk_reflexes: 'GKReflexes',
      gkReach: 'GKReach',
      gk_reach: 'GKReach'
    };

    // Extract baseStats from efhub Next.js RSC stream
    const rscStatsMatch = html.match(/\\\\\"baseStats\\\\\":\s*(\{.+?\}),/) || html.match(/\"baseStats\":\s*(\{.+?\}),/);
    if (rscStatsMatch) {
      try {
        const jsonStr = rscStatsMatch[1].replace(/\\\\\"/g, '"').replace(/\\\\/g, '');
        const rawStats = JSON.parse(jsonStr);
        Object.keys(rawStats).forEach(k => {
          const mappedKey = keyMap[k] || k;
          keyAttributes[mappedKey] = Number(rawStats[k]);
        });
      } catch (e) {}
    }

    // Extract playerSkills from efhub Next.js RSC stream
    const rscSkillsMatch = html.match(/\\\\\"playerSkills\\\\\":\s*(\[.+?\])/) || html.match(/\"playerSkills\":\s*(\[.+?\])/);
    if (rscSkillsMatch) {
      try {
        const jsonStr = rscSkillsMatch[1].replace(/\\\\\"/g, '"');
        const rawSkills: string[] = JSON.parse(jsonStr);
        skills = rawSkills.map(sk => EFHUB_SKILL_MAP[sk] || sk.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim());
      } catch (e) {}
    }

    // Extract player object from efhub Next.js RSC stream
    const rscPlayerMatch = html.match(/\\\\\"player\\\\\":\s*(\{.+?\\\\\"playerId\\\\\":.+?\})/) || html.match(/\"player\":\s*(\{.+?\"playerId\":.+?\})/);
    let cardImage = '';
    if (rscPlayerMatch) {
      try {
        const jsonStr = rscPlayerMatch[1].replace(/\\\\\"/g, '"').replace(/\\\\/g, '');
        const p = JSON.parse(jsonStr);
        if (p.name) name = p.name;
        if (p.position) position = p.position;
        if (p.team) club = p.team;
        if (p.playingStyle) playstyle = p.playingStyle;
        if (p.imageUrl) cardImage = p.imageUrl;
        if (p.overallRating) {
          baseRating = Number(p.overallRating);
          maxRating = p.levelCap ? Math.min(108, Math.round(baseRating + Math.min(14, p.levelCap * 0.35 + 2))) : baseRating;
        }
        if (p.playerType === 5) cardType = 'Epic';
        else if (p.playerType === 4) cardType = 'Big Time';
        else if (p.playerType === 3) cardType = 'Show Time';
        else if (p.playerType === 2) cardType = 'Highlight';
        else if (p.playerType === 1) cardType = 'Featured';
        else cardType = 'Standard';
      } catch (e) {}
    }

    // Extract additional positions
    const rscPositionsMatch = html.match(/\\\\\"additionalPositions\\\\\":\s*(\[.+?\])/) || html.match(/\"additionalPositions\":\s*(\[.+?\])/);
    if (rscPositionsMatch) {
      try {
        const jsonStr = rscPositionsMatch[1].replace(/\\\\\"/g, '"');
        const posArr = JSON.parse(jsonStr);
        secondaryPositions = posArr.map((p: any) => p.position).filter(Boolean);
      } catch (e) {}
    }

    // 2. Parse PESDB script fallback if available
    const pesdbScriptMatch = html.match(/<script[^>]*id="player-progression-data"[^>]*>([\s\S]*?)<\/script>/i);
    if (pesdbScriptMatch && pesdbScriptMatch[1]) {
      try {
        const parsed = JSON.parse(pesdbScriptMatch[1]);
        if (parsed.compare?.playerName) name = parsed.compare.playerName;
        if (parsed.databaseMaxOverall) maxRating = parsed.databaseMaxOverall;
        if (parsed.baseOverall) baseRating = parsed.baseOverall;
        if (parsed.compare?.attackingPlayingStyle) playstyle = parsed.compare.attackingPlayingStyle;
        if (parsed.compare?.teamName) club = parsed.compare.teamName;
        if (parsed.baseStats && Object.keys(keyAttributes).length === 0) {
          Object.keys(parsed.baseStats).forEach(k => {
            const mapped = keyMap[k] || k;
            keyAttributes[mapped] = Number(parsed.baseStats[k]);
          });
        }
      } catch (e) {}
    }

    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    const imgMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);

    if ((name === 'Unknown Player' || !name) && titleMatch) {
      const parts = titleMatch[1].split(/—|-|\|/);
      if (parts[0]) name = parts[0].trim();
      if (parts[1]) {
        const ovrMatch = parts[1].match(/(\d+)\s*OVR/i) || parts[1].match(/(\d+)/);
        if (ovrMatch) maxRating = parseInt(ovrMatch[1], 10);
      }
    }

    if (descMatch) {
      const desc = descMatch[1];
      const mRate = desc.match(/Max Overall (\d+)/i) || desc.match(/Overall Rating (\d+)/i) || desc.match(/is a (\d+)-rated/i);
      if (mRate) maxRating = parseInt(mRate[1], 10);

      const mPos = desc.match(/rated ([A-Z]{2,3}) in eFootball/i) || desc.match(/\b(GK|CB|LB|RB|LWB|RWB|DMF|CMF|AMF|LMF|RMF|LWF|RWF|SS|CF)\b/);
      if (mPos && position === 'CF') position = mPos[1].toUpperCase();

      const mStyle = desc.match(/Playing style:\s*([^.]+)\./i);
      if (mStyle) playstyle = mStyle[1].trim();
    }

    // Match or fallback to master database if needed
    const matched = EFOOTBALL_MASTER_PLAYERS.find(p => 
      normalizeString(p.fullName) === normalizeString(name) ||
      normalizeString(p.commonName) === normalizeString(name) ||
      (slugName && (normalizeString(p.fullName) === normalizeString(slugName) || normalizeString(p.commonName) === normalizeString(slugName))) ||
      p.aliases.some(a => normalizeString(a) === normalizeString(name) || (slugName && normalizeString(a) === normalizeString(slugName)))
    );

    const lookupName = matched ? matched.fullName : name;
    const generated = getAllEfhubCardsForPlayer(lookupName);
    const chosen = generated.find(c => c.primaryPosition === position) || generated[0];

    const finalPlayer = {
      id: `efhub_${Date.now()}`,
      fullName: lookupName,
      commonName: chosen?.commonName || lookupName,
      aliases: [lookupName.toUpperCase()],
      primaryPosition: position,
      secondaryPositions: secondaryPositions.length > 0 ? secondaryPositions : (chosen?.secondaryPositions || (position === 'CF' ? ['SS'] : ['CMF'])),
      baseRating: baseRating || chosen?.baseRating || 85,
      maxRating: maxRating || chosen?.maxRating || 90,
      playstyle: playstyle || chosen?.playstyle || 'Goal Poacher',
      cardType: cardType || chosen?.cardType || 'Highlight',
      club: club || matched?.club || chosen?.club || 'eFootball Club',
      nationality: nationality || matched?.nationality || chosen?.nationality || 'International',
      cardTitle: `${lookupName} efHUB Card`,
      keyAttributes: Object.keys(keyAttributes).length > 0 ? keyAttributes : (chosen?.keyAttributes || {}),
      skills: skills.length > 0 ? skills : (chosen?.skills || ['Double Touch', 'First-time Shot', 'One-touch Pass']),
      efhubUrl: targetUrl,
      imageUrl: cardImage || (imgMatch ? imgMatch[1] : undefined)
    };

    return res.status(200).json({ success: true, player: finalPlayer });
  } catch (err: any) {
    console.error('Error in live player card handler:', err);
    return res.status(500).json({ error: 'Failed to fetch player details.' });
  }
}
