export const ProviderType = [
  'Doctor',
  'Nurse/Caretaker',
  'Ambulance',
  'Labs',
  'Hospital/Institution',
] as const;
export type ProviderTypeValue = (typeof ProviderType)[number];

export const Gender = ['Male', 'Female', 'Other'] as const;
export type GenderType = (typeof Gender)[number];

export const WorkLocationType = ['Hospital / Institution', 'Independent Practice'] as const;
export type WorkLocationTypeValue = (typeof WorkLocationType)[number];

export const WorkMode = ['Clinic Visit', 'Home Visit', 'Both'] as const;
export type WorkModeValue = (typeof WorkMode)[number];

export const OnlineConsultationMode = ['Video Call', 'Audio Call', 'Chat'] as const;
export type OnlineConsultationModeValue = (typeof OnlineConsultationMode)[number];

export const DayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export type DayOfWeekValue = (typeof DayOfWeek)[number];

export const OnboardingStep = [
  'personal_info',
  'professional_details',
  'documents',
  'bank_details',
  'submitted',
] as const;
export type OnboardingStepValue = (typeof OnboardingStep)[number];

export const VerificationStatus = ['pending', 'approved', 'rejected'] as const;
export type VerificationStatusValue = (typeof VerificationStatus)[number];

export const GovernmentIdType = ['Aadhar', 'Driving License'] as const;
export type GovernmentIdTypeValue = (typeof GovernmentIdType)[number];

/** Lab services for dropdown / validation (optional; can also accept free text) */
export const LabService = [
  'Blood Sugar Test',
  'Liver Function Test (LFT)',
  'Vitamin D & Vitamin B12',
  'Urine Routine & Culture',
  'Thyroid Function Test',
  'HIV, HBsAg, HCV Screening',
] as const;
export type LabServiceValue = (typeof LabService)[number];

/** Ambulance types for dropdown */
export const AmbulanceType = [
  'Basic Life Support (BLS) Ambulance',
  'Patient Transport Ambulance',
] as const;
export type AmbulanceTypeValue = (typeof AmbulanceType)[number];

/** Ambulance coverage area (multi-select) */
export const CoverageArea = [
  'Local',
  'Highway',
  'Airport Transfers',
  'Rural / Remote Area Coverage',
  'Interstate',
] as const;
export type CoverageAreaValue = (typeof CoverageArea)[number];

/** Nurse/Caretaker services (multi-select) */
export const NurseService = [
  'Elder Care',
  'Baby Care',
  'Post Surgery Care',
  'Pregnancy Care',
  'Disability Care',
] as const;
export type NurseServiceValue = (typeof NurseService)[number];

/** Hospital/Institution departments (multi-select) */
export const HospitalDepartment = [
  'Emergency',
  'General Medicine',
  'General Surgery',
  'Cardiology',
  'Radiology / Imaging',
  'ICU',
  'Pathology / Lab Medicine',
] as const;
export type HospitalDepartmentValue = (typeof HospitalDepartment)[number];
