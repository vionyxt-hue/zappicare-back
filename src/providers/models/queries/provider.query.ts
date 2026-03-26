import { dataTable, getKnex } from '../../../db/data-table';
import type { Knex } from 'knex';
import type { IProvider } from '../entities/provider.entity';
import type {
  OnboardingStepValue,
  VerificationStatusValue,
} from '../../enums/provider.enum';
import type {
  IProviderDocument,
  ProviderDocumentTypeValue,
} from '../entities/provider-document.entity';
import type { IProviderPaymentDetail } from '../entities/provider-payment-detail.entity';

function parseDate(v: unknown): Date {
  if (v instanceof Date) return v;
  return new Date(String(v));
}

function safeArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function toJsonb(value: unknown): unknown {
  if (value == null) return null;
  return JSON.parse(JSON.stringify(value));
}

/**
 * Bind JSON payloads with explicit DB cast.
 * This avoids driver-specific object serialization edge cases.
 */
function asJsonParam(value: unknown): Knex.Raw | null {
  const normalized = toJsonb(value);
  if (normalized == null) return null;
  return getKnex().raw('?::jsonb', [JSON.stringify(normalized)]);
}

export function mapProviderRow(row: Record<string, unknown>): IProvider {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    personalInfo: row.personal_info as IProvider['personalInfo'],
    professionalProfiles: safeArray<IProvider['professionalProfiles'][number]>(
      row.professional_profiles
    ),
    labProfessionalDetails: row.lab_professional_details
      ? (row.lab_professional_details as IProvider['labProfessionalDetails'])
      : undefined,
    ambulanceProfessionalDetails: row.ambulance_professional_details
      ? (row.ambulance_professional_details as IProvider['ambulanceProfessionalDetails'])
      : undefined,
    nurseProfessionalDetails: row.nurse_professional_details
      ? (row.nurse_professional_details as IProvider['nurseProfessionalDetails'])
      : undefined,
    hospitalProfessionalDetails: row.hospital_professional_details
      ? (row.hospital_professional_details as IProvider['hospitalProfessionalDetails'])
      : undefined,
    onboardingStep: row.onboarding_step as OnboardingStepValue,
    verificationStatus: row.verification_status as VerificationStatusValue,
    rejectionReason: row.rejection_reason ? String(row.rejection_reason) : undefined,
    approvedAt: row.approved_at ? parseDate(row.approved_at) : undefined,
    createdAt: parseDate(row.created_at),
    updatedAt: parseDate(row.updated_at),
  };
}

export async function findProviderByUserId(userId: string): Promise<IProvider | null> {
  const row = await dataTable('providers').where({ user_id: userId }).first();
  return row ? mapProviderRow(row as Record<string, unknown>) : null;
}

export async function findProviderIdByUserId(userId: string): Promise<string | null> {
  const row = await dataTable('providers')
    .where({ user_id: userId })
    .select('id')
    .first();
  return row ? String((row as { id: string }).id) : null;
}

export async function insertProvider(data: {
  userId: string;
  personalInfo: IProvider['personalInfo'];
  onboardingStep: OnboardingStepValue;
  verificationStatus?: VerificationStatusValue;
}): Promise<IProvider> {
  const [row] = await dataTable('providers')
    .insert({
      user_id: data.userId,
      // Keep JSON columns casted explicitly at query layer.
      personal_info: asJsonParam(data.personalInfo),
      professional_profiles: asJsonParam([]),
      onboarding_step: data.onboardingStep,
      verification_status: data.verificationStatus ?? 'pending',
    })
    .returning('*');
  return mapProviderRow(row as Record<string, unknown>);
}

export async function saveProvider(provider: IProvider): Promise<void> {
  await dataTable('providers')
    .where({ id: provider.id })
    .update({
      // All provider profile payloads are JSON/JSONB columns.
      personal_info: asJsonParam(provider.personalInfo),
      professional_profiles: asJsonParam(provider.professionalProfiles),
      lab_professional_details: asJsonParam(provider.labProfessionalDetails),
      ambulance_professional_details: asJsonParam(provider.ambulanceProfessionalDetails),
      nurse_professional_details: asJsonParam(provider.nurseProfessionalDetails),
      hospital_professional_details: asJsonParam(provider.hospitalProfessionalDetails),
      onboarding_step: provider.onboardingStep,
      verification_status: provider.verificationStatus,
      rejection_reason: provider.rejectionReason ?? null,
      approved_at: provider.approvedAt ?? null,
      updated_at: new Date(),
    });
}

export async function upsertProviderDocument(
  providerId: string,
  documentType: ProviderDocumentTypeValue,
  data: {
    url?: string;
    fileName?: string;
    fileSize?: number;
    documentNumber?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  await dataTable('provider_documents')
    .insert({
      provider_id: providerId,
      document_type: documentType,
      url: data.url ?? null,
      file_name: data.fileName ?? null,
      file_size: data.fileSize ?? null,
      document_number: data.documentNumber ?? null,
      metadata: data.metadata ?? null,
    })
    .onConflict(['provider_id', 'document_type'])
    .merge({
      url: data.url ?? null,
      file_name: data.fileName ?? null,
      file_size: data.fileSize ?? null,
      document_number: data.documentNumber ?? null,
      metadata: data.metadata ?? null,
      updated_at: new Date(),
    });
}

export function mapProviderDocumentRow(row: Record<string, unknown>): IProviderDocument {
  return {
    id: String(row.id),
    providerId: String(row.provider_id),
    documentType: row.document_type as ProviderDocumentTypeValue,
    url: row.url ? String(row.url) : undefined,
    fileName: row.file_name ? String(row.file_name) : undefined,
    fileSize: row.file_size != null ? Number(row.file_size) : undefined,
    documentNumber: row.document_number ? String(row.document_number) : undefined,
    metadata: row.metadata as Record<string, unknown> | undefined,
    createdAt: parseDate(row.created_at),
    updatedAt: parseDate(row.updated_at),
  };
}

export async function findProviderDocumentsByProviderId(
  providerId: string
): Promise<IProviderDocument[]> {
  const rows = await dataTable('provider_documents').where({ provider_id: providerId });
  return rows.map((r: Record<string, unknown>) => mapProviderDocumentRow(r));
}

export function mapPaymentRow(row: Record<string, unknown>): IProviderPaymentDetail {
  return {
    id: String(row.id),
    providerId: String(row.provider_id),
    accountHolderName: String(row.account_holder_name),
    bankAccountNumber: String(row.bank_account_number),
    ifsc: String(row.ifsc),
    upiId: row.upi_id ? String(row.upi_id) : undefined,
    gstNumber: row.gst_number ? String(row.gst_number) : undefined,
    createdAt: parseDate(row.created_at),
    updatedAt: parseDate(row.updated_at),
  };
}

export async function findPaymentDetailByProviderId(
  providerId: string
): Promise<IProviderPaymentDetail | null> {
  const row = await dataTable('provider_payment_details')
    .where({ provider_id: providerId })
    .first();
  return row ? mapPaymentRow(row as Record<string, unknown>) : null;
}

export async function upsertProviderPaymentDetail(
  providerId: string,
  data: {
    accountHolderName: string;
    bankAccountNumber: string;
    ifsc: string;
    upiId?: string;
    gstNumber?: string;
  }
): Promise<void> {
  await dataTable('provider_payment_details')
    .insert({
      provider_id: providerId,
      account_holder_name: data.accountHolderName,
      bank_account_number: data.bankAccountNumber,
      ifsc: data.ifsc,
      upi_id: data.upiId ?? null,
      gst_number: data.gstNumber ?? null,
    })
    .onConflict('provider_id')
    .merge({
      account_holder_name: data.accountHolderName,
      bank_account_number: data.bankAccountNumber,
      ifsc: data.ifsc,
      upi_id: data.upiId ?? null,
      gst_number: data.gstNumber ?? null,
      updated_at: new Date(),
    });
}

export async function findActiveHospitals(): Promise<{ name: string }[]> {
  const rows = await dataTable('hospitals')
    .where({ is_active: true })
    .select('name')
    .orderBy('name', 'asc');
  return rows.map((r: { name: string }) => ({ name: String(r.name) }));
}

export async function findActiveSpecializations(): Promise<{ name: string }[]> {
  const rows = await dataTable('specializations')
    .where({ is_active: true })
    .select('name')
    .orderBy('name', 'asc');
  return rows.map((r: { name: string }) => ({ name: String(r.name) }));
}
