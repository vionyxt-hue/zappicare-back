import { Router } from 'express';

const router = Router();

// Mount admin routes here, e.g. router.use('/auth', createAdminAuthRoutes(config));

export function createAdminRoutes(): Router {
  return router;
}
