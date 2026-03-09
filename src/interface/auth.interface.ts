import { Request } from 'express';

export interface JwtPayload {
  sub: string;
  email?: string;
  mobileNumber?: string;
  iat?: number;
  exp?: number;
}

export interface RequestWithUser extends Request {
  user?: { id: string; email?: string; mobileNumber?: string };
}
