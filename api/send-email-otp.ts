import type { VercelRequest, VercelResponse } from '@vercel/node';
import sendEmailOtpHandler from './auth/send-email-otp.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return sendEmailOtpHandler(req, res);
}
