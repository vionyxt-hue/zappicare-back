import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { UserModel, IUser } from '../../models/user/user.schema';
import { OtpVerificationModel } from '../../models/user/otp-verification.schema';
import { ResponseService, ResponseCode } from '../../core/response-management';
import { AuthErrorMessages, AuthSuccessMessages } from '../../core/messages';
import {
  SendOtpDto,
  VerifyOtpDto,
  RegisterDto,
  LoginDto,
  GoogleAuthDto,
  AppleAuthDto,
} from '../../models/user/auth.dto';
import { JwtPayload } from '../../interface/auth.interface';
import {
  verifyGoogleIdToken,
  verifyAppleIdentityToken,
} from './oauth-verifier';

const OTP_EXPIRY_MINUTES = 5;
const OTP_LENGTH = 5;
const VERIFIED_TOKEN_EXPIRY = '10m';
const MAX_OTP_ATTEMPTS = 5;

type UserLike = Pick<
  IUser,
  'email' | 'firstName' | 'lastName' | 'mobileNumber' | 'role'
> & { _id: mongoose.Types.ObjectId };

export class AuthService {
  private readonly responseService = new ResponseService();
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: string;
  private readonly bcryptRounds: number;
  private readonly googleClientId?: string;
  private readonly appleClientId?: string;

  constructor(config: {
    jwtSecret: string;
    jwtExpiresIn: string;
    bcryptRounds: number;
    googleClientId?: string;
    appleClientId?: string;
  }) {
    this.jwtSecret = config.jwtSecret;
    this.jwtExpiresIn = config.jwtExpiresIn;
    this.bcryptRounds = config.bcryptRounds;
    this.googleClientId = config.googleClientId;
    this.appleClientId = config.appleClientId;
  }

  async sendOtp(dto: SendOtpDto) {
    const code = Math.floor(
      10 ** (OTP_LENGTH - 1) + Math.random() * 9 * 10 ** (OTP_LENGTH - 1)
    ).toString();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    await OtpVerificationModel.create({
      mobileNumber: dto.mobileNumber,
      code,
      expiresAt,
    });
    // In production: send SMS with code
    return this.responseService.success(
      ResponseCode.PROCESSING_SUCCESS,
      AuthSuccessMessages.OTP_SENT,
      { expiresIn: OTP_EXPIRY_MINUTES * 60 }
    );
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const valid = await this.validateOtp(dto.mobileNumber, dto.code);
    if (valid !== true) return valid;
    const verifiedToken = jwt.sign(
      { sub: dto.mobileNumber, type: 'otp_verified' },
      this.jwtSecret,
      { expiresIn: VERIFIED_TOKEN_EXPIRY }
    );
    return this.responseService.success(
      ResponseCode.VALIDATION_SUCCESS,
      AuthSuccessMessages.OTP_VERIFIED,
      { verifiedToken }
    );
  }

  private async validateOtp(
    mobileNumber: string,
    code: string
  ): Promise<ReturnType<AuthService['responseService']['badRequest']> | true> {
    const record = await OtpVerificationModel.findOne({
      mobileNumber,
    }).sort({ createdAt: -1 });
    if (!record) {
      return this.responseService.badRequest(AuthErrorMessages.OTP_NOT_FOUND);
    }
    if (record.expiresAt < new Date()) {
      await OtpVerificationModel.deleteOne({ _id: record._id });
      return this.responseService.badRequest(AuthErrorMessages.OTP_EXPIRED);
    }
    if (record.attempts >= MAX_OTP_ATTEMPTS) {
      await OtpVerificationModel.deleteOne({ _id: record._id });
      return this.responseService.badRequest(AuthErrorMessages.OTP_MAX_ATTEMPTS);
    }
    if (record.code !== code) {
      await OtpVerificationModel.updateOne(
        { _id: record._id },
        { $inc: { attempts: 1 } }
      );
      return this.responseService.badRequest(AuthErrorMessages.INVALID_OTP);
    }
    await OtpVerificationModel.deleteOne({ _id: record._id });
    return true;
  }

  async register(dto: RegisterDto, verifiedToken?: string) {
    let mobileNumber = dto.mobileNumber;
    if (verifiedToken) {
      try {
        const decoded = jwt.verify(verifiedToken, this.jwtSecret) as {
          sub: string;
          type: string;
        };
        if (decoded.type !== 'otp_verified' || decoded.sub !== dto.mobileNumber) {
          return this.responseService.badRequest(
            AuthErrorMessages.OTP_VERIFICATION_REQUIRED
          );
        }
        mobileNumber = decoded.sub;
      } catch {
        return this.responseService.badRequest(
          AuthErrorMessages.OTP_VERIFICATION_REQUIRED
        );
      }
    }
    const existing = await UserModel.findOne({ mobileNumber }).lean();
    if (existing) {
      return this.responseService.badRequest(AuthErrorMessages.USER_ALREADY_EXISTS);
    }
    if (dto.email) {
      const existingEmail = await UserModel.findOne({
        email: dto.email.toLowerCase(),
      }).lean();
      if (existingEmail) {
        return this.responseService.badRequest(AuthErrorMessages.USER_ALREADY_EXISTS);
      }
    }
    const user = await UserModel.create({
      mobileNumber,
      countryCode: dto.countryCode,
      email: dto.email ? dto.email.toLowerCase() : undefined,
      firstName: dto.firstName,
      lastName: dto.lastName,
      emergencyNumber: dto.emergencyNumber || undefined,
      gender: dto.gender,
      referCode: dto.referCode,
      termsAndConditionsAccepted: true,
      isMobileVerified: true,
      role: dto.role ?? 'user',
    });
    const token = this.generateToken(user as UserLike);
    return this.responseService.success(
      ResponseCode.CREATED,
      AuthSuccessMessages.USER_REGISTERED,
      {
        user: this.toUserResponse(user as UserLike),
        tokens: token,
      }
    );
  }

  async login(dto: LoginDto) {
    if (dto.code !== undefined && dto.mobileNumber) {
      const valid = await this.validateOtp(dto.mobileNumber, dto.code);
      if (valid !== true) return valid;
      const user = await UserModel.findOne({
        mobileNumber: dto.mobileNumber,
      }).lean();
      if (!user) {
        return this.responseService.badRequest(AuthErrorMessages.USER_NOT_FOUND);
      }
      if (!user.isActive) {
        return this.responseService.badRequest(AuthErrorMessages.AUTHENTICATION_FAILED);
      }
      const token = this.generateToken(user as UserLike);
      return this.responseService.success(
        ResponseCode.LOGIN_SUCCESS,
        AuthSuccessMessages.LOGIN_SUCCESS,
        {
          user: this.toUserResponse(user as UserLike),
          tokens: token,
        }
      );
    }
    const byMobile = dto.mobileNumber
      ? { mobileNumber: dto.mobileNumber }
      : null;
    const byEmail = dto.email ? { email: dto.email.toLowerCase() } : null;
    const query = byMobile || byEmail;
    if (!query) {
      return this.responseService.badRequest(AuthErrorMessages.INVALID_CREDENTIALS);
    }
    const user = await UserModel.findOne(query).select('+password').lean();
    if (!user || !user.password) {
      return this.responseService.badRequest(AuthErrorMessages.INVALID_CREDENTIALS);
    }
    const match = await bcrypt.compare(dto.password!, user.password);
    if (!match) {
      return this.responseService.badRequest(AuthErrorMessages.INVALID_CREDENTIALS);
    }
    if (!user.isActive) {
      return this.responseService.badRequest(AuthErrorMessages.AUTHENTICATION_FAILED);
    }
    const token = this.generateToken(user as UserLike);
    return this.responseService.success(
      ResponseCode.LOGIN_SUCCESS,
      AuthSuccessMessages.LOGIN_SUCCESS,
      {
        user: this.toUserResponse(user as UserLike),
        tokens: token,
      }
    );
  }

  async loginWithGoogle(dto: GoogleAuthDto) {
    if (!this.googleClientId) {
      return this.responseService.badRequest(AuthErrorMessages.OAUTH_NOT_CONFIGURED);
    }
    try {
      const payload = await verifyGoogleIdToken(dto.idToken, this.googleClientId);
      return this.findOrCreateOAuthUser(
        'google',
        payload.sub,
        payload.email,
        payload.given_name ?? payload.name?.split(' ')[0] ?? 'User',
        payload.family_name ?? (payload.name?.split(' ').slice(1).join(' ') || 'User'),
        dto.role ?? 'user',
        dto.termsAndConditionsAccepted
      );
    } catch {
      return this.responseService.badRequest(AuthErrorMessages.INVALID_OAUTH_TOKEN);
    }
  }

  async loginWithApple(dto: AppleAuthDto) {
    if (!this.appleClientId) {
      return this.responseService.badRequest(AuthErrorMessages.OAUTH_NOT_CONFIGURED);
    }
    try {
      const payload = await verifyAppleIdentityToken(
        dto.identityToken,
        this.appleClientId
      );
      const namePart = payload.email?.split('@')[0] ?? 'User';
      return this.findOrCreateOAuthUser(
        'apple',
        payload.sub,
        payload.email,
        namePart,
        'User',
        dto.role ?? 'user',
        dto.termsAndConditionsAccepted
      );
    } catch {
      return this.responseService.badRequest(AuthErrorMessages.INVALID_OAUTH_TOKEN);
    }
  }

  private async findOrCreateOAuthUser(
    provider: 'google' | 'apple',
    providerId: string,
    email: string | undefined,
    firstName: string,
    lastName: string,
    role: string,
    termsAccepted?: boolean
  ) {
    const idField = provider === 'google' ? 'googleId' : 'appleId';
    const placeholderMobile = `oauth_${provider}_${providerId}`;
    let user = await UserModel.findOne({ [idField]: providerId }).lean();
    if (user) {
      if (!user.isActive) {
        return this.responseService.badRequest(AuthErrorMessages.AUTHENTICATION_FAILED);
      }
      const token = this.generateToken(user as UserLike);
      return this.responseService.success(
        ResponseCode.LOGIN_SUCCESS,
        AuthSuccessMessages.LOGIN_SUCCESS,
        {
          user: this.toUserResponse(user as UserLike),
          tokens: token,
        }
      );
    }
    if (email) {
      user = await UserModel.findOne({ email: email.toLowerCase() }).lean();
      if (user) {
        await UserModel.updateOne(
          { _id: user._id },
          { $set: { [idField]: providerId } }
        );
        const updated = await UserModel.findById(user._id).lean();
        if (updated && !(updated as { isActive?: boolean }).isActive) {
          return this.responseService.badRequest(AuthErrorMessages.AUTHENTICATION_FAILED);
        }
        const token = this.generateToken(updated as UserLike);
        return this.responseService.success(
          ResponseCode.LOGIN_SUCCESS,
          AuthSuccessMessages.LOGIN_SUCCESS,
          {
            user: this.toUserResponse(updated as UserLike),
            tokens: token,
          }
        );
      }
    }
    if (!termsAccepted) {
      return this.responseService.badRequest(
        AuthErrorMessages.TERMS_AND_CONDITIONS_REQUIRED
      );
    }
    const newUser = await UserModel.create({
      mobileNumber: placeholderMobile,
      firstName,
      lastName,
      email: email?.toLowerCase(),
      [idField]: providerId,
      termsAndConditionsAccepted: true,
      isMobileVerified: false,
      role: role as 'user' | 'provider',
    });
    const token = this.generateToken(newUser as UserLike);
    return this.responseService.success(
      ResponseCode.CREATED,
      AuthSuccessMessages.USER_REGISTERED,
      {
        user: this.toUserResponse(newUser as UserLike),
        tokens: token,
      }
    );
  }

  async getProfile(userId: string) {
    const user = await UserModel.findById(userId).lean();
    if (!user) {
      return this.responseService.notFound(AuthErrorMessages.USER_NOT_FOUND);
    }
    return this.responseService.success(
      ResponseCode.RETRIEVED,
      'Profile retrieved',
      this.toUserResponse(user as UserLike)
    );
  }

  logout() {
    return this.responseService.success(
      ResponseCode.LOGOUT_SUCCESS,
      AuthSuccessMessages.LOGOUT_SUCCESS,
      null
    );
  }

  verifyToken(token: string): JwtPayload | null {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as JwtPayload;
      return decoded;
    } catch {
      return null;
    }
  }

  private generateToken(user: UserLike): { accessToken: string; expiresIn: string } {
    const payload: JwtPayload = {
      sub: user._id.toString(),
      email: user.email ?? '',
      mobileNumber: user.mobileNumber ?? undefined,
    };
    const options: jwt.SignOptions = {
      expiresIn: this.jwtExpiresIn as jwt.SignOptions['expiresIn'],
    };
    const accessToken = jwt.sign(payload as object, this.jwtSecret, options);
    return { accessToken, expiresIn: this.jwtExpiresIn };
  }

  private toUserResponse(
    user: UserLike
  ): {
    id: string;
    email?: string;
    mobileNumber: string;
    firstName: string;
    lastName: string;
    role: string;
  } {
    return {
      id: user._id.toString(),
      email: user.email,
      mobileNumber: user.mobileNumber,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };
  }
}
