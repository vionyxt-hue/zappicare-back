import mongoose, { Document, Schema } from 'mongoose';

/**
 * Separate schema for payment/bank details of every provider.
 * One record per provider (one-to-one with Provider).
 */
export interface IProviderPaymentDetail extends Document {
  _id: mongoose.Types.ObjectId;
  providerId: mongoose.Types.ObjectId;
  accountHolderName: string;
  bankAccountNumber: string;
  ifsc: string;
  upiId?: string;
  /** Hospital/Institution: GST number */
  gstNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

const providerPaymentDetailSchema = new Schema<IProviderPaymentDetail>(
  {
    providerId: {
      type: Schema.Types.ObjectId,
      ref: 'Provider',
      required: true,
      unique: true,
    },
    accountHolderName: { type: String, required: true, trim: true },
    bankAccountNumber: { type: String, required: true, trim: true },
    ifsc: { type: String, required: true, trim: true },
    upiId: { type: String, trim: true },
    gstNumber: { type: String, trim: true },
  },
  { timestamps: true }
);

export const ProviderPaymentDetailModel = mongoose.model<IProviderPaymentDetail>(
  'ProviderPaymentDetail',
  providerPaymentDetailSchema
);
