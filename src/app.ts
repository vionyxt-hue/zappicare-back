import express, { Express, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { createAuthRoutes } from './routes/auth.routes';
import { ResponseService, ResponseCode } from './core/response-management';
import { swaggerDocument } from './config/swagger.config';

export function createApp(config: {
  jwtSecret: string;
  jwtExpiresIn: string;
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

  app.use('/auth', createAuthRoutes({
    jwtSecret: config.jwtSecret,
    jwtExpiresIn: config.jwtExpiresIn,
    bcryptRounds: config.bcryptRounds,
    googleClientId: config.googleClientId,
    appleClientId: config.appleClientId,
  }));

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json(
      responseService.success(ResponseCode.SUCCESS, 'OK', { status: 'healthy' })
    );
  });

  app.use((_req: Request, res: Response) => {
    res.status(404).json(responseService.notFound('Not found'));
  });

  return app;
}
