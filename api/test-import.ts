import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const results: Record<string, any> = {};
  
  try {
    results.nodeVersion = process.version;
    results.env = {
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
      geminiKeyPrefix: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 6) + '...' : null,
      hasGoogleKey: !!process.env.GOOGLE_API_KEY,
      nodeEnv: process.env.NODE_ENV
    };
  } catch (e: any) {
    results.envError = e.message;
  }

  try {
    const pipeline = await import('../server/accuracyPipeline.ts');
    results.importPipeline = 'SUCCESS';
    results.pipelineExports = Object.keys(pipeline);
  } catch (err: any) {
    results.importPipeline = 'FAILED';
    results.pipelineError = err.message;
    results.pipelineStack = err.stack;
  }

  return res.status(200).json(results);
}
