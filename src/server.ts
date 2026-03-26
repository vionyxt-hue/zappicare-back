import * as dotenv from 'dotenv';
import { EnvironmentConfigValidator } from './config/environment.config';
import { DatabaseConnection } from './db/database.connection';
import { LoggerService } from './common/logger';
import { createApp } from './app';

dotenv.config();

const config = EnvironmentConfigValidator.validate(process.env);
const logger = new LoggerService('BOOTSTRAP');

async function bootstrap(): Promise<void> {
  const db = DatabaseConnection.getInstance();
  await db.connect();

  const app = createApp({
    jwtSecret: config.JWT_SECRET,
    jwtExpiresIn: config.JWT_EXPIRES_IN,
    jwtRefreshExpiresIn: config.JWT_REFRESH_EXPIRES_IN,
    bcryptRounds: config.BCRYPT_ROUNDS,
    googleClientId: config.GOOGLE_CLIENT_ID,
    appleClientId: config.APPLE_CLIENT_ID,
    facebookAppId: config.FACEBOOK_APP_ID,
    facebookAppSecret: config.FACEBOOK_APP_SECRET,
  });

  const port = config.PORT;
  app.listen(port, '0.0.0.0', () => {
    logger.info(`Application is running on: http://localhost:${port}`);
    logger.info(`Environment: ${config.NODE_ENV}`);
    logger.info(`Application: ${config.APP_NAME} v${config.APP_VERSION}`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start application', error);
  process.exit(1);
});
