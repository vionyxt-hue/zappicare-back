export interface IProviderPaymentDetail {
  id: string;
  providerId: string;
  accountHolderName: string;
  bankAccountNumber: string;
  ifsc: string;
  upiId?: string;
  gstNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}
