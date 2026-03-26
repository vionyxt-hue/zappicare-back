import { Router } from 'express';
import { createProviderOnboardingRoutes } from './onboarding.routes';
import { createProviderVerificationRoutes } from './verification.routes';

export type ProviderRoutesConfig = {
  jwtSecret: string;
  jwtExpiresIn?: string;
  jwtRefreshExpiresIn?: string;
  bcryptRounds?: number;
  googleClientId?: string;
  appleClientId?: string;
  facebookAppId?: string;
  facebookAppSecret?: string;
};

export function createProviderRoutes(config: ProviderRoutesConfig): Router {
  const router = Router();

  if (
    config.jwtExpiresIn != null &&
    config.jwtRefreshExpiresIn != null &&
    config.bcryptRounds != null
  ) {
    router.use(
      '/verification',
      createProviderVerificationRoutes({
        jwtSecret: config.jwtSecret,
        jwtExpiresIn: config.jwtExpiresIn,
        jwtRefreshExpiresIn: config.jwtRefreshExpiresIn,
        bcryptRounds: config.bcryptRounds,
        googleClientId: config.googleClientId,
        appleClientId: config.appleClientId,
        facebookAppId: config.facebookAppId,
        facebookAppSecret: config.facebookAppSecret,
      })
    );
  }

  router.use('/', createProviderOnboardingRoutes({ jwtSecret: config.jwtSecret }));
  return router;
}
