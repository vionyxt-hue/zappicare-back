import mongoose, { Document, Schema } from 'mongoose';

export interface ISpecialization extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const specializationSchema = new Schema<ISpecialization>(
  {
    name: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

specializationSchema.index({ name: 1 });

export const SpecializationModel = mongoose.model<ISpecialization>(
  'Specialization',
  specializationSchema
);
