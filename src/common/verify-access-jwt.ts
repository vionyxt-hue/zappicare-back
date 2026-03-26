import jwt from 'jsonwebtoken';
import type { JwtPayload } from '../interface/auth.interface';

/**
 * Validates Bearer tokens for protected routes. Rejects OTP handoff tokens and other
 * non-session JWTs (`sub` must be user id UUID, not mobile).
 */
export function verifyAccessJwtToken(token: string, secret: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    if (decoded.typ !== 'access') return null;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Provider routes (`/providers/onboarding/*`): full session **access** JWT, or
 * **onboarding** JWT (issued before step 4 so providers can complete the stepper).
 */
export function verifyProviderRouteJwtToken(token: string, secret: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    if (decoded.typ === 'access' || decoded.typ === 'onboarding') return decoded;
    return null;
  } catch {
    return null;
  }
}
