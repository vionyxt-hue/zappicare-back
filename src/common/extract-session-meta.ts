import type { Request } from 'express';
import type { SessionMeta } from '../user/models/dtos/auth.dto';

export function extractSessionMeta(req: Request): SessionMeta {
  const b = req.body as Record<string, unknown>;
  const pickStr = (k: string) =>
    typeof b[k] === 'string' ? (b[k] as string) : undefined;
  const pickObj = (k: string) =>
    typeof b[k] === 'object' && b[k] !== null && !Array.isArray(b[k])
      ? (b[k] as Record<string, unknown>)
      : undefined;
  return {
    ipAddress: req.ip,
    userAgent: req.get('user-agent') ?? undefined,
    fcmToken: pickStr('fcmToken'),
    apnsToken: pickStr('apnsToken'),
    onesignalPlayerId: pickStr('onesignalPlayerId'),
    devicePlatform: pickStr('devicePlatform'),
    timezone: pickStr('timezone'),
    deviceInfo: pickObj('deviceInfo'),
    locationInfo: pickObj('locationInfo'),
  };
}
