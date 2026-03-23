import { Request } from 'express';

/**
 * JWT claims for auth.
 * - `typ: 'access'` — full session (after onboarding step 4).
 * - `typ: 'onboarding'` — provider-only; `/providers/onboarding/*` until step 4.
 */
export interface JwtPayload {
  sub: string;
  email?: string;
  mobileNumber?: string;
  /** Session id (login_activity.session_id); only for `access`. */
  sid?: string;
  typ?: string;
  iat?: number;
  exp?: number;
}

export interface RequestWithUser extends Request {
  user?: {
    id: string;
    email?: string;
    mobileNumber?: string;
    sessionId?: string;
    exp?: number;
  };
}
