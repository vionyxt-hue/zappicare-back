import { Response } from 'express';
import { ZodError } from 'zod';
import { ProviderOnboardingService } from '../services/onboarding.service';
import { ResponseService, ResponseCode } from '../../core/response-management';
import { getS3Service } from '../../core/s3/s3.service';
import {
  PersonalInfoSchema,
  ProfessionalProfileSchema,
  LabProfessionalDetailsSchema,
  AmbulanceProfessionalDetailsSchema,
  NurseProfessionalDetailsSchema,
  HospitalProfessionalDetailsSchema,
  DocumentsSchema,
  BankDetailsSchema,
  type PersonalInfoDto,
  type ProfessionalProfileDto,
  type LabProfessionalDetailsDto,
  type AmbulanceProfessionalDetailsDto,
  type NurseProfessionalDetailsDto,
  type HospitalProfessionalDetailsDto,
  type DocumentsDto,
  type BankDetailsDto,
} from '../models/onboarding.dto';
import { RequestWithUser } from '../../interface/auth.interface';

const responseService = new ResponseService();

function validationError(error: unknown): string {
  if (error instanceof ZodError) {
    return error.issues
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join(', ');
  }
  return 'Validation failed';
}

export class ProviderOnboardingController {
  constructor(private readonly onboardingService: ProviderOnboardingService) {}

  submitPersonalInfo = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json(responseService.unauthorized('Unauthorized'));
        return;
      }
      const parsed = PersonalInfoSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(responseService.badRequest(validationError(parsed.error)));
        return;
      }
      const result = await this.onboardingService.submitPersonalInfo(
        userId,
        parsed.data as PersonalInfoDto
      );
      res.status(result.statusCode).json(result);
    } catch (error) {
      res.status(500).json(
        responseService.error(
          ResponseCode.INTERNAL_SERVER_ERROR,
          (error as Error).message
        )
      );
    }
  };

  addProfessionalProfile = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json(responseService.unauthorized('Unauthorized'));
        return;
      }
      const parsed = ProfessionalProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(responseService.badRequest(validationError(parsed.error)));
        return;
      }
      const result = await this.onboardingService.addProfessionalProfile(
        userId,
        parsed.data as ProfessionalProfileDto
      );
      res.status(result.statusCode).json(result);
    } catch (error) {
      res.status(500).json(
        responseService.error(
          ResponseCode.INTERNAL_SERVER_ERROR,
          (error as Error).message
        )
      );
    }
  };

  updateProfessionalProfile = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json(responseService.unauthorized('Unauthorized'));
        return;
      }
      const profileIndex = parseInt(String(req.params.profileIndex ?? ''), 10);
      if (isNaN(profileIndex) || profileIndex < 0) {
        res.status(400).json(responseService.badRequest('Invalid profile index'));
        return;
      }
      const parsed = ProfessionalProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(responseService.badRequest(validationError(parsed.error)));
        return;
      }
      const result = await this.onboardingService.updateProfessionalProfile(
        userId,
        profileIndex,
        parsed.data as ProfessionalProfileDto
      );
      res.status(result.statusCode).json(result);
    } catch (error) {
      res.status(500).json(
        responseService.error(
          ResponseCode.INTERNAL_SERVER_ERROR,
          (error as Error).message
        )
      );
    }
  };

  submitLabProfessionalDetails = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json(responseService.unauthorized('Unauthorized'));
        return;
      }
      const parsed = LabProfessionalDetailsSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(responseService.badRequest(validationError(parsed.error)));
        return;
      }
      const result = await this.onboardingService.submitLabProfessionalDetails(
        userId,
        parsed.data as LabProfessionalDetailsDto
      );
      res.status(result.statusCode).json(result);
    } catch (error) {
      res.status(500).json(
        responseService.error(
          ResponseCode.INTERNAL_SERVER_ERROR,
          (error as Error).message
        )
      );
    }
  };

  submitAmbulanceProfessionalDetails = async (
    req: RequestWithUser,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json(responseService.unauthorized('Unauthorized'));
        return;
      }
      const parsed = AmbulanceProfessionalDetailsSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(responseService.badRequest(validationError(parsed.error)));
        return;
      }
      const result = await this.onboardingService.submitAmbulanceProfessionalDetails(
        userId,
        parsed.data as AmbulanceProfessionalDetailsDto
      );
      res.status(result.statusCode).json(result);
    } catch (error) {
      res.status(500).json(
        responseService.error(
          ResponseCode.INTERNAL_SERVER_ERROR,
          (error as Error).message
        )
      );
    }
  };

  submitNurseProfessionalDetails = async (
    req: RequestWithUser,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json(responseService.unauthorized('Unauthorized'));
        return;
      }
      const parsed = NurseProfessionalDetailsSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(responseService.badRequest(validationError(parsed.error)));
        return;
      }
      const result = await this.onboardingService.submitNurseProfessionalDetails(
        userId,
        parsed.data as NurseProfessionalDetailsDto
      );
      res.status(result.statusCode).json(result);
    } catch (error) {
      res.status(500).json(
        responseService.error(
          ResponseCode.INTERNAL_SERVER_ERROR,
          (error as Error).message
        )
      );
    }
  };

  submitHospitalProfessionalDetails = async (
    req: RequestWithUser,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json(responseService.unauthorized('Unauthorized'));
        return;
      }
      const parsed = HospitalProfessionalDetailsSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(responseService.badRequest(validationError(parsed.error)));
        return;
      }
      const result = await this.onboardingService.submitHospitalProfessionalDetails(
        userId,
        parsed.data as HospitalProfessionalDetailsDto
      );
      res.status(result.statusCode).json(result);
    } catch (error) {
      res.status(500).json(
        responseService.error(
          ResponseCode.INTERNAL_SERVER_ERROR,
          (error as Error).message
        )
      );
    }
  };

  submitDocuments = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json(responseService.unauthorized('Unauthorized'));
        return;
      }

      const body = (req.body || {}) as Record<string, unknown>;
      const files = req.files as Record<string, Express.Multer.File[]> | undefined;

      if (files && Object.keys(files).length > 0) {
        const s3 = getS3Service();
        if (!s3.isConfigured()) {
          res.status(503).json(
            responseService.error(
              ResponseCode.INTERNAL_SERVER_ERROR,
              'Document upload is not configured (S3). Set AWS_REGION and S3_BUCKET.'
            )
          );
          return;
        }
        const providerId = await this.onboardingService.getProviderIdByUserId(userId);
        if (!providerId) {
          res.status(404).json(responseService.notFound('Provider not found'));
          return;
        }
        const keyPrefix = `providers/${providerId}`;
        const dtoFromFiles: Record<string, string | number> = {};
        for (const [fieldName, fileList] of Object.entries(files)) {
          const file = Array.isArray(fileList) ? fileList[0] : fileList;
          if (!file?.buffer) continue;
          const result = await s3.upload({
            keyPrefix: `${keyPrefix}/${fieldName}`,
            fileName: file.originalname,
            body: file.buffer,
            contentType: file.mimetype,
          });
          dtoFromFiles[`${fieldName}Url`] = result.url;
          dtoFromFiles[`${fieldName}FileName`] = file.originalname;
          dtoFromFiles[`${fieldName}FileSize`] = file.size;
        }
        Object.assign(body, dtoFromFiles);
      }

      const parsed = DocumentsSchema.safeParse(body);
      if (!parsed.success) {
        res.status(400).json(responseService.badRequest(validationError(parsed.error)));
        return;
      }
      const result = await this.onboardingService.submitDocuments(
        userId,
        parsed.data as DocumentsDto
      );
      res.status(result.statusCode).json(result);
    } catch (error) {
      res.status(500).json(
        responseService.error(
          ResponseCode.INTERNAL_SERVER_ERROR,
          (error as Error).message
        )
      );
    }
  };

  submitBankDetails = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json(responseService.unauthorized('Unauthorized'));
        return;
      }
      const parsed = BankDetailsSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(responseService.badRequest(validationError(parsed.error)));
        return;
      }
      const result = await this.onboardingService.submitBankDetails(
        userId,
        parsed.data as BankDetailsDto
      );
      res.status(result.statusCode).json(result);
    } catch (error) {
      res.status(500).json(
        responseService.error(
          ResponseCode.INTERNAL_SERVER_ERROR,
          (error as Error).message
        )
      );
    }
  };

  getOnboardingStatus = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json(responseService.unauthorized('Unauthorized'));
        return;
      }
      const result = await this.onboardingService.getOnboardingStatus(userId);
      res.status(result.statusCode).json(result);
    } catch (error) {
      res.status(500).json(
        responseService.error(
          ResponseCode.INTERNAL_SERVER_ERROR,
          (error as Error).message
        )
      );
    }
  };

  getMe = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json(responseService.unauthorized('Unauthorized'));
        return;
      }
      const providerResponse = await this.onboardingService.getProviderResponseByUserId(userId);
      if (!providerResponse) {
        res.status(404).json(responseService.notFound('Provider profile not found'));
        return;
      }
      const result = responseService.success(
        ResponseCode.RETRIEVED,
        'Provider profile retrieved',
        providerResponse
      );
      res.status(result.statusCode).json(result);
    } catch (error) {
      res.status(500).json(
        responseService.error(
          ResponseCode.INTERNAL_SERVER_ERROR,
          (error as Error).message
        )
      );
    }
  };

  getHospitals = async (_req: RequestWithUser, res: Response): Promise<void> => {
    try {
      const result = await this.onboardingService.getHospitals();
      res.status(result.statusCode).json(result);
    } catch (error) {
      res.status(500).json(
        responseService.error(
          ResponseCode.INTERNAL_SERVER_ERROR,
          (error as Error).message
        )
      );
    }
  };

  getSpecializations = async (_req: RequestWithUser, res: Response): Promise<void> => {
    try {
      const result = await this.onboardingService.getSpecializations();
      res.status(result.statusCode).json(result);
    } catch (error) {
      res.status(500).json(
        responseService.error(
          ResponseCode.INTERNAL_SERVER_ERROR,
          (error as Error).message
        )
      );
    }
  };

  getLabServices = async (_req: RequestWithUser, res: Response): Promise<void> => {
    try {
      const result = await this.onboardingService.getLabServices();
      res.status(result.statusCode).json(result);
    } catch (error) {
      res.status(500).json(
        responseService.error(
          ResponseCode.INTERNAL_SERVER_ERROR,
          (error as Error).message
        )
      );
    }
  };

  getAmbulanceTypes = async (_req: RequestWithUser, res: Response): Promise<void> => {
    try {
      const result = await this.onboardingService.getAmbulanceTypes();
      res.status(result.statusCode).json(result);
    } catch (error) {
      res.status(500).json(
        responseService.error(
          ResponseCode.INTERNAL_SERVER_ERROR,
          (error as Error).message
        )
      );
    }
  };

  getCoverageAreas = async (_req: RequestWithUser, res: Response): Promise<void> => {
    try {
      const result = await this.onboardingService.getCoverageAreas();
      res.status(result.statusCode).json(result);
    } catch (error) {
      res.status(500).json(
        responseService.error(
          ResponseCode.INTERNAL_SERVER_ERROR,
          (error as Error).message
        )
      );
    }
  };

  getNurseServices = async (_req: RequestWithUser, res: Response): Promise<void> => {
    try {
      const result = await this.onboardingService.getNurseServices();
      res.status(result.statusCode).json(result);
    } catch (error) {
      res.status(500).json(
        responseService.error(
          ResponseCode.INTERNAL_SERVER_ERROR,
          (error as Error).message
        )
      );
    }
  };

  getHospitalDepartments = async (_req: RequestWithUser, res: Response): Promise<void> => {
    try {
      const result = await this.onboardingService.getHospitalDepartments();
      res.status(result.statusCode).json(result);
    } catch (error) {
      res.status(500).json(
        responseService.error(
          ResponseCode.INTERNAL_SERVER_ERROR,
          (error as Error).message
        )
      );
    }
  };
}
