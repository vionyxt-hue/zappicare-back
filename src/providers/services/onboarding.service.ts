import mongoose from 'mongoose';
import { ProviderModel } from '../models/provider.schema';
import { ProviderDocumentModel } from '../models/provider-document.schema';
import { UserModel } from '../../user/models/user.schema';
import { ProviderPaymentDetailModel } from '../models/provider-payment-detail.schema';
import { HospitalModel } from '../models/hospital.schema';
import { SpecializationModel } from '../models/specialization.schema';
import { ResponseService, ResponseCode } from '../../core/response-management';
import type { IProviderDocument } from '../models/provider-document.schema';
import type {
  PersonalInfoDto,
  ProfessionalProfileDto,
  DocumentsDto,
  BankDetailsDto,
  LabProfessionalDetailsDto,
  AmbulanceProfessionalDetailsDto,
  NurseProfessionalDetailsDto,
  HospitalProfessionalDetailsDto,
} from '../models/onboarding.dto';
import type {
  IProvider,
  IProfessionalProfile,
  IAvailabilitySlot,
  ILabProfessionalDetails,
  IAmbulanceProfessionalDetails,
  INurseProfessionalDetails,
  IHospitalProfessionalDetails,
} from '../models/provider.schema';
import type {
  ProviderTypeValue,
  GenderType,
  WorkLocationTypeValue,
  WorkModeValue,
  OnlineConsultationModeValue,
  DayOfWeekValue,
} from '../models/enums';
import {
  LabService,
  AmbulanceType,
  CoverageArea,
  NurseService,
  HospitalDepartment,
} from '../models/enums';

const responseService = new ResponseService();

export class ProviderOnboardingService {
  async getProvider(userId: string): Promise<IProvider | null> {
    return ProviderModel.findOne({ userId: new mongoose.Types.ObjectId(userId) });
  }

  async getProviderByUserId(userId: string) {
    const provider = await ProviderModel.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    }).lean();
    return provider;
  }

  /** Returns provider _id for the given user (for S3 key prefix, etc.). */
  async getProviderIdByUserId(userId: string): Promise<mongoose.Types.ObjectId | null> {
    const doc = await ProviderModel.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    })
      .select('_id')
      .lean();
    return doc?._id ?? null;
  }

  async submitPersonalInfo(userId: string, dto: PersonalInfoDto) {
    const existing = await this.getProvider(userId);
    let provider: IProvider;

    if (existing) {
      existing.personalInfo = {
        firstName: dto.firstName ?? existing.personalInfo.firstName,
        lastName: dto.lastName ?? existing.personalInfo.lastName,
        phoneNumber: dto.phoneNumber ?? existing.personalInfo.phoneNumber,
        alternateMobileNumber: dto.alternateMobileNumber ?? existing.personalInfo.alternateMobileNumber,
        email: (dto.email ?? existing.personalInfo.email).toLowerCase(),
        providerType: (dto.providerType as ProviderTypeValue) ?? existing.personalInfo.providerType,
        gender: (dto.gender as GenderType | undefined) ?? existing.personalInfo.gender,
      };
      existing.onboardingStep = 'professional_details';
      await existing.save();
      provider = existing;
    } else {
      const user = await UserModel.findById(userId).lean();
      if (!user) return responseService.notFound('User not found');
      const email = (dto.email ?? user.email)?.toLowerCase();
      if (!email) return responseService.badRequest('Email is required');
      provider = await ProviderModel.create({
        userId: new mongoose.Types.ObjectId(userId),
        personalInfo: {
          firstName: dto.firstName ?? user.firstName,
          lastName: dto.lastName ?? user.lastName,
          phoneNumber: dto.phoneNumber ?? user.mobileNumber,
          alternateMobileNumber: dto.alternateMobileNumber || undefined,
          email,
          providerType: dto.providerType as ProviderTypeValue,
          gender: (dto.gender as GenderType | undefined) ?? user.gender,
        },
        professionalProfiles: [],
        onboardingStep: 'professional_details',
        verificationStatus: 'pending',
      });
    }

    const response = await this.toProviderResponse(provider);
    return responseService.success(
      ResponseCode.CREATED,
      'Personal information saved',
      response
    );
  }

  async addProfessionalProfile(userId: string, dto: ProfessionalProfileDto) {
    const provider = await this.getProvider(userId);
    if (!provider) return responseService.notFound('Complete personal information first');

    const profile: IProfessionalProfile = {
      workLocationType: dto.workLocationType as WorkLocationTypeValue,
      hospitalInstitutionId: dto.hospitalInstitutionId
        ? new mongoose.Types.ObjectId(dto.hospitalInstitutionId)
        : undefined,
      hospitalInstitutionName: dto.hospitalInstitutionName,
      teamCode: dto.teamCode,
      qualification: dto.qualification,
      experienceYears: dto.experienceYears,
      workMode: dto.workMode as WorkModeValue,
      onlineConsultationModes: dto.onlineConsultationModes as OnlineConsultationModeValue[],
      address: dto.address,
      specialization: dto.specialization,
      availability: dto.availability as IAvailabilitySlot[],
    };

    provider.professionalProfiles.push(profile);
    provider.onboardingStep = 'professional_details';
    await provider.save();

    const response = await this.toProviderResponse(provider);
    return responseService.success(
      ResponseCode.CREATED,
      'Professional profile added',
      response
    );
  }

  async updateProfessionalProfile(
    userId: string,
    profileIndex: number,
    dto: ProfessionalProfileDto
  ) {
    const provider = await this.getProviderByUserId(userId);
    if (!provider) return responseService.notFound('Provider not found');

    const doc = await ProviderModel.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    });
    if (!doc || !doc.professionalProfiles[profileIndex]) {
      return responseService.notFound('Professional profile not found');
    }

    doc.professionalProfiles[profileIndex] = {
      workLocationType: dto.workLocationType as WorkLocationTypeValue,
      hospitalInstitutionId: dto.hospitalInstitutionId
        ? new mongoose.Types.ObjectId(dto.hospitalInstitutionId)
        : undefined,
      hospitalInstitutionName: dto.hospitalInstitutionName,
      teamCode: dto.teamCode,
      qualification: dto.qualification,
      experienceYears: dto.experienceYears,
      workMode: dto.workMode as WorkModeValue,
      onlineConsultationModes: dto.onlineConsultationModes as OnlineConsultationModeValue[],
      address: dto.address,
      specialization: dto.specialization,
      availability: dto.availability as IAvailabilitySlot[],
    };
    await doc.save();

    const response = await this.toProviderResponse(doc);
    return responseService.success(
      ResponseCode.UPDATED,
      'Professional profile updated',
      response
    );
  }

  async submitLabProfessionalDetails(userId: string, dto: LabProfessionalDetailsDto) {
    const provider = await this.getProvider(userId);
    if (!provider) return responseService.notFound('Complete personal information first');
    if (provider.personalInfo.providerType !== 'Labs') {
      return responseService.badRequest('Lab professional details are only for Labs provider type');
    }

    const labDetails: ILabProfessionalDetails = {
      workLocationType: dto.workLocationType as WorkLocationTypeValue,
      labName: dto.labName,
      registrationCertificationNumber: dto.registrationCertificationNumber,
      address: dto.address,
      hospitalInstitutionId: dto.hospitalInstitutionId
        ? new mongoose.Types.ObjectId(dto.hospitalInstitutionId)
        : undefined,
      hospitalInstitutionName: dto.hospitalInstitutionName,
      teamCode: dto.teamCode,
      services: dto.services,
      operatingHours: dto.operatingHours as IAvailabilitySlot[],
    };

    provider.labProfessionalDetails = labDetails;
    provider.onboardingStep = 'professional_details';
    await provider.save();

    const response = await this.toProviderResponse(provider);
    return responseService.success(
      ResponseCode.CREATED,
      'Lab professional details saved',
      response
    );
  }

  async submitAmbulanceProfessionalDetails(
    userId: string,
    dto: AmbulanceProfessionalDetailsDto
  ) {
    const provider = await this.getProvider(userId);
    if (!provider) return responseService.notFound('Complete personal information first');
    if (provider.personalInfo.providerType !== 'Ambulance') {
      return responseService.badRequest(
        'Ambulance professional details are only for Ambulance provider type'
      );
    }

    const ambulanceDetails: IAmbulanceProfessionalDetails = {
      workLocationType: dto.workLocationType as WorkLocationTypeValue,
      driverName: dto.driverName,
      vehicleRegistrationNumber: dto.vehicleRegistrationNumber,
      driverLicenseNumber: dto.driverLicenseNumber,
      ambulanceType: dto.ambulanceType,
      coverageArea: dto.coverageArea,
      availabilityHours: dto.availabilityHours,
      hospitalInstitutionId: dto.hospitalInstitutionId
        ? new mongoose.Types.ObjectId(dto.hospitalInstitutionId)
        : undefined,
      hospitalInstitutionName: dto.hospitalInstitutionName,
      teamCode: dto.teamCode,
    };

    provider.ambulanceProfessionalDetails = ambulanceDetails;
    provider.onboardingStep = 'professional_details';
    await provider.save();

    const response = await this.toProviderResponse(provider);
    return responseService.success(
      ResponseCode.CREATED,
      'Ambulance professional details saved',
      response
    );
  }

  async submitNurseProfessionalDetails(userId: string, dto: NurseProfessionalDetailsDto) {
    const provider = await this.getProvider(userId);
    if (!provider) return responseService.notFound('Complete personal information first');
    if (provider.personalInfo.providerType !== 'Nurse/Caretaker') {
      return responseService.badRequest(
        'Nurse professional details are only for Nurse/Caretaker provider type'
      );
    }

    const nurseDetails: INurseProfessionalDetails = {
      workLocationType: dto.workLocationType as WorkLocationTypeValue,
      certificationLicenseNumber: dto.certificationLicenseNumber,
      services: dto.services,
      coverageArea: dto.coverageArea,
      availability: dto.availability as IAvailabilitySlot[],
      hospitalInstitutionId: dto.hospitalInstitutionId
        ? new mongoose.Types.ObjectId(dto.hospitalInstitutionId)
        : undefined,
      hospitalInstitutionName: dto.hospitalInstitutionName,
      teamCode: dto.teamCode,
    };

    provider.nurseProfessionalDetails = nurseDetails;
    provider.onboardingStep = 'professional_details';
    await provider.save();

    const response = await this.toProviderResponse(provider);
    return responseService.success(
      ResponseCode.CREATED,
      'Nurse professional details saved',
      response
    );
  }

  async submitHospitalProfessionalDetails(
    userId: string,
    dto: HospitalProfessionalDetailsDto
  ) {
    const provider = await this.getProvider(userId);
    if (!provider) return responseService.notFound('Complete personal information first');
    if (provider.personalInfo.providerType !== 'Hospital/Institution') {
      return responseService.badRequest(
        'Hospital professional details are only for Hospital/Institution provider type'
      );
    }

    const hospitalDetails: IHospitalProfessionalDetails = {
      hospitalInstituteName: dto.hospitalInstituteName,
      registrationLicenseNumber: dto.registrationLicenseNumber,
      departmentsAvailable: dto.departmentsAvailable,
      operatingHours: dto.operatingHours as IAvailabilitySlot[],
    };

    provider.hospitalProfessionalDetails = hospitalDetails;
    provider.onboardingStep = 'professional_details';
    await provider.save();

    const response = await this.toProviderResponse(provider);
    return responseService.success(
      ResponseCode.CREATED,
      'Hospital/Institution professional details saved',
      response
    );
  }

  private async upsertProviderDocument(
    providerId: mongoose.Types.ObjectId,
    documentType: string,
    data: {
      url?: string;
      fileName?: string;
      fileSize?: number;
      documentNumber?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<void> {
    await ProviderDocumentModel.findOneAndUpdate(
      { providerId, documentType },
      { $set: data },
      { upsert: true, new: true }
    );
  }

  async submitDocuments(userId: string, dto: DocumentsDto) {
    const provider = await this.getProviderByUserId(userId);
    if (!provider) return responseService.notFound('Provider not found');

    const doc = await ProviderModel.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    });
    if (!doc) return responseService.notFound('Provider not found');

    const providerId = doc._id;

    if (dto.medicalRegistrationNumber != null) {
      await this.upsertProviderDocument(providerId, 'medicalRegistrationNumber', {
        documentNumber: dto.medicalRegistrationNumber,
      });
    }
    if (
      dto.medicalRegistrationCertificateUrl &&
      dto.medicalRegistrationCertificateFileName != null &&
      dto.medicalRegistrationCertificateFileSize != null
    ) {
      await this.upsertProviderDocument(providerId, 'medicalRegistrationCertificate', {
        url: dto.medicalRegistrationCertificateUrl,
        fileName: dto.medicalRegistrationCertificateFileName,
        fileSize: dto.medicalRegistrationCertificateFileSize,
      });
    }
    if (
      dto.qualificationProofUrl &&
      dto.qualificationProofFileName != null &&
      dto.qualificationProofFileSize != null
    ) {
      await this.upsertProviderDocument(providerId, 'qualificationProof', {
        url: dto.qualificationProofUrl,
        fileName: dto.qualificationProofFileName,
        fileSize: dto.qualificationProofFileSize,
      });
    }
    if (
      dto.governmentIdUrl &&
      dto.governmentIdFileName != null &&
      dto.governmentIdFileSize != null
    ) {
      await this.upsertProviderDocument(providerId, 'governmentId', {
        url: dto.governmentIdUrl,
        fileName: dto.governmentIdFileName,
        fileSize: dto.governmentIdFileSize,
        metadata: dto.governmentIdType ? { type: dto.governmentIdType } : undefined,
      });
    }
    if (
      dto.profilePictureUrl &&
      dto.profilePictureFileName != null &&
      dto.profilePictureFileSize != null
    ) {
      await this.upsertProviderDocument(providerId, 'profilePicture', {
        url: dto.profilePictureUrl,
        fileName: dto.profilePictureFileName,
        fileSize: dto.profilePictureFileSize,
      });
    }
    if (
      dto.licenseCertificateUrl &&
      dto.licenseCertificateFileName != null &&
      dto.licenseCertificateFileSize != null
    ) {
      await this.upsertProviderDocument(providerId, 'licenseCertificate', {
        url: dto.licenseCertificateUrl,
        fileName: dto.licenseCertificateFileName,
        fileSize: dto.licenseCertificateFileSize,
      });
    }
    if (
      dto.labEntrancePhotoUrl &&
      dto.labEntrancePhotoFileName != null &&
      dto.labEntrancePhotoFileSize != null
    ) {
      await this.upsertProviderDocument(providerId, 'labEntrancePhoto', {
        url: dto.labEntrancePhotoUrl,
        fileName: dto.labEntrancePhotoFileName,
        fileSize: dto.labEntrancePhotoFileSize,
      });
    }
    if (
      dto.vehicleRegistrationPapersUrl &&
      dto.vehicleRegistrationPapersFileName != null &&
      dto.vehicleRegistrationPapersFileSize != null
    ) {
      await this.upsertProviderDocument(providerId, 'vehicleRegistrationPapers', {
        url: dto.vehicleRegistrationPapersUrl,
        fileName: dto.vehicleRegistrationPapersFileName,
        fileSize: dto.vehicleRegistrationPapersFileSize,
      });
    }
    if (
      dto.driverLicenseUrl &&
      dto.driverLicenseFileName != null &&
      dto.driverLicenseFileSize != null
    ) {
      await this.upsertProviderDocument(providerId, 'driverLicense', {
        url: dto.driverLicenseUrl,
        fileName: dto.driverLicenseFileName,
        fileSize: dto.driverLicenseFileSize,
      });
    }
    if (
      dto.hospitalLicenseUrl &&
      dto.hospitalLicenseFileName != null &&
      dto.hospitalLicenseFileSize != null
    ) {
      await this.upsertProviderDocument(providerId, 'hospitalLicense', {
        url: dto.hospitalLicenseUrl,
        fileName: dto.hospitalLicenseFileName,
        fileSize: dto.hospitalLicenseFileSize,
      });
    }
    if (
      dto.hospitalLogoUrl &&
      dto.hospitalLogoFileName != null &&
      dto.hospitalLogoFileSize != null
    ) {
      await this.upsertProviderDocument(providerId, 'hospitalLogo', {
        url: dto.hospitalLogoUrl,
        fileName: dto.hospitalLogoFileName,
        fileSize: dto.hospitalLogoFileSize,
      });
    }

    doc.onboardingStep = 'documents';
    await doc.save();

    const response = await this.toProviderResponse(doc);
    return responseService.success(
      ResponseCode.UPDATED,
      'Documents saved',
      response
    );
  }

  async submitBankDetails(userId: string, dto: BankDetailsDto) {
    const provider = await this.getProviderByUserId(userId);
    if (!provider) return responseService.notFound('Provider not found');

    const doc = await ProviderModel.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    });
    if (!doc) return responseService.notFound('Provider not found');

    await ProviderPaymentDetailModel.findOneAndUpdate(
      { providerId: doc._id },
      {
        $set: {
          accountHolderName: dto.accountHolderName,
          bankAccountNumber: dto.bankAccountNumber,
          ifsc: dto.ifsc,
          upiId: dto.upiId,
          gstNumber: dto.gstNumber,
        },
      },
      { upsert: true, new: true }
    );

    doc.onboardingStep = 'submitted';
    doc.verificationStatus = 'pending';
    await doc.save();

    const response = await this.toProviderResponse(doc);
    return responseService.success(
      ResponseCode.UPDATED,
      'Profile submitted for verification. Once approved, you can start booking & earning.',
      response
    );
  }

  async getProviderResponseByUserId(
    userId: string
  ): Promise<Record<string, unknown> | null> {
    const provider = await this.getProvider(userId);
    if (!provider) return null;
    return this.toProviderResponse(provider);
  }

  async getOnboardingStatus(userId: string) {
    const provider = await this.getProviderByUserId(userId);
    if (!provider) {
      return responseService.success(ResponseCode.RETRIEVED, 'Onboarding not started', {
        onboardingStep: 'personal_info',
        verificationStatus: 'pending',
        provider: null,
      });
    }
    const providerResponse = await this.toProviderResponse(provider as unknown as IProvider);
    return responseService.success(
      ResponseCode.RETRIEVED,
      'Onboarding status retrieved',
      {
        onboardingStep: provider.onboardingStep,
        verificationStatus: provider.verificationStatus,
        provider: providerResponse,
      }
    );
  }

  async getHospitals() {
    const hospitals = await HospitalModel.find({ isActive: true })
      .select('name')
      .lean();
    return responseService.success(
      ResponseCode.RETRIEVED,
      'Hospitals retrieved',
      hospitals
    );
  }

  async getSpecializations() {
    const specializations = await SpecializationModel.find({ isActive: true })
      .select('name')
      .lean();
    return responseService.success(
      ResponseCode.RETRIEVED,
      'Specializations retrieved',
      specializations
    );
  }

  async getLabServices() {
    return responseService.success(
      ResponseCode.RETRIEVED,
      'Lab services retrieved',
      LabService as unknown as string[]
    );
  }

  async getAmbulanceTypes() {
    return responseService.success(
      ResponseCode.RETRIEVED,
      'Ambulance types retrieved',
      AmbulanceType as unknown as string[]
    );
  }

  async getCoverageAreas() {
    return responseService.success(
      ResponseCode.RETRIEVED,
      'Coverage areas retrieved',
      CoverageArea as unknown as string[]
    );
  }

  async getNurseServices() {
    return responseService.success(
      ResponseCode.RETRIEVED,
      'Nurse services retrieved',
      NurseService as unknown as string[]
    );
  }

  async getHospitalDepartments() {
    return responseService.success(
      ResponseCode.RETRIEVED,
      'Hospital departments retrieved',
      HospitalDepartment as unknown as string[]
    );
  }

  private buildDocumentsFromRows(docs: IProviderDocument[]): Record<string, unknown> {
    const map = new Map(docs.map((d) => [d.documentType, d]));
    const file = (d: IProviderDocument | undefined) =>
      d?.url && d?.fileName != null && d?.fileSize != null
        ? { url: d.url, fileName: d.fileName, fileSize: d.fileSize }
        : undefined;
    const govId = map.get('governmentId');
    return {
      medicalRegistrationNumber: map.get('medicalRegistrationNumber')?.documentNumber,
      medicalRegistrationCertificate: file(map.get('medicalRegistrationCertificate') as IProviderDocument),
      qualificationProof: file(map.get('qualificationProof') as IProviderDocument),
      governmentId:
        govId?.url && govId?.fileName != null && govId?.fileSize != null
          ? {
              url: govId.url,
              fileName: govId.fileName,
              fileSize: govId.fileSize,
              type: (govId.metadata as { type?: string })?.type,
            }
          : undefined,
      profilePicture: file(map.get('profilePicture') as IProviderDocument),
      licenseCertificate: file(map.get('licenseCertificate') as IProviderDocument),
      labEntrancePhoto: file(map.get('labEntrancePhoto') as IProviderDocument),
      vehicleRegistrationPapers: file(map.get('vehicleRegistrationPapers') as IProviderDocument),
      driverLicense: file(map.get('driverLicense') as IProviderDocument),
      hospitalLicense: file(map.get('hospitalLicense') as IProviderDocument),
      hospitalLogo: file(map.get('hospitalLogo') as IProviderDocument),
    };
  }

  private async toProviderResponse(provider: IProvider): Promise<Record<string, unknown>> {
    const providerId = provider._id;
    const [docRows, paymentDetail] = await Promise.all([
      ProviderDocumentModel.find({ providerId }).lean(),
      ProviderPaymentDetailModel.findOne({ providerId }).lean(),
    ]);
    const documents = this.buildDocumentsFromRows(docRows as unknown as IProviderDocument[]);
    const bankDetails = paymentDetail
      ? {
          accountHolderName: paymentDetail.accountHolderName,
          bankAccountNumber: paymentDetail.bankAccountNumber,
          ifsc: paymentDetail.ifsc,
          upiId: paymentDetail.upiId,
          gstNumber: paymentDetail.gstNumber,
        }
      : undefined;
    return {
      id: provider._id.toString(),
      userId: provider.userId.toString(),
      personalInfo: provider.personalInfo,
      professionalProfiles: provider.professionalProfiles,
      labProfessionalDetails: provider.labProfessionalDetails,
      ambulanceProfessionalDetails: provider.ambulanceProfessionalDetails,
      nurseProfessionalDetails: provider.nurseProfessionalDetails,
      hospitalProfessionalDetails: provider.hospitalProfessionalDetails,
      documents,
      bankDetails,
      onboardingStep: provider.onboardingStep,
      verificationStatus: provider.verificationStatus,
      rejectionReason: provider.rejectionReason,
      approvedAt: provider.approvedAt,
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
    };
  }
}
