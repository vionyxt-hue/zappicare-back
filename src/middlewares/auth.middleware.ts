import { Response, NextFunction } from 'express';
import { ResponseService } from '../core/response-management';
import { AuthErrorMessages } from '../core/messages';
import { RequestWithUser } from '../interface/auth.interface';
import type { JwtPayload } from '../interface/auth.interface';

export type AuthTokenVerifier = (token: string) => JwtPayload | null;

const responseService = new ResponseService();

export function createAuthMiddleware(authService: { verifyToken: AuthTokenVerifier }) {
  return function authMiddleware(
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ): void {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json(responseService.unauthorized(AuthErrorMessages.TOKEN_MISSING));
      return;
    }
    const token = authHeader.slice(7);
    const payload = authService.verifyToken(token);
    if (!payload) {
      res.status(401).json(responseService.unauthorized(AuthErrorMessages.TOKEN_INVALID));
      return;
    }
    req.user = {
      id: payload.sub,
      email: payload.email,
      mobileNumber: payload.mobileNumber,
      sessionId: payload.sid,
      exp: payload.exp,
    };
    next();
  };
}
