import type { VercelRequest, VercelResponse } from '@vercel/node';

export const maxDuration = 10;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { player, tacticalPlaystyle } = req.body || {};
    if (!player || !player.name) {
      return res.status(400).json({ error: 'Player data is required.' });
    }

    const guidance = {
      playerName: player.name,
      position: player.position || 'CMF',
      playstyle: player.playstyle || 'All-round',
      levelTraining: {
        recommendedLevels: 32,
        estimatedExpRequired: '74,000 EXP',
        keyTargetMilestones: 'Cap core defensive and speed stats to reach break point +4'
      },
      playerProgression: [
        { attributeGroup: 'Passing', points: 6, rationale: 'Enhances curl and low pass trajectory under pressure.' },
        { attributeGroup: 'Dribbling / Tight Possession', points: 4, rationale: 'Enables swift 180° turns when crowded in midfield.' },
        { attributeGroup: 'Dexterity / Acceleration', points: 8, rationale: 'Provides initial burst to escape marker tracking.' },
        { attributeGroup: 'Lower Body Strength / Stamina', points: 8, rationale: 'Ensures stamina remains in green zone until 90th minute.' },
        { attributeGroup: 'Defending', points: 4, rationale: 'Increases recovery tackle success rate.' }
      ],
      skillsToTeach: [
        { skill: 'One-touch Pass', why: 'Essential for crisp build-up and avoiding unnecessary tackles.' },
        { skill: 'Interception', why: 'Triggers automatic limb extensions to cut opponent through-balls.' },
        { skill: 'Double Touch', why: 'Fastest 1v1 skill move to create space for shooting or crossing.' }
      ],
      positionTraining: {
        viablePositions: player.position === 'DMF' ? ['CB', 'CMF'] : player.position === 'CF' ? ['SS', 'AMF'] : ['CMF', 'AMF'],
        recommendation: `Recommended familiarity upgrade to enhance squad depth for ${tacticalPlaystyle || 'Quick Counter'} formation changes.`
      },
      tacticalAdvice: `Deploy as primary pivot or half-space receiver. Avoid carrying the ball for more than 3 touches in central third.`
    };

    return res.status(200).json({ success: true, builderPlan: guidance });
  } catch (error: any) {
    return res.status(200).json({
      success: false,
      error: error?.message || 'Failed to generate player builder plan.'
    });
  }
}
