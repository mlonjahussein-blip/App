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
      targetUrl = `https://efhub.com/players/${input}`;
    }

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      return res.status(404).json({ error: `eFHUB returned status ${response.status}` });
    }

    const html = await response.text();

    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    const imgMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);

    let name = 'Unknown Player';
    let rating = 90;
    let position = 'CF';
    let playstyle = 'Goal Poacher';

    if (titleMatch) {
      const parts = titleMatch[1].split('—');
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

    const matched = EFOOTBALL_MASTER_PLAYERS.find(p => 
      normalizeString(p.fullName) === normalizeString(name) ||
      normalizeString(p.commonName) === normalizeString(name) ||
      p.aliases.some(a => normalizeString(a) === normalizeString(name))
    );

    const generated = getAllEfhubCardsForPlayer(name);
    const chosen = generated.find(c => c.primaryPosition === position) || generated[0] || {
      id: `efhub_${Date.now()}`,
      fullName: name,
      commonName: name,
      aliases: [name.toUpperCase()],
      primaryPosition: position,
      secondaryPositions: position === 'CF' ? ['SS'] : position === 'CB' ? ['RB'] : ['CMF'],
      baseRating: Math.max(70, rating - 8),
      maxRating: rating,
      playstyle: playstyle,
      club: matched?.club || 'eFootball Club',
      nationality: matched?.nationality || 'International',
      cardType: rating >= 102 ? 'Big Time' : rating >= 100 ? 'Epic' : rating >= 98 ? 'Show Time' : rating >= 95 ? 'Highlight' : 'Standard',
      cardTitle: `${name} Official eFHUB Card`,
      keyAttributes: {},
      skills: matched?.skills || ['Double Touch', 'First-time Shot', 'One-touch Pass'],
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
      imageUrl: imgMatch ? imgMatch[1] : undefined
    };

    return res.status(200).json({ success: true, player: finalPlayer });
  } catch (err: any) {
    console.error('Error in efhubPlayer serverless handler:', err);
    return res.status(500).json({ error: err?.message || 'Failed to fetch player data' });
  }
}
