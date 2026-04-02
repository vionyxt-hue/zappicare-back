import { Router } from 'express';
import { createAuthMiddleware } from '../../middlewares/auth.middleware';
import { verifyProviderRouteJwtToken } from '../../common/verify-access-jwt';
import { ProviderOnboardingController } from '../controllers/onboarding.controller';
import { ProviderOnboardingService } from '../services/onboarding.service';
import { uploadDocumentsMiddleware } from '../middlewares/upload-documents.middleware';
import { AuthService } from '../../user/services/auth.service';

export function createProviderOnboardingRoutes(config: {
  jwtSecret: string;
  jwtExpiresIn: string;
  jwtRefreshExpiresIn: string;
  bcryptRounds: number;
  googleClientId?: string;
  appleClientId?: string;
}): Router {
  const router = Router();
  const onboardingService = new ProviderOnboardingService();
  const authService = new AuthService(config);
  const controller = new ProviderOnboardingController(onboardingService, authService);

  const authMiddleware = createAuthMiddleware({
    verifyToken: (token: string) => verifyProviderRouteJwtToken(token, config.jwtSecret),
  });

  router.get('/onboarding/status', authMiddleware, controller.getOnboardingStatus);
  router.post('/onboarding/personal-info', authMiddleware, controller.submitPersonalInfo);
  router.post('/onboarding/professional-profile', authMiddleware, controller.addProfessionalProfile);
  router.put(
    '/onboarding/professional-profile/:profileIndex',
    authMiddleware,
    controller.updateProfessionalProfile
  );
  router.post(
    '/onboarding/lab-professional-details',
    authMiddleware,
    controller.submitLabProfessionalDetails
  );
  router.post(
    '/onboarding/ambulance-professional-details',
    authMiddleware,
    controller.submitAmbulanceProfessionalDetails
  );
  router.post(
    '/onboarding/nurse-professional-details',
    authMiddleware,
    controller.submitNurseProfessionalDetails
  );
  router.post(
    '/onboarding/hospital-professional-details',
    authMiddleware,
    controller.submitHospitalProfessionalDetails
  );
  router.post(
    '/onboarding/documents',
    authMiddleware,
    uploadDocumentsMiddleware,
    controller.submitDocuments
  );
  router.post('/onboarding/bank-details', authMiddleware, controller.submitBankDetails);

  router.get('/me', authMiddleware, controller.getMe);
  router.get('/hospitals', authMiddleware, controller.getHospitals);
  router.get('/specializations', authMiddleware, controller.getSpecializations);
  router.get('/lab-services', authMiddleware, controller.getLabServices);
  router.get('/ambulance-types', authMiddleware, controller.getAmbulanceTypes);
  router.get('/coverage-areas', authMiddleware, controller.getCoverageAreas);
  router.get('/nurse-services', authMiddleware, controller.getNurseServices);
  router.get('/hospital-departments', authMiddleware, controller.getHospitalDepartments);

  return router;
}
