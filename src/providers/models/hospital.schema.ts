import mongoose, { Document, Schema } from 'mongoose';

export interface IHospital extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const hospitalSchema = new Schema<IHospital>(
  {
    name: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

hospitalSchema.index({ name: 1 });

export const HospitalModel = mongoose.model<IHospital>('Hospital', hospitalSchema);
