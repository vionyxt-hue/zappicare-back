import { Router, Request, Response } from 'express';
import { AuthController } from '../../user/controllers/auth.controller';
import { AuthService } from '../../user/services/auth.service';

/**
 * Provider verification: same flow as auth (send-otp → verify-otp → register)
 * but under /providers/verification and register always creates a provider.
 */
export function createProviderVerificationRoutes(config: {
  jwtSecret: string;
  jwtExpiresIn: string;
  bcryptRounds: number;
  googleClientId?: string;
  appleClientId?: string;
}): Router {
  const router = Router();
  const authService = new AuthService(config);
  const authController = new AuthController(authService);

  router.post('/send-otp', authController.sendOtp);
  router.post('/verify-otp', authController.verifyOtp);

  router.post('/register', (req: Request, res: Response) => {
    req.body = { ...req.body, role: 'provider' };
    authController.register(req, res);
  });

  return router;
}
