import express, { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { createUserAuthRoutes } from './user/routes/auth.routes';
import { createProviderRoutes } from './providers/routes';
import { createAdminRoutes } from './admin/routes';
import { ResponseService, ResponseCode } from './core/response-management';
import { swaggerDocument } from './config/swagger.config';

export function createApp(config: {
  jwtSecret: string;
  jwtExpiresIn: string;
  jwtRefreshExpiresIn: string;
  bcryptRounds: number;
  corsOrigin: string;
  googleClientId?: string;
  appleClientId?: string;
}): Express {
  const app = express();
  const responseService = new ResponseService();

  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin, credentials: true }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

  // User module: auth, profile, etc.
  app.use('/auth', createUserAuthRoutes({
    jwtSecret: config.jwtSecret,
    jwtExpiresIn: config.jwtExpiresIn,
    jwtRefreshExpiresIn: config.jwtRefreshExpiresIn,
    bcryptRounds: config.bcryptRounds,
    googleClientId: config.googleClientId,
    appleClientId: config.appleClientId,
  }));

  // Providers module: verification (OTP) + onboarding
  app.use('/providers', createProviderRoutes({
    jwtSecret: config.jwtSecret,
    jwtExpiresIn: config.jwtExpiresIn,
    jwtRefreshExpiresIn: config.jwtRefreshExpiresIn,
    bcryptRounds: config.bcryptRounds,
    googleClientId: config.googleClientId,
    appleClientId: config.appleClientId,
  }));

  // Admin module
  app.use('/admin', createAdminRoutes());

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json(
      responseService.success(ResponseCode.SUCCESS, 'OK', { status: 'healthy' })
    );
  });

  app.use((_req: Request, res: Response) => {
    res.status(404).json(responseService.notFound('Not found'));
  });

  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (
      err instanceof SyntaxError &&
      typeof err.message === 'string' &&
      err.message.toLowerCase().includes('json')
    ) {
      return res.status(400).json(responseService.badRequest('Malformed JSON request body'));
    }
    next(err);
  });

  return app;
}
