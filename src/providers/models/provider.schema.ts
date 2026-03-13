import mongoose, { Document, Schema } from 'mongoose';
import type {
  ProviderTypeValue,
  GenderType,
  WorkLocationTypeValue,
  WorkModeValue,
  OnlineConsultationModeValue,
  DayOfWeekValue,
  OnboardingStepValue,
  VerificationStatusValue,
} from './enums';

const phoneRegex = /^[0-9]{10,15}$/;

export interface IAvailabilitySlot {
  dayOfWeek: DayOfWeekValue;
  startTime: string;
  endTime: string;
}

export interface IProfessionalProfile {
  workLocationType: WorkLocationTypeValue;
  hospitalInstitutionId?: mongoose.Types.ObjectId;
  hospitalInstitutionName?: string;
  teamCode?: string;
  qualification: string;
  experienceYears: number;
  workMode: WorkModeValue;
  onlineConsultationModes: OnlineConsultationModeValue[];
  address: string;
  specialization: string;
  availability: IAvailabilitySlot[];
}

export interface ILabProfessionalDetails {
  workLocationType: WorkLocationTypeValue;
  labName?: string;
  registrationCertificationNumber?: string;
  address?: string;
  hospitalInstitutionId?: mongoose.Types.ObjectId;
  hospitalInstitutionName?: string;
  teamCode?: string;
  services: string[];
  operatingHours: IAvailabilitySlot[];
}

export interface IAmbulanceProfessionalDetails {
  workLocationType: WorkLocationTypeValue;
  driverName?: string;
  vehicleRegistrationNumber?: string;
  driverLicenseNumber?: string;
  ambulanceType?: string;
  coverageArea: string[];
  /** Availability e.g. "15:00" hours or description */
  availabilityHours?: string;
  hospitalInstitutionId?: mongoose.Types.ObjectId;
  hospitalInstitutionName?: string;
  teamCode?: string;
}

export interface INurseProfessionalDetails {
  workLocationType: WorkLocationTypeValue;
  certificationLicenseNumber?: string;
  services: string[];
  coverageArea: string[];
  availability: IAvailabilitySlot[];
  hospitalInstitutionId?: mongoose.Types.ObjectId;
  hospitalInstitutionName?: string;
  teamCode?: string;
}

export interface IHospitalProfessionalDetails {
  hospitalInstituteName: string;
  registrationLicenseNumber: string;
  departmentsAvailable: string[];
  operatingHours: IAvailabilitySlot[];
}

export interface IProvider extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  personalInfo: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    alternateMobileNumber?: string;
    email: string;
    providerType: ProviderTypeValue;
    gender?: GenderType;
  };
  professionalProfiles: IProfessionalProfile[];
  /** Set when providerType is Labs */
  labProfessionalDetails?: ILabProfessionalDetails;
  /** Set when providerType is Ambulance */
  ambulanceProfessionalDetails?: IAmbulanceProfessionalDetails;
  /** Set when providerType is Nurse/Caretaker */
  nurseProfessionalDetails?: INurseProfessionalDetails;
  /** Set when providerType is Hospital/Institution */
  hospitalProfessionalDetails?: IHospitalProfessionalDetails;
  /** Documents and payment details are in separate schemas: ProviderDocument, ProviderPaymentDetail */
  onboardingStep: OnboardingStepValue;
  verificationStatus: VerificationStatusValue;
  rejectionReason?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const availabilitySlotSchema = new Schema<IAvailabilitySlot>(
  {
    dayOfWeek: { type: String, required: true, enum: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
  },
  { _id: false }
);

const professionalProfileSchema = new Schema<IProfessionalProfile>(
  {
    workLocationType: {
      type: String,
      required: true,
      enum: ['Hospital / Institution', 'Independent Practice'],
    },
    hospitalInstitutionId: { type: Schema.Types.ObjectId, ref: 'Hospital' },
    hospitalInstitutionName: { type: String, trim: true },
    teamCode: { type: String, trim: true },
    qualification: { type: String, required: true, trim: true },
    experienceYears: { type: Number, required: true },
    workMode: { type: String, required: true, enum: ['Clinic Visit', 'Home Visit', 'Both'] },
    onlineConsultationModes: {
      type: [String],
      required: true,
      enum: ['Video Call', 'Audio Call', 'Chat'],
    },
    address: { type: String, required: true, trim: true },
    specialization: { type: String, required: true, trim: true },
    availability: { type: [availabilitySlotSchema], default: [] },
  },
  { _id: true }
);

const labProfessionalDetailsSchema = new Schema<ILabProfessionalDetails>(
  {
    workLocationType: {
      type: String,
      required: true,
      enum: ['Hospital / Institution', 'Independent Practice'],
    },
    labName: { type: String, trim: true },
    registrationCertificationNumber: { type: String, trim: true },
    address: { type: String, trim: true },
    hospitalInstitutionId: { type: Schema.Types.ObjectId, ref: 'Hospital' },
    hospitalInstitutionName: { type: String, trim: true },
    teamCode: { type: String, trim: true },
    services: { type: [String], default: [] },
    operatingHours: { type: [availabilitySlotSchema], default: [] },
  },
  { _id: false }
);

const ambulanceProfessionalDetailsSchema = new Schema<IAmbulanceProfessionalDetails>(
  {
    workLocationType: {
      type: String,
      required: true,
      enum: ['Hospital / Institution', 'Independent Practice'],
    },
    driverName: { type: String, trim: true },
    vehicleRegistrationNumber: { type: String, trim: true },
    driverLicenseNumber: { type: String, trim: true },
    ambulanceType: { type: String, trim: true },
    coverageArea: { type: [String], default: [] },
    availabilityHours: { type: String, trim: true },
    hospitalInstitutionId: { type: Schema.Types.ObjectId, ref: 'Hospital' },
    hospitalInstitutionName: { type: String, trim: true },
    teamCode: { type: String, trim: true },
  },
  { _id: false }
);

const nurseProfessionalDetailsSchema = new Schema<INurseProfessionalDetails>(
  {
    workLocationType: {
      type: String,
      required: true,
      enum: ['Hospital / Institution', 'Independent Practice'],
    },
    certificationLicenseNumber: { type: String, trim: true },
    services: { type: [String], default: [] },
    coverageArea: { type: [String], default: [] },
    availability: { type: [availabilitySlotSchema], default: [] },
    hospitalInstitutionId: { type: Schema.Types.ObjectId, ref: 'Hospital' },
    hospitalInstitutionName: { type: String, trim: true },
    teamCode: { type: String, trim: true },
  },
  { _id: false }
);

const hospitalProfessionalDetailsSchema = new Schema<IHospitalProfessionalDetails>(
  {
    hospitalInstituteName: { type: String, required: true, trim: true },
    registrationLicenseNumber: { type: String, required: true, trim: true },
    departmentsAvailable: { type: [String], default: [] },
    operatingHours: { type: [availabilitySlotSchema], default: [] },
  },
  { _id: false }
);

const providerSchema = new Schema<IProvider>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    personalInfo: {
      firstName: { type: String, required: true, trim: true },
      lastName: { type: String, required: true, trim: true },
      phoneNumber: { type: String, required: true, match: phoneRegex },
      alternateMobileNumber: { type: String, match: phoneRegex },
      email: { type: String, required: true, lowercase: true, trim: true },
      providerType: {
        type: String,
        required: true,
        enum: ['Doctor', 'Nurse/Caretaker', 'Ambulance', 'Labs', 'Hospital/Institution'],
      },
      gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    },
    professionalProfiles: { type: [professionalProfileSchema], default: [] },
    labProfessionalDetails: { type: labProfessionalDetailsSchema },
    ambulanceProfessionalDetails: { type: ambulanceProfessionalDetailsSchema },
    nurseProfessionalDetails: { type: nurseProfessionalDetailsSchema },
    hospitalProfessionalDetails: { type: hospitalProfessionalDetailsSchema },
    onboardingStep: {
      type: String,
      required: true,
      enum: ['personal_info', 'professional_details', 'documents', 'bank_details', 'submitted'],
      default: 'personal_info',
    },
    verificationStatus: {
      type: String,
      required: true,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    rejectionReason: { type: String },
    approvedAt: { type: Date },
  },
  { timestamps: true }
);

providerSchema.index({ verificationStatus: 1 });
providerSchema.index({ 'personalInfo.email': 1 });

export const ProviderModel = mongoose.model<IProvider>('Provider', providerSchema);
