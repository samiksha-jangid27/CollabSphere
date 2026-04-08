// ABOUTME: Email provider for sending verification links via Nodemailer.
// ABOUTME: Falls back to Ethereal (test SMTP) when credentials are not configured.

import nodemailer from 'nodemailer';
import { config } from '../../config/environment';
import { IEmailProvider } from './auth.interfaces';
import logger from '../../shared/logger';

export class EmailProvider implements IEmailProvider {
  private transporter: nodemailer.Transporter | null = null;

  private async getTransporter(): Promise<nodemailer.Transporter> {
    if (this.transporter) return this.transporter;

    if (config.SMTP_HOST && config.SMTP_USER) {
      this.transporter = nodemailer.createTransport({
        host: config.SMTP_HOST,
        port: config.SMTP_PORT,
        secure: config.SMTP_PORT === 465,
        auth: {
          user: config.SMTP_USER,
          pass: config.SMTP_PASS,
        },
      });
    } else {
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      logger.info(`Using Ethereal test email: ${testAccount.user}`);
    }

    return this.transporter;
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const transporter = await this.getTransporter();
    const verifyUrl = `${config.CLIENT_URL}/verify?token=${token}`;

    const info = await transporter.sendMail({
      from: '"CollabSphere" <noreply@collabsphere.com>',
      to: email,
      subject: 'Verify your email — CollabSphere',
      html: `
        <div style="font-family: 'Inter', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0F1117; color: #F1F3F9; border-radius: 12px;">
          <h1 style="color: #6C63FF; font-size: 24px; margin-bottom: 16px;">CollabSphere</h1>
          <p style="font-size: 15px; color: #94A3B8; margin-bottom: 24px;">
            Click the button below to verify your email address.
          </p>
          <a href="${verifyUrl}" style="display: inline-block; background: #6C63FF; color: #F1F3F9; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
            Verify Email
          </a>
          <p style="font-size: 13px; color: #64748B; margin-top: 24px;">
            This link expires in 24 hours. If you didn't request this, ignore this email.
          </p>
        </div>
      `,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      logger.info(`Email preview URL: ${previewUrl}`);
    }
  }
}
