import crypto from 'crypto';
import { dataTable } from '../../../db/data-table';

export type LoginActivityRow = {
  id: string;
  userId: string;
  sessionId: string;
  refreshTokenHash: string;
  status: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
  deviceInfo?: Record<string, unknown>;
  locationInfo?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  fcmToken?: string;
  apnsToken?: string;
  onesignalPlayerId?: string;
  devicePlatform?: string;
  timezone?: string;
  logoutAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export function hashRefreshToken(rawToken: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(rawToken).digest('hex');
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString('base64url');
}

export function generateSessionId(): string {
  return crypto.randomUUID();
}

function mapRow(row: Record<string, unknown>): LoginActivityRow {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    sessionId: String(row.session_id),
    refreshTokenHash: String(row.refresh_token_hash),
    status: String(row.status),
    accessTokenExpiresAt: new Date(row.access_token_expires_at as string),
    refreshTokenExpiresAt: new Date(row.refresh_token_expires_at as string),
    deviceInfo: row.device_info as Record<string, unknown> | undefined,
    locationInfo: row.location_info as Record<string, unknown> | undefined,
    ipAddress: row.ip_address ? String(row.ip_address) : undefined,
    userAgent: row.user_agent ? String(row.user_agent) : undefined,
    fcmToken: row.fcm_token ? String(row.fcm_token) : undefined,
    apnsToken: row.apns_token ? String(row.apns_token) : undefined,
    onesignalPlayerId: row.onesignal_player_id
      ? String(row.onesignal_player_id)
      : undefined,
    devicePlatform: row.device_platform ? String(row.device_platform) : undefined,
    timezone: row.timezone ? String(row.timezone) : undefined,
    logoutAt: row.logout_at ? new Date(row.logout_at as string) : undefined,
    isActive: row.is_active !== false,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

export async function insertLoginActivity(data: {
  userId: string;
  sessionId: string;
  refreshTokenHash: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
  deviceInfo?: Record<string, unknown>;
  locationInfo?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  fcmToken?: string;
  apnsToken?: string;
  onesignalPlayerId?: string;
  devicePlatform?: string;
  timezone?: string;
}): Promise<LoginActivityRow> {
  const [row] = await dataTable('login_activity')
    .insert({
      user_id: data.userId,
      session_id: data.sessionId,
      refresh_token_hash: data.refreshTokenHash,
      status: 'active',
      access_token_expires_at: data.accessTokenExpiresAt,
      refresh_token_expires_at: data.refreshTokenExpiresAt,
      device_info: data.deviceInfo ?? null,
      location_info: data.locationInfo ?? null,
      ip_address: data.ipAddress ?? null,
      user_agent: data.userAgent ?? null,
      fcm_token: data.fcmToken ?? null,
      apns_token: data.apnsToken ?? null,
      onesignal_player_id: data.onesignalPlayerId ?? null,
      device_platform: data.devicePlatform ?? null,
      timezone: data.timezone ?? null,
      is_active: true,
    })
    .returning('*');
  return mapRow(row as Record<string, unknown>);
}

export async function findLoginActivityByRefreshHash(
  refreshTokenHash: string
): Promise<LoginActivityRow | null> {
  const row = await dataTable('login_activity')
    .where({ refresh_token_hash: refreshTokenHash, is_active: true })
    .first();
  return row ? mapRow(row as Record<string, unknown>) : null;
}

export async function findLoginActivityBySessionId(
  sessionId: string
): Promise<LoginActivityRow | null> {
  const row = await dataTable('login_activity').where({ session_id: sessionId }).first();
  return row ? mapRow(row as Record<string, unknown>) : null;
}

export async function revokeLoginActivityBySessionId(sessionId: string): Promise<void> {
  await dataTable('login_activity')
    .where({ session_id: sessionId })
    .update({
      is_active: false,
      status: 'revoked',
      logout_at: new Date(),
      updated_at: new Date(),
    });
}

export async function updateLoginActivityAfterRefresh(data: {
  sessionId: string;
  refreshTokenHash: string;
  refreshTokenExpiresAt: Date;
  accessTokenExpiresAt: Date;
}): Promise<void> {
  await dataTable('login_activity')
    .where({ session_id: data.sessionId, is_active: true })
    .update({
      refresh_token_hash: data.refreshTokenHash,
      refresh_token_expires_at: data.refreshTokenExpiresAt,
      access_token_expires_at: data.accessTokenExpiresAt,
      updated_at: new Date(),
    });
}
