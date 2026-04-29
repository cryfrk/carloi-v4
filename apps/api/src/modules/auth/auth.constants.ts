export enum VerificationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
}

export const ACCESS_TOKEN_DEFAULT_EXPIRES_IN = '15m';
export const REFRESH_TOKEN_DEFAULT_EXPIRES_IN = '30d';
export const VERIFICATION_CODE_LENGTH = 6;
export const VERIFICATION_CODE_TTL_MINUTES = 10;
export const PASSWORD_RESET_TTL_MINUTES = 15;
export const CODE_RESEND_COOLDOWN_SECONDS = 60;

export const BREVO_EMAIL_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';
export const BREVO_SMS_ENDPOINT = 'https://api.brevo.com/v3/transactionalSMS/send';
