import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { AuthService } from '../services/auth.service';
import { ResponseService, ResponseCode } from '../../core/response-management';
import {
  SendOtpSchema,
  VerifyOtpSchema,
  RegisterSchema,
  LoginSchema,
  GoogleAuthSchema,
  AppleAuthSchema,
  OAuthLoginSchema,
  RefreshTokenSchema,
  SendOtpDto,
  VerifyOtpDto,
  RegisterDto,
  LoginDto,
  GoogleAuthDto,
  AppleAuthDto,
  OAuthLoginDto,
  type SessionMeta,
} from '../models/dtos/auth.dto';
import { RequestWithUser } from '../../interface/auth.interface';

const responseService = new ResponseService();

function extractSessionMeta(req: Request): SessionMeta {
  const b = req.body as Record<string, unknown>;
  const pickStr = (k: string) =>
    typeof b[k] === 'string' ? (b[k] as string) : undefined;
  const pickObj = (k: string) =>
    typeof b[k] === 'object' && b[k] !== null && !Array.isArray(b[k])
      ? (b[k] as Record<string, unknown>)
      : undefined;
  return {
    ipAddress: req.ip,
    userAgent: req.get('user-agent') ?? undefined,
    fcmToken: pickStr('fcmToken'),
    apnsToken: pickStr('apnsToken'),
    onesignalPlayerId: pickStr('onesignalPlayerId'),
    devicePlatform: pickStr('devicePlatform'),
    timezone: pickStr('timezone'),
    deviceInfo: pickObj('deviceInfo'),
    locationInfo: pickObj('locationInfo'),
  };
}

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  sendOtp = async (req: Request, res: Response): Promise<void> => {
    try {
      const parsed = SendOtpSchema.safeParse(req.body);
      if (!parsed.success) {
        const message =
          parsed.error instanceof ZodError
            ? parsed.error.issues
                .map((e) => `${e.path.join('.')}: ${e.message}`)
                .join(', ')
            : 'Validation failed';
        res.status(400).json(responseService.badRequest(message));
        return;
      }
      const result = await this.authService.sendOtp(parsed.data as SendOtpDto);
      res.status(result.statusCode).json(result);
    } catch (error) {
      res.status(500).json(
        responseService.error(
          ResponseCode.INTERNAL_SERVER_ERROR,
          (error as Error).message
        )
      );
    }
  };

  verifyOtp = async (req: Request, res: Response): Promise<void> => {
    try {
      const parsed = VerifyOtpSchema.safeParse(req.body);
      if (!parsed.success) {
        const message =
          parsed.error instanceof ZodError
            ? parsed.error.issues
                .map((e) => `${e.path.join('.')}: ${e.message}`)
                .join(', ')
            : 'Validation failed';
        res.status(400).json(responseService.badRequest(message));
        return;
      }
      const result = await this.authService.verifyOtp(parsed.data as VerifyOtpDto);
      res.status(result.statusCode).json(result);
    } catch (error) {
      res.status(500).json(
        responseService.error(
          ResponseCode.INTERNAL_SERVER_ERROR,
          (error as Error).message
        )
      );
    }
  };

  verifyProviderOtp = async (req: Request, res: Response): Promise<void> => {
    try {
      const parsed = VerifyOtpSchema.safeParse(req.body);
      if (!parsed.success) {
        const message =
          parsed.error instanceof ZodError
            ? parsed.error.issues
                .map((e) => `${e.path.join('.')}: ${e.message}`)
                .join(', ')
            : 'Validation failed';
        res.status(400).json(responseService.badRequest(message));
        return;
      }
      const result = await this.authService.verifyProviderOtp(parsed.data as VerifyOtpDto);
      res.status(result.statusCode).json(result);
    } catch (error) {
      res.status(500).json(
        responseService.error(
          ResponseCode.INTERNAL_SERVER_ERROR,
          (error as Error).message
        )
      );
    }
  };

  register = async (req: Request, res: Response): Promise<void> => {
    try {
      const verifiedToken = req.headers['x-verified-token'] as string | undefined;
      const parsed = RegisterSchema.safeParse(req.body);
      if (!parsed.success) {
        const message =
          parsed.error instanceof ZodError
            ? parsed.error.issues
                .map((e) => `${e.path.join('.')}: ${e.message}`)
                .join(', ')
            : 'Validation failed';
        res.status(400).json(responseService.badRequest(message));
        return;
      }
      const result = await this.authService.register(
        parsed.data as RegisterDto,
        verifiedToken,
        extractSessionMeta(req)
      );
      res.status(result.statusCode).json(result);
    } catch (error) {
      res.status(500).json(
        responseService.error(
          ResponseCode.INTERNAL_SERVER_ERROR,
          (error as Error).message
        )
      );
    }
  };

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const parsed = LoginSchema.safeParse(req.body);
      if (!parsed.success) {
        const message =
          parsed.error instanceof ZodError
            ? parsed.error.issues
                .map((e) => `${e.path.join('.')}: ${e.message}`)
                .join(', ')
            : 'Validation failed';
        res.status(400).json(responseService.badRequest(message));
        return;
      }
      const result = await this.authService.login(
        parsed.data as LoginDto,
        extractSessionMeta(req)
      );
      res.status(result.statusCode).json(result);
    } catch (error) {
      res.status(500).json(
        responseService.error(
          ResponseCode.INTERNAL_SERVER_ERROR,
          (error as Error).message
        )
      );
    }
  };

  loginWithGoogle = async (req: Request, res: Response): Promise<void> => {
    try {
      const parsed = GoogleAuthSchema.safeParse(req.body);
      if (!parsed.success) {
        const message =
          parsed.error instanceof ZodError
            ? parsed.error.issues
                .map((e) => `${e.path.join('.')}: ${e.message}`)
                .join(', ')
            : 'Validation failed';
        res.status(400).json(responseService.badRequest(message));
        return;
      }
      const result = await this.authService.loginWithGoogle(
        parsed.data as GoogleAuthDto,
        extractSessionMeta(req)
      );
      res.status(result.statusCode).json(result);
    } catch (error) {
      res.status(500).json(
        responseService.error(
          ResponseCode.INTERNAL_SERVER_ERROR,
          (error as Error).message
        )
      );
    }
  };

  loginWithApple = async (req: Request, res: Response): Promise<void> => {
    try {
      const parsed = AppleAuthSchema.safeParse(req.body);
      if (!parsed.success) {
        const message =
          parsed.error instanceof ZodError
            ? parsed.error.issues
                .map((e) => `${e.path.join('.')}: ${e.message}`)
                .join(', ')
            : 'Validation failed';
        res.status(400).json(responseService.badRequest(message));
        return;
      }
      const result = await this.authService.loginWithApple(
        parsed.data as AppleAuthDto,
        extractSessionMeta(req)
      );
      res.status(result.statusCode).json(result);
    } catch (error) {
      res.status(500).json(
        responseService.error(
          ResponseCode.INTERNAL_SERVER_ERROR,
          (error as Error).message
        )
      );
    }
  };

  oauthLogin = async (req: Request, res: Response): Promise<void> => {
    try {
      const parsed = OAuthLoginSchema.safeParse(req.body);
      if (!parsed.success) {
        const message =
          parsed.error instanceof ZodError
            ? parsed.error.issues
                .map((e) => `${e.path.join('.')}: ${e.message}`)
                .join(', ')
            : 'Validation failed';
        res.status(400).json(responseService.badRequest(message));
        return;
      }
      const result = await this.authService.loginWithOAuth(
        parsed.data as OAuthLoginDto,
        extractSessionMeta(req)
      );
      res.status(result.statusCode).json(result);
    } catch (error) {
      res.status(500).json(
        responseService.error(
          ResponseCode.INTERNAL_SERVER_ERROR,
          (error as Error).message
        )
      );
    }
  };

  refresh = async (req: Request, res: Response): Promise<void> => {
    try {
      const parsed = RefreshTokenSchema.safeParse(req.body);
      if (!parsed.success) {
        const message =
          parsed.error instanceof ZodError
            ? parsed.error.issues
                .map((e) => `${e.path.join('.')}: ${e.message}`)
                .join(', ')
            : 'Validation failed';
        res.status(400).json(responseService.badRequest(message));
        return;
      }
      const result = await this.authService.refresh(parsed.data.refreshToken);
      res.status(result.statusCode).json(result);
    } catch (error) {
      res.status(500).json(
        responseService.error(
          ResponseCode.INTERNAL_SERVER_ERROR,
          (error as Error).message
        )
      );
    }
  };

  logout = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
      if (!req.user?.id) {
        res.status(401).json(responseService.unauthorized('Unauthorized'));
        return;
      }
      const result = await this.authService.logout(req.user.id, req.user.sessionId);
      res.status(result.statusCode).json(result);
    } catch (error) {
      res.status(500).json(
        responseService.error(
          ResponseCode.INTERNAL_SERVER_ERROR,
          (error as Error).message
        )
      );
    }
  };

  me = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
      if (!req.user?.id) {
        res.status(401).json(responseService.unauthorized('Unauthorized'));
        return;
      }
      const result = await this.authService.getProfile(req.user.id);
      res.status(result.statusCode).json(result);
    } catch (error) {
      res.status(500).json(
        responseService.error(
          ResponseCode.INTERNAL_SERVER_ERROR,
          (error as Error).message
        )
      );
    }
  };
}
