import { dataTable } from '../../../db/data-table';
import type { UserEntity, GenderType, UserRoleType } from '../entities/user.entity';
import { computeCurrentStep } from '../../utils/onboarding.util';

function parseDate(v: unknown): Date {
  if (v instanceof Date) return v;
  return new Date(String(v));
}

export function mapUserRow(row: Record<string, unknown>): UserEntity {
  const isPhoneVerified = Boolean(row.is_phone_verified);
  const isProfileCompleted = Boolean(row.is_profile_completed);
  const isStepperCompleted = Boolean(row.is_stepper_completed);
  const role = row.role as UserRoleType;
  const currentStep = computeCurrentStep({
    role,
    isPhoneVerified,
    isProfileCompleted,
    isStepperCompleted,
  });
  return {
    id: String(row.id),
    mobileNumber: String(row.mobile_number),
    countryCode: row.country_code ? String(row.country_code) : undefined,
    email: row.email ? String(row.email) : undefined,
    password: row.password ? String(row.password) : undefined,
    firstName: String(row.first_name),
    lastName: String(row.last_name),
    emergencyNumber: row.emergency_number ? String(row.emergency_number) : undefined,
    gender: row.gender ? (row.gender as GenderType) : undefined,
    referCode: row.refer_code ? String(row.refer_code) : undefined,
    termsAndConditionsAccepted: Boolean(row.terms_and_conditions_accepted),
    isMobileVerified: Boolean(row.is_mobile_verified),
    isPhoneVerified,
    isProfileCompleted,
    isStepperCompleted,
    currentStep,
    role,
    googleId: row.google_id ? String(row.google_id) : undefined,
    appleId: row.apple_id ? String(row.apple_id) : undefined,
    isActive: row.is_active !== false,
    createdAt: parseDate(row.created_at),
    updatedAt: parseDate(row.updated_at),
  };
}

export async function findUserById(userId: string): Promise<UserEntity | null> {
  const row = await dataTable('users').where({ id: userId }).first();
  return row ? mapUserRow(row) : null;
}

export async function findUserByMobile(mobileNumber: string): Promise<UserEntity | null> {
  const row = await dataTable('users').where({ mobile_number: mobileNumber }).first();
  return row ? mapUserRow(row) : null;
}

export async function findUserByEmailLower(email: string): Promise<UserEntity | null> {
  const row = await dataTable('users')
    .whereRaw('lower(email) = ?', [email.toLowerCase()])
    .first();
  return row ? mapUserRow(row) : null;
}

export async function findUserByGoogleId(googleId: string): Promise<UserEntity | null> {
  const row = await dataTable('users').where({ google_id: googleId }).first();
  return row ? mapUserRow(row) : null;
}

export async function findUserByAppleId(appleId: string): Promise<UserEntity | null> {
  const row = await dataTable('users').where({ apple_id: appleId }).first();
  return row ? mapUserRow(row) : null;
}

export async function createUser(data: {
  mobileNumber: string;
  countryCode?: string;
  email?: string;
  password?: string;
  firstName: string;
  lastName: string;
  emergencyNumber?: string;
  gender?: GenderType;
  referCode?: string;
  termsAndConditionsAccepted: boolean;
  isMobileVerified: boolean;
  isPhoneVerified?: boolean;
  isProfileCompleted?: boolean;
  isStepperCompleted?: boolean;
  role: UserRoleType;
  googleId?: string;
  appleId?: string;
  isActive?: boolean;
}): Promise<UserEntity> {
  const isPhoneVerified = data.isPhoneVerified ?? false;
  const isProfileCompleted = data.isProfileCompleted ?? false;
  const isStepperCompleted =
    data.isStepperCompleted ?? (data.role !== 'provider');
  const currentStep = computeCurrentStep({
    role: data.role,
    isPhoneVerified,
    isProfileCompleted,
    isStepperCompleted,
  });
  const [row] = await dataTable('users')
    .insert({
      mobile_number: data.mobileNumber,
      country_code: data.countryCode ?? null,
      email: data.email ? data.email.toLowerCase() : null,
      password: data.password ?? null,
      first_name: data.firstName,
      last_name: data.lastName,
      emergency_number: data.emergencyNumber ?? null,
      gender: data.gender ?? null,
      refer_code: data.referCode ?? null,
      terms_and_conditions_accepted: data.termsAndConditionsAccepted,
      is_mobile_verified: data.isMobileVerified,
      is_phone_verified: isPhoneVerified,
      is_profile_completed: isProfileCompleted,
      is_stepper_completed: isStepperCompleted,
      current_step: currentStep,
      role: data.role,
      google_id: data.googleId ?? null,
      apple_id: data.appleId ?? null,
      is_active: data.isActive ?? true,
    })
    .returning('*');
  return mapUserRow(row as Record<string, unknown>);
}

export async function patchUserOnboarding(
  userId: string,
  patch: Partial<{
    isPhoneVerified: boolean;
    isProfileCompleted: boolean;
    isStepperCompleted: boolean;
  }>
): Promise<UserEntity | null> {
  const user = await findUserById(userId);
  if (!user) return null;
  const merged = {
    isPhoneVerified: patch.isPhoneVerified ?? user.isPhoneVerified,
    isProfileCompleted: patch.isProfileCompleted ?? user.isProfileCompleted,
    isStepperCompleted: patch.isStepperCompleted ?? user.isStepperCompleted,
  };
  const currentStep = computeCurrentStep({
    role: user.role,
    ...merged,
  });
  const [row] = await dataTable('users')
    .where({ id: userId })
    .update({
      is_phone_verified: merged.isPhoneVerified,
      is_profile_completed: merged.isProfileCompleted,
      is_stepper_completed: merged.isStepperCompleted,
      current_step: currentStep,
      is_mobile_verified: merged.isPhoneVerified ? true : user.isMobileVerified,
      updated_at: new Date(),
    })
    .returning('*');
  return row ? mapUserRow(row as Record<string, unknown>) : null;
}

export async function updateUserById(
  id: string,
  patch: Partial<{
    googleId: string;
    appleId: string;
    email: string;
    mobileNumber: string;
    firstName: string;
    lastName: string;
    password: string;
  }>
): Promise<UserEntity | null> {
  const update: Record<string, unknown> = {};
  if (patch.googleId !== undefined) update.google_id = patch.googleId;
  if (patch.appleId !== undefined) update.apple_id = patch.appleId;
  if (patch.email !== undefined) update.email = patch.email.toLowerCase();
  if (patch.mobileNumber !== undefined) update.mobile_number = patch.mobileNumber;
  if (patch.firstName !== undefined) update.first_name = patch.firstName;
  if (patch.lastName !== undefined) update.last_name = patch.lastName;
  if (patch.password !== undefined) update.password = patch.password;
  if (Object.keys(update).length === 0) {
    return findUserById(id);
  }
  update.updated_at = new Date();
  const [row] = await dataTable('users').where({ id }).update(update).returning('*');
  return row ? mapUserRow(row as Record<string, unknown>) : null;
}
