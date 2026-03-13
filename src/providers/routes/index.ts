import { Router } from 'express';
import { createProviderOnboardingRoutes } from './onboarding.routes';
import { createProviderVerificationRoutes } from './verification.routes';

export type ProviderRoutesConfig = {
  jwtSecret: string;
  jwtExpiresIn?: string;
  bcryptRounds?: number;
  googleClientId?: string;
  appleClientId?: string;
};

export function createProviderRoutes(config: ProviderRoutesConfig): Router {
  const router = Router();

  if (config.jwtExpiresIn != null && config.bcryptRounds != null) {
    router.use(
      '/verification',
      createProviderVerificationRoutes({
        jwtSecret: config.jwtSecret,
        jwtExpiresIn: config.jwtExpiresIn,
        bcryptRounds: config.bcryptRounds,
        googleClientId: config.googleClientId,
        appleClientId: config.appleClientId,
      })
    );
  }

  router.use('/', createProviderOnboardingRoutes({ jwtSecret: config.jwtSecret }));
  return router;
}
