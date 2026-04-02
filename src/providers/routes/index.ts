import { Router } from 'express';
import { createProviderOnboardingRoutes } from './onboarding.routes';
import { createProviderVerificationRoutes } from './verification.routes';

export type ProviderRoutesConfig = {
  jwtSecret: string;
  jwtExpiresIn: string;
  jwtRefreshExpiresIn: string;
  bcryptRounds: number;
  googleClientId?: string;
  appleClientId?: string;
};

export function createProviderRoutes(config: ProviderRoutesConfig): Router {
  const router = Router();

  router.use(
    '/verification',
    createProviderVerificationRoutes({
      jwtSecret: config.jwtSecret,
      jwtExpiresIn: config.jwtExpiresIn,
      jwtRefreshExpiresIn: config.jwtRefreshExpiresIn,
      bcryptRounds: config.bcryptRounds,
      googleClientId: config.googleClientId,
      appleClientId: config.appleClientId,
    })
  );

  router.use(
    '/',
    createProviderOnboardingRoutes({
      jwtSecret: config.jwtSecret,
      jwtExpiresIn: config.jwtExpiresIn,
      jwtRefreshExpiresIn: config.jwtRefreshExpiresIn,
      bcryptRounds: config.bcryptRounds,
      googleClientId: config.googleClientId,
      appleClientId: config.appleClientId,
    })
  );
  return router;
}
