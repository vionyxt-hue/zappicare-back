import { z } from 'zod';
import {
  ProviderType,
  Gender,
  WorkLocationType,
  WorkMode,
  OnlineConsultationMode,
  DayOfWeek,
  CoverageArea,
  NurseService,
  HospitalDepartment,
} from '../enums/provider.enum';
const phoneRegex = /^[0-9]{10,15}$/;

/**
 * Personal info for onboarding. Only providerType is required when coming from
 * provider verification (register) — name, phone, email, gender are pre-filled from User.
 * All fields can be sent to override or when updating existing provider.
 */
export const PersonalInfoSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').trim(),
  firstName: z.string().min(1).trim().optional(),
  lastName: z.string().min(1).trim().optional(),
  phoneNumber: z.string().regex(phoneRegex).optional(),
  alternateMobileNumber: z.string().regex(phoneRegex).optional().or(z.literal('')),
  email: z.string().email('Invalid email').optional(),
  providerType: z.enum(ProviderType as unknown as [string, ...string[]]),
  gender: z.enum(Gender as unknown as [string, ...string[]]).optional(),
});

export const AvailabilitySlotSchema = z.object({
  dayOfWeek: z.enum(DayOfWeek as unknown as [string, ...string[]]),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
});

/** Lab professional details (when providerType is Labs) */
export const LabProfessionalDetailsSchema = z
  .object({
    workLocationType: z.enum(WorkLocationType as unknown as [string, ...string[]]),
    labName: z.string().trim().optional(),
    registrationCertificationNumber: z.string().trim().optional(),
    address: z.string().trim().optional(),
    hospitalInstitutionId: z.string().optional(),
    hospitalInstitutionName: z.string().optional(),
    teamCode: z.string().trim().optional(),
    services: z.array(z.string()).min(1, 'Select at least one service'),
    operatingHours: z.array(AvailabilitySlotSchema).min(1, 'Add at least one operating hours slot'),
  })
  .refine(
    (data) => {
      if (data.workLocationType === 'Independent Practice') {
        return (
          !!data.labName?.trim() &&
          !!data.registrationCertificationNumber?.trim() &&
          !!data.address?.trim()
        );
      }
      return (
        (!!data.hospitalInstitutionId || !!data.hospitalInstitutionName?.trim()) &&
        !!data.teamCode?.trim()
      );
    },
    {
      message:
        'Independent Practice: lab name, registration number and address required. Hospital/Institution: hospital name and team code required.',
    }
  );

/** Ambulance professional details (when providerType is Ambulance) */
export const AmbulanceProfessionalDetailsSchema = z
  .object({
    workLocationType: z.enum(WorkLocationType as unknown as [string, ...string[]]),
    driverName: z.string().trim().optional(),
    vehicleRegistrationNumber: z.string().trim().optional(),
    driverLicenseNumber: z.string().trim().optional(),
    ambulanceType: z.string().min(1, 'Ambulance type is required').trim(),
    coverageArea: z
      .array(z.enum(CoverageArea as unknown as [string, ...string[]]))
      .min(1, 'Select at least one coverage area'),
    availabilityHours: z.string().trim().optional(),
    hospitalInstitutionId: z.string().optional(),
    hospitalInstitutionName: z.string().optional(),
    teamCode: z.string().trim().optional(),
  })
  .refine(
    (data) => {
      if (data.workLocationType === 'Independent Practice') {
        return (
          !!data.driverName?.trim() &&
          !!data.vehicleRegistrationNumber?.trim() &&
          !!data.driverLicenseNumber?.trim()
        );
      }
      return (
        (!!data.hospitalInstitutionId || !!data.hospitalInstitutionName?.trim()) &&
        !!data.teamCode?.trim()
      );
    },
    {
      message:
        'Independent Practice: driver name, vehicle registration and driver license required. Hospital/Institution: hospital name and team code required.',
    }
  );

/** Nurse/Caretaker professional details (when providerType is Nurse/Caretaker) */
export const NurseProfessionalDetailsSchema = z
  .object({
    workLocationType: z.enum(WorkLocationType as unknown as [string, ...string[]]),
    certificationLicenseNumber: z.string().trim().optional(),
    services: z
      .array(z.enum(NurseService as unknown as [string, ...string[]]))
      .min(1, 'Select at least one service'),
    coverageArea: z
      .array(z.enum(CoverageArea as unknown as [string, ...string[]]))
      .min(1, 'Select at least one coverage area'),
    availability: z.array(AvailabilitySlotSchema).min(1, 'Add at least one availability slot'),
    hospitalInstitutionId: z.string().optional(),
    hospitalInstitutionName: z.string().optional(),
    teamCode: z.string().trim().optional(),
  })
  .refine(
    (data) => {
      if (data.workLocationType === 'Independent Practice') {
        return !!data.certificationLicenseNumber?.trim();
      }
      return (
        (!!data.hospitalInstitutionId || !!data.hospitalInstitutionName?.trim()) &&
        !!data.teamCode?.trim()
      );
    },
    {
      message:
        'Independent Practice: certification/license number required. Hospital/Institution: hospital name and team code required.',
    }
  );

/** Hospital/Institution professional details (when providerType is Hospital/Institution) */
export const HospitalProfessionalDetailsSchema = z.object({
  hospitalInstituteName: z.string().min(1, 'Hospital/Institute name is required').trim(),
  registrationLicenseNumber: z
    .string()
    .min(1, 'Registration/License number is required')
    .trim(),
  departmentsAvailable: z
    .array(z.enum(HospitalDepartment as unknown as [string, ...string[]]))
    .min(1, 'Select at least one department'),
  operatingHours: z.array(AvailabilitySlotSchema).min(1, 'Add at least one operating hours slot'),
});

export const ProfessionalProfileSchema = z
  .object({
    workLocationType: z.enum(WorkLocationType as unknown as [string, ...string[]]),
    hospitalInstitutionId: z.string().optional(),
    hospitalInstitutionName: z.string().optional(),
    teamCode: z.string().trim().optional(),
    qualification: z.string().trim().optional(),
    experienceYears: z.number().int().min(0).optional(),
    workMode: z.enum(WorkMode as unknown as [string, ...string[]]).optional(),
    onlineConsultationModes: z
      .array(z.enum(OnlineConsultationMode as unknown as [string, ...string[]]))
      .min(1, 'Select at least one consultation mode')
      .optional(),
    address: z.string().trim().optional(),
    specialization: z.string().trim().optional(),
    availability: z.array(AvailabilitySlotSchema).min(1, 'Add at least one availability slot').optional(),
  })
  .refine(
    (data) => {
      if (data.workLocationType === 'Hospital / Institution') {
        return (
          (!!data.hospitalInstitutionId || !!data.hospitalInstitutionName?.trim()) &&
          !!data.teamCode?.trim() &&
          !!data.specialization?.trim()
        );
      }
      return (
        !!data.qualification?.trim() &&
        typeof data.experienceYears === 'number' &&
        !!data.workMode &&
        !!data.onlineConsultationModes?.length &&
        !!data.address?.trim() &&
        !!data.specialization?.trim() &&
        !!data.availability?.length
      );
    },
    {
      message:
        'Hospital / Institution: hospital/institution, specialization, and team code are required. Independent Practice: qualification, experience, work mode, consultation modes, address, specialization, and availability are required.',
    }
  );

/** Doctor documents */
export const DocumentsSchema = z.object({
  medicalRegistrationNumber: z.string().trim().optional(),
  medicalRegistrationCertificateUrl: z.string().url().optional(),
  medicalRegistrationCertificateFileName: z.string().optional(),
  medicalRegistrationCertificateFileSize: z.number().optional(),
  qualificationProofUrl: z.string().url().optional(),
  qualificationProofFileName: z.string().optional(),
  qualificationProofFileSize: z.number().optional(),
  governmentIdUrl: z.string().url().optional(),
  governmentIdFileName: z.string().optional(),
  governmentIdFileSize: z.number().optional(),
  governmentIdType: z.enum(['Aadhar', 'Driving License']).optional(),
  profilePictureUrl: z.string().url().optional(),
  profilePictureFileName: z.string().optional(),
  profilePictureFileSize: z.number().optional(),
  /** Lab: License/Certification (required for lab) */
  licenseCertificateUrl: z.string().url().optional(),
  licenseCertificateFileName: z.string().optional(),
  licenseCertificateFileSize: z.number().optional(),
  /** Lab: Lab entrance photo with logo (optional) */
  labEntrancePhotoUrl: z.string().url().optional(),
  labEntrancePhotoFileName: z.string().optional(),
  labEntrancePhotoFileSize: z.number().optional(),
  /** Ambulance: Vehicle registration papers (required for ambulance) */
  vehicleRegistrationPapersUrl: z.string().url().optional(),
  vehicleRegistrationPapersFileName: z.string().optional(),
  vehicleRegistrationPapersFileSize: z.number().optional(),
  /** Ambulance: Driver license (required for ambulance) */
  driverLicenseUrl: z.string().url().optional(),
  driverLicenseFileName: z.string().optional(),
  driverLicenseFileSize: z.number().optional(),
  /** Hospital/Institution: Hospital license (required for hospital) */
  hospitalLicenseUrl: z.string().url().optional(),
  hospitalLicenseFileName: z.string().optional(),
  hospitalLicenseFileSize: z.number().optional(),
  /** Hospital/Institution: Hospital logo (optional) */
  hospitalLogoUrl: z.string().url().optional(),
  hospitalLogoFileName: z.string().optional(),
  hospitalLogoFileSize: z.number().optional(),
});

export const BankDetailsSchema = z.object({
  accountHolderName: z.string().min(1, 'Account holder name is required').trim(),
  bankAccountNumber: z.string().min(1, 'Bank account number is required').trim(),
  ifsc: z.string().min(1, 'IFSC is required').trim(),
  upiId: z.string().trim().optional(),
  /** Hospital/Institution: GST number (optional) */
  gstNumber: z.string().trim().optional(),
});

export type PersonalInfoDto = z.infer<typeof PersonalInfoSchema>;
export type AvailabilitySlotDto = z.infer<typeof AvailabilitySlotSchema>;
export type LabProfessionalDetailsDto = z.infer<typeof LabProfessionalDetailsSchema>;
export type AmbulanceProfessionalDetailsDto = z.infer<typeof AmbulanceProfessionalDetailsSchema>;
export type NurseProfessionalDetailsDto = z.infer<typeof NurseProfessionalDetailsSchema>;
export type HospitalProfessionalDetailsDto = z.infer<typeof HospitalProfessionalDetailsSchema>;
export type ProfessionalProfileDto = z.infer<typeof ProfessionalProfileSchema>;
export type DocumentsDto = z.infer<typeof DocumentsSchema>;
export type BankDetailsDto = z.infer<typeof BankDetailsSchema>;
