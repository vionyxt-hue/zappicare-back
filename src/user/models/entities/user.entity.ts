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
  isPhoneVerified: boolean;
  isProfileCompleted: boolean;
  isStepperCompleted: boolean;
  currentStep: number;
  role: UserRoleType;
  googleId?: string;
  appleId?: string;
  facebookId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
