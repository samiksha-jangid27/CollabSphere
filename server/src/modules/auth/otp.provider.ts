// ABOUTME: OTP delivery provider — logs to console in dev, sends SMS via Twilio in production.
// ABOUTME: Implements IOtpProvider for dependency injection into AuthService.

import { config } from '../../config/environment';
import { IOtpProvider } from './auth.interfaces';
import logger from '../../shared/logger';

export class OtpProvider implements IOtpProvider {
  async sendOtp(phone: string, otp: string): Promise<void> {
    if (config.isDev || config.isTest) {
      logger.info(`[DEV] OTP for ${phone}: ${otp}`);
      return;
    }

    if (!config.TWILIO_ACCOUNT_SID || !config.TWILIO_AUTH_TOKEN) {
      logger.warn('Twilio credentials not configured — OTP logged to console');
      logger.info(`[FALLBACK] OTP for ${phone}: ${otp}`);
      return;
    }

    const twilio = await import('twilio');
    const client = twilio.default(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);

    await client.messages.create({
      body: `Your CollabSphere verification code is: ${otp}`,
      from: config.TWILIO_PHONE_NUMBER,
      to: phone,
    });

    logger.info(`OTP sent to ${phone}`);
  }
}
