/**
 * Payment/bank details for one provider (one-to-one with Provider).
 */
export interface IProviderPaymentDetail {
  id: string;
  providerId: string;
  accountHolderName: string;
  bankAccountNumber: string;
  ifsc: string;
  upiId?: string;
  /** Hospital/Institution: GST number */
  gstNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}
