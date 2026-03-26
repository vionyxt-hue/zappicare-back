import { getKnex } from '../../../db/data-table';

const WINDOW_MS = 5 * 60 * 1000;
export const MAX_OTP_SENDS_PER_WINDOW = 5;

export type OtpSendCheckResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

export async function checkAndRecordOtpSend(mobileNumber: string): Promise<OtpSendCheckResult> {
  const knex = getKnex();
  return knex.transaction(async (trx) => {
    const row = await trx
      .withSchema('data')
      .table('otp_send_windows')
      .where({ mobile_number: mobileNumber })
      .forUpdate()
      .first();

    const now = Date.now();

    if (!row) {
      await trx.withSchema('data').table('otp_send_windows').insert({
        mobile_number: mobileNumber,
        window_started_at: new Date(now),
        send_count: 1,
      });
      return { allowed: true };
    }

    const windowStart = new Date(
      (row as { window_started_at: Date }).window_started_at
    ).getTime();
    const count = Number((row as { send_count: number }).send_count);

    if (now - windowStart >= WINDOW_MS) {
      await trx
        .withSchema('data')
        .table('otp_send_windows')
        .where({ mobile_number: mobileNumber })
        .update({
          window_started_at: new Date(now),
          send_count: 1,
          updated_at: new Date(),
        });
      return { allowed: true };
    }

    if (count >= MAX_OTP_SENDS_PER_WINDOW) {
      const retryAfterMs = WINDOW_MS - (now - windowStart);
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
      };
    }

    await trx
      .withSchema('data')
      .table('otp_send_windows')
      .where({ mobile_number: mobileNumber })
      .update({
        send_count: count + 1,
        updated_at: new Date(),
      });
    return { allowed: true };
  });
}
