export const UserRole = ['user', 'provider', 'admin'] as const;
export type UserRoleType = (typeof UserRole)[number];

export const Gender = ['Male', 'Female', 'Other'] as const;
export type GenderType = (typeof Gender)[number];

export interface UserEntity {
  id: string;
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
  /** Phone OTP verified (step 1); kept in sync with flows that verify OTP. */
  isPhoneVerified: boolean;
  /** Register / account stepper completed (step 2). */
  isProfileCompleted: boolean;
  /** Provider onboarding stepper (bank step) completed. */
  isStepperCompleted: boolean;
  /** Derived: 0–4; see `UserOnboardingStep`. */
  currentStep: number;
  role: UserRoleType;
  googleId?: string;
  appleId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
