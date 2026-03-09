import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { AuthService } from '../../services/user/auth.service';
import { ResponseService, ResponseCode } from '../../core/response-management';
import {
  SendOtpSchema,
  VerifyOtpSchema,
  RegisterSchema,
  LoginSchema,
  GoogleAuthSchema,
  AppleAuthSchema,
  SendOtpDto,
  VerifyOtpDto,
  RegisterDto,
  LoginDto,
  GoogleAuthDto,
  AppleAuthDto,
} from '../../models/user/auth.dto';
import { RequestWithUser } from '../../interface/auth.interface';

const responseService = new ResponseService();

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
        verifiedToken
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
      const result = await this.authService.login(parsed.data as LoginDto);
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
        parsed.data as GoogleAuthDto
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
        parsed.data as AppleAuthDto
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

  logout = async (_req: Request, res: Response): Promise<void> => {
    try {
      const result = this.authService.logout();
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
