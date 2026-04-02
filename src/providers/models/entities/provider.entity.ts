import type {
  ProviderTypeValue,
  GenderType,
  WorkLocationTypeValue,
  WorkModeValue,
  OnlineConsultationModeValue,
  DayOfWeekValue,
  OnboardingStepValue,
  VerificationStatusValue,
} from '../../enums/provider.enum';

export interface IAvailabilitySlot {
  dayOfWeek: DayOfWeekValue;
  startTime: string;
  endTime: string;
}

export interface IProfessionalProfile {
  _id?: string;
  workLocationType: WorkLocationTypeValue;
  hospitalInstitutionId?: string;
  hospitalInstitutionName?: string;
  teamCode?: string;
  qualification?: string;
  experienceYears?: number;
  workMode?: WorkModeValue;
  onlineConsultationModes?: OnlineConsultationModeValue[];
  address?: string;
  specialization?: string;
  availability?: IAvailabilitySlot[];
}

export interface ILabProfessionalDetails {
  workLocationType: WorkLocationTypeValue;
  labName?: string;
  registrationCertificationNumber?: string;
  address?: string;
  hospitalInstitutionId?: string;
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
  availabilityHours?: string;
  hospitalInstitutionId?: string;
  hospitalInstitutionName?: string;
  teamCode?: string;
}

export interface INurseProfessionalDetails {
  workLocationType: WorkLocationTypeValue;
  certificationLicenseNumber?: string;
  services: string[];
  coverageArea: string[];
  availability: IAvailabilitySlot[];
  hospitalInstitutionId?: string;
  hospitalInstitutionName?: string;
  teamCode?: string;
}

export interface IHospitalProfessionalDetails {
  hospitalInstituteName: string;
  registrationLicenseNumber: string;
  departmentsAvailable: string[];
  operatingHours: IAvailabilitySlot[];
}

export interface IProvider {
  id: string;
  userId: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    /** E.164-style calling prefix only, e.g. +91 (not merged with phoneNumber). Omitted on legacy rows until re-saved. */
    countryCode?: string;
    /** National mobile number digits only (no country prefix). */
    phoneNumber: string;
    /** Alternate line country prefix only (e.g. +91); use with `alternateMobileNumber`. */
    alternateCountryCode?: string;
    /** Alternate national number only; pair with `alternateCountryCode`. */
    alternateMobileNumber?: string;
    /** Optional referral code captured at personal-info step (also stored on `users.refer_code` when set). */
    referCode?: string;
    email: string;
    providerType: ProviderTypeValue;
    gender?: GenderType;
  };
  professionalProfiles: IProfessionalProfile[];
  labProfessionalDetails?: ILabProfessionalDetails;
  ambulanceProfessionalDetails?: IAmbulanceProfessionalDetails;
  nurseProfessionalDetails?: INurseProfessionalDetails;
  hospitalProfessionalDetails?: IHospitalProfessionalDetails;
  onboardingStep: OnboardingStepValue;
  verificationStatus: VerificationStatusValue;
  rejectionReason?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
