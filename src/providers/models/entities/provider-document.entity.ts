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
