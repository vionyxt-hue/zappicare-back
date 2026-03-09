import mongoose, { Document, Schema } from 'mongoose';

export const UserRole = ['user', 'provider'] as const;
export type UserRoleType = (typeof UserRole)[number];

export const Gender = ['Male', 'Female', 'Other'] as const;
export type GenderType = (typeof Gender)[number];

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
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
  role: UserRoleType;
  googleId?: string;
  appleId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    mobileNumber: { type: String, required: true, unique: true, trim: true },
    countryCode: { type: String, trim: true, default: '+91' },
    email: { type: String, sparse: true, unique: true, lowercase: true, trim: true },
    password: { type: String, select: false },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    emergencyNumber: { type: String, trim: true },
    gender: { type: String, enum: Gender },
    referCode: { type: String, trim: true },
    termsAndConditionsAccepted: { type: Boolean, required: true, default: false },
    isMobileVerified: { type: Boolean, required: true, default: false },
    role: { type: String, required: true, enum: UserRole },
    googleId: { type: String, sparse: true, unique: true },
    appleId: { type: String, sparse: true, unique: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.index({ mobileNumber: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ role: 1 });
userSchema.index({ googleId: 1 }, { unique: true, sparse: true });
userSchema.index({ appleId: 1 }, { unique: true, sparse: true });

export const UserModel = mongoose.model<IUser>('User', userSchema);
