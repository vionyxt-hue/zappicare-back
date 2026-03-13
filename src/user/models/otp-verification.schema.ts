import mongoose, { Document, Schema } from 'mongoose';

export interface IOtpVerification extends Document {
  _id: mongoose.Types.ObjectId;
  mobileNumber: string;
  code: string;
  expiresAt: Date;
  attempts: number;
  userId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const otpVerificationSchema = new Schema<IOtpVerification>(
  {
    mobileNumber: { type: String, required: true, index: true },
    code: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

otpVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OtpVerificationModel = mongoose.model<IOtpVerification>(
  'OtpVerification',
  otpVerificationSchema
);
