/** Document types common across all provider types (Doctor, Lab, Ambulance, Nurse, Hospital) */
export const ProviderDocumentType = [
  'medicalRegistrationNumber',
  'medicalRegistrationCertificate',
  'qualificationProof',
  'governmentId',
  'profilePicture',
  'licenseCertificate',
  'labEntrancePhoto',
  'vehicleRegistrationPapers',
  'driverLicense',
  'hospitalLicense',
  'hospitalLogo',
] as const;
export type ProviderDocumentTypeValue = (typeof ProviderDocumentType)[number];

/**
 * Separate table for documents of all kinds of providers (common collection).
 * Multiple records per provider (one per document type or per file).
 */
export interface IProviderDocument {
  id: string;
  providerId: string;
  documentType: ProviderDocumentTypeValue;
  url?: string;
  fileName?: string;
  fileSize?: number;
  documentNumber?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}
