import { dataTable } from '../../../db/data-table';
import type { OtpVerificationEntity } from '../entities/otp-verification.entity';

function parseDate(v: unknown): Date {
  if (v instanceof Date) return v;
  return new Date(String(v));
}

function mapOtpRow(row: Record<string, unknown>): OtpVerificationEntity {
  return {
    id: String(row.id),
    mobileNumber: String(row.mobile_number),
    code: String(row.code),
    expiresAt: parseDate(row.expires_at),
    attempts: Number(row.attempts ?? 0),
    userId: row.user_id ? String(row.user_id) : undefined,
    createdAt: parseDate(row.created_at),
    updatedAt: parseDate(row.updated_at),
  };
}

export async function findLatestOtpByMobile(
  mobileNumber: string
): Promise<OtpVerificationEntity | null> {
  const row = await dataTable('otp_verifications')
    .where({ mobile_number: mobileNumber })
    .orderBy('created_at', 'desc')
    .first();
  return row ? mapOtpRow(row as Record<string, unknown>) : null;
}

export async function createOtp(data: {
  mobileNumber: string;
  code: string;
  expiresAt: Date;
}): Promise<void> {
  await dataTable('otp_verifications').insert({
    mobile_number: data.mobileNumber,
    code: data.code,
    expires_at: data.expiresAt,
    attempts: 0,
  });
}

export async function deleteOtpById(id: string): Promise<void> {
  await dataTable('otp_verifications').where({ id }).delete();
}

export async function incrementOtpAttempts(id: string): Promise<void> {
  await dataTable('otp_verifications').where({ id }).increment('attempts', 1);
}
