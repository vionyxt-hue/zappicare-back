import { z } from 'zod';
import { Gender, UserRole } from '../entities/user.entity';
import { OAuthProvider } from '../../enums/oauth-provider.enum';

const mobileRegex = /^[0-9]{10,15}$/;

export const SendOtpSchema = z.object({
  mobileNumber: z.string().regex(mobileRegex, 'Invalid mobile number'),
  countryCode: z.string().optional().default('+91'),
  termsAndConditionsAccepted: z.literal(true, {
    errorMap: () => ({ message: 'Terms and conditions must be accepted' }),
  }),
}).passthrough();

export const VerifyOtpSchema = z.object({
  mobileNumber: z.string().regex(mobileRegex, 'Invalid mobile number'),
  code: z.string().length(5, 'OTP must be 5 digits'),
}).passthrough();

export const RegisterSchema = z.object({
  mobileNumber: z.string().regex(mobileRegex, 'Invalid mobile number'),
  countryCode: z.string().optional().default('+91'),
  firstName: z.string().min(1, 'First name is required').trim(),
  lastName: z.string().min(1, 'Last name is required').trim(),
  emergencyNumber: z.string().regex(mobileRegex).optional().or(z.literal('')),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  referCode: z.string().optional(),
  gender: z.enum(Gender as unknown as [string, ...string[]]),
  role: z.enum(UserRole as unknown as [string, ...string[]]).default('user'),
}).passthrough();

export const LoginSchema = z.object({
  mobileNumber: z.string().regex(mobileRegex, 'Invalid mobile number').optional(),
  email: z.string().email('Invalid email').optional(),
  password: z.string().min(1, 'Password is required').optional(),
  code: z.string().length(5, 'OTP must be 5 digits').optional(),
}).passthrough().refine(
  (data) =>
    (data.mobileNumber && (data.code !== undefined || data.password !== undefined)) ||
    (data.email && data.password),
  { message: 'Provide mobileNumber with code (OTP) or password, or email with password' }
);

export const GoogleAuthSchema = z.object({
  idToken: z.string().min(1, 'Google idToken is required'),
  role: z.enum(UserRole as unknown as [string, ...string[]]).optional().default('user'),
  termsAndConditionsAccepted: z.literal(true, {
    errorMap: () => ({ message: 'Terms and conditions must be accepted' }),
  }).optional(),
}).passthrough();

export const AppleAuthSchema = z.object({
  identityToken: z.string().min(1, 'Apple identityToken is required'),
  role: z.enum(UserRole as unknown as [string, ...string[]]).optional().default('user'),
  termsAndConditionsAccepted: z.literal(true, {
    errorMap: () => ({ message: 'Terms and conditions must be accepted' }),
  }).optional(),
}).passthrough();

export const OAuthLoginSchema = z.object({
  provider: z.enum(OAuthProvider),
  token: z.string().min(1, 'token is required'),
  role: z.enum(UserRole as unknown as [string, ...string[]]).optional().default('user'),
  termsAndConditionsAccepted: z.literal(true, {
    errorMap: () => ({ message: 'Terms and conditions must be accepted' }),
  }).optional(),
}).passthrough();

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken is required'),
});

export type SendOtpDto = z.infer<typeof SendOtpSchema>;
export type VerifyOtpDto = z.infer<typeof VerifyOtpSchema>;
export type RegisterDto = z.infer<typeof RegisterSchema>;
export type LoginDto = z.infer<typeof LoginSchema>;
export type GoogleAuthDto = z.infer<typeof GoogleAuthSchema>;
export type AppleAuthDto = z.infer<typeof AppleAuthSchema>;
export type OAuthLoginDto = z.infer<typeof OAuthLoginSchema>;
export type RefreshTokenDto = z.infer<typeof RefreshTokenSchema>;

export type SessionMeta = {
  ipAddress?: string;
  userAgent?: string;
  fcmToken?: string;
  apnsToken?: string;
  onesignalPlayerId?: string;
  devicePlatform?: string;
  timezone?: string;
  deviceInfo?: Record<string, unknown>;
  locationInfo?: Record<string, unknown>;
};
