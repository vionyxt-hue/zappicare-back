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
  /** Availability e.g. "15:00" hours or description */
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
  onboardingStep: OnboardingStepValue;
  verificationStatus: VerificationStatusValue;
  rejectionReason?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
