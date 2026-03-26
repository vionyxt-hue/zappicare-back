import { Router } from 'express';
import { AuthController } from '../../user/controllers/auth.controller';
import { AuthService } from '../../user/services/auth.service';

/**
 * Provider verification flow (no separate register step):
 * send-otp -> verify-otp -> onboarding using onboardingToken/accessToken.
 */
export function createProviderVerificationRoutes(config: {
  jwtSecret: string;
  jwtExpiresIn: string;
  jwtRefreshExpiresIn: string;
  bcryptRounds: number;
  googleClientId?: string;
  appleClientId?: string;
}): Router {
  const router = Router();
  const authService = new AuthService(config);
  const authController = new AuthController(authService);

  router.post('/send-otp', authController.sendOtp);
  router.post('/verify-otp', authController.verifyProviderOtp);

  return router;
}
