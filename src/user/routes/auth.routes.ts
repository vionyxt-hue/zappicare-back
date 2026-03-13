import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { AuthService } from '../services/auth.service';
import { createAuthMiddleware } from '../../middlewares/auth.middleware';
import { AuthEndPoints } from '../../enums/auth.enum';

export function createUserAuthRoutes(config: {
  jwtSecret: string;
  jwtExpiresIn: string;
  bcryptRounds: number;
  googleClientId?: string;
  appleClientId?: string;
}): Router {
  const router = Router();
  const authService = new AuthService(config);
  const authController = new AuthController(authService);
  const authMiddleware = createAuthMiddleware(authService);

  router.post(`/${AuthEndPoints.SEND_OTP}`, authController.sendOtp);
  router.post(`/${AuthEndPoints.VERIFY_OTP}`, authController.verifyOtp);
  router.post(`/${AuthEndPoints.REGISTER}`, authController.register);
  router.post(`/${AuthEndPoints.LOGIN}`, authController.login);
  router.post(`/${AuthEndPoints.GOOGLE}`, authController.loginWithGoogle);
  router.post(`/${AuthEndPoints.APPLE}`, authController.loginWithApple);
  router.post(`/${AuthEndPoints.LOGOUT}`, authMiddleware, authController.logout);
  router.get(`/${AuthEndPoints.ME}`, authMiddleware, authController.me);

  return router;
}
