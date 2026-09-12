import type { VercelRequest, VercelResponse } from '@vercel/node';
import { testValue } from './_testHelper.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  return res.status(200).json({
    status: 'ok',
    testValue,
    nodeVersion: process.version
  });
}

