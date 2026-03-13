import mongoose, { Document, Schema } from 'mongoose';

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
 * Separate schema for documents of all kinds of providers (common collection).
 * Multiple records per provider (one per document type or per file).
 */
export interface IProviderDocument extends Document {
  _id: mongoose.Types.ObjectId;
  providerId: mongoose.Types.ObjectId;
  documentType: ProviderDocumentTypeValue;
  /** For file uploads */
  url?: string;
  fileName?: string;
  fileSize?: number;
  /** For text-only (e.g. medical registration number) */
  documentNumber?: string;
  /** Extra metadata (e.g. governmentIdType: 'Aadhar' | 'Driving License') */
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const providerDocumentSchema = new Schema<IProviderDocument>(
  {
    providerId: {
      type: Schema.Types.ObjectId,
      ref: 'Provider',
      required: true,
    },
    documentType: {
      type: String,
      required: true,
      enum: ProviderDocumentType,
    },
    url: { type: String, trim: true },
    fileName: { type: String, trim: true },
    fileSize: { type: Number },
    documentNumber: { type: String, trim: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

providerDocumentSchema.index({ providerId: 1, documentType: 1 }, { unique: true });

export const ProviderDocumentModel = mongoose.model<IProviderDocument>(
  'ProviderDocument',
  providerDocumentSchema
);
