export interface OtpVerificationEntity {
  id: string;
  mobileNumber: string;
  code: string;
  expiresAt: Date;
  attempts: number;
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
}
