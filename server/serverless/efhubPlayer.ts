import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  EFOOTBALL_MASTER_PLAYERS,
  normalizeString,
  getAllEfhubCardsForPlayer
} from '../../src/lib/efootballDatabase.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const input = (req.query.id || req.query.url) as string;
    if (!input) {
      return res.status(400).json({ error: 'Player ID or URL is required.' });
    }

    let targetUrl = input;
    if (!input.startsWith('http://') && !input.startsWith('https://')) {
      targetUrl = `https://pesdb.net/efootball/players/${input}`;
    }

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      // Fallback try efhub if pesdb returned 404
      if (!targetUrl.includes('efhub.com')) {
        targetUrl = `https://efhub.com/players/${input}`;
      }
    }

    const html = await response.text();

    // 1. Try parsing rich PESDB JSON data
    const pesdbScriptMatch = html.match(/<script[^>]*id="player-progression-data"[^>]*>([\s\S]*?)<\/script>/i);
    let parsedPesdb: any = null;
    if (pesdbScriptMatch && pesdbScriptMatch[1]) {
      try {
        parsedPesdb = JSON.parse(pesdbScriptMatch[1]);
      } catch (e) {
        console.warn('Could not parse pesdb JSON script:', e);
      }
    }

    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    const imgMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);

    let name = parsedPesdb?.compare?.playerName || 'Unknown Player';
    let maxRating = parsedPesdb?.databaseMaxOverall || parsedPesdb?.baseOverall || 90;
    let baseRating = parsedPesdb?.baseOverall || Math.max(70, maxRating - 10);
    let position = 'CF';
    let playstyle = parsedPesdb?.compare?.attackingPlayingStyle || parsedPesdb?.compare?.defensivePlayingStyle || 'Goal Poacher';
    let cardType = parsedPesdb?.compare?.cardType || 'Epic';
    let club = parsedPesdb?.compare?.teamName || 'eFootball Club';
    let nationality = parsedPesdb?.compare?.nationality || 'International';
    let skills: string[] = parsedPesdb?.compare?.playerSkills || ['Double Touch', 'First-time Shot', 'One-touch Pass'];

    if (name === 'Unknown Player' && titleMatch) {
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
      if (mPos) position = mPos[1].toUpperCase();

      const mStyle = desc.match(/Playing style:\s*([^.]+)\./i);
      if (mStyle) playstyle = mStyle[1].trim();
    }

    // Convert PESDB snake_case baseStats to PascalCase keyAttributes
    const keyAttributes: Record<string, number> = {};
    if (parsedPesdb?.baseStats) {
      const statsObj = parsedPesdb.baseStats;
      const keyMap: Record<string, string> = {
        offensive_awareness: 'OffensiveAwareness',
        ball_control: 'BallControl',
        dribbling: 'Dribbling',
        tight_possession: 'TightPossession',
        low_pass: 'LowPass',
        lofted_pass: 'LoftedPass',
        finishing: 'Finishing',
        heading: 'Heading',
        set_piece_taking: 'PlaceKicking',
        curl: 'Curl',
        speed: 'Speed',
        acceleration: 'Acceleration',
        kicking_power: 'KickingPower',
        jumping: 'Jumping',
        physical_contact: 'PhysicalContact',
        balance: 'Balance',
        stamina: 'Stamina',
        defensive_awareness: 'DefensiveAwareness',
        tackling: 'Tackling',
        aggression: 'Aggression',
        defensive_engagement: 'DefensiveEngagement',
        gk_awareness: 'GKAwareness',
        gk_catching: 'GKCatching',
        gk_parrying: 'GKParrying',
        gk_reflexes: 'GKReflexes',
        gk_reach: 'GKReach'
      };

      Object.keys(statsObj).forEach(k => {
        const pasName = keyMap[k] || k;
        keyAttributes[pasName] = Number(statsObj[k]);
      });
    }

    const matched = EFOOTBALL_MASTER_PLAYERS.find(p => 
      normalizeString(p.fullName) === normalizeString(name) ||
      normalizeString(p.commonName) === normalizeString(name) ||
      p.aliases.some(a => normalizeString(a) === normalizeString(name))
    );

    const generated = getAllEfhubCardsForPlayer(name);
    const chosen = generated.find(c => c.primaryPosition === position) || generated[0] || {
      id: `pesdb_${Date.now()}`,
      fullName: name,
      commonName: name,
      aliases: [name.toUpperCase()],
      primaryPosition: position,
      secondaryPositions: position === 'CF' ? ['SS'] : position === 'CB' ? ['RB'] : ['CMF'],
      baseRating: baseRating,
      maxRating: maxRating,
      playstyle: playstyle,
      club: club || matched?.club || 'eFootball Club',
      nationality: nationality || matched?.nationality || 'International',
      cardType: cardType || (maxRating >= 102 ? 'Big Time' : maxRating >= 100 ? 'Epic' : maxRating >= 98 ? 'Show Time' : 'Standard'),
      cardTitle: `${name} Official Database Card`,
      keyAttributes: keyAttributes,
      skills: skills.length > 0 ? skills : (matched?.skills || ['Double Touch', 'First-time Shot', 'One-touch Pass']),
      efhubUrl: targetUrl
    };

    const finalPlayer = {
      ...chosen,
      fullName: name,
      commonName: name,
      primaryPosition: position || chosen.primaryPosition,
      maxRating: maxRating || chosen.maxRating,
      baseRating: baseRating || chosen.baseRating,
      playstyle: playstyle || chosen.playstyle,
      cardType: cardType || chosen.cardType,
      club: club || chosen.club,
      nationality: nationality || chosen.nationality,
      keyAttributes: Object.keys(keyAttributes).length > 0 ? keyAttributes : chosen.keyAttributes,
      skills: skills.length > 0 ? skills : chosen.skills,
      efhubUrl: targetUrl,
      imageUrl: imgMatch ? imgMatch[1] : undefined
    };

    return res.status(200).json({ success: true, player: finalPlayer });
  } catch (err: any) {
    console.error('Error in live player card handler:', err);
    return res.status(500).json({ error: 'Failed to fetch player details.' });
  }
}
