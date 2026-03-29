import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ResponseService, ResponseCode } from '../../core/response-management';
import { AuthErrorMessages, AuthSuccessMessages } from '../../core/messages';
import {
  SendOtpDto,
  VerifyOtpDto,
  RegisterDto,
  LoginDto,
  GoogleAuthDto,
  AppleAuthDto,
  type SessionMeta,
} from '../models/dtos/auth.dto';
import { JwtPayload } from '../../interface/auth.interface';
import {
  verifyGoogleIdToken,
  verifyAppleIdentityToken,
  verifyFacebookAccessToken,
} from './oauth-verifier';
import type { GenderType, UserRoleType, UserEntity } from '../models/entities/user.entity';
import {
  findUserById,
  findUserByMobile,
  findUserByEmailLower,
  findUserByGoogleId,
  findUserByAppleId,
  findUserByFacebookId,
  createUser,
  updateUserById,
  patchUserOnboarding,
} from '../models/queries/user.query';
import { buildOnboardingResponse, isTokenEligibleStep } from '../utils/onboarding.util';
import {
  findLatestOtpByMobile,
  createOtp,
  deleteOtpById,
  incrementOtpAttempts,
} from '../models/queries/otp.query';
import { checkAndRecordOtpSend } from '../models/queries/otp-send.query';
import {
  generateRefreshToken,
  generateSessionId,
  hashRefreshToken,
  insertLoginActivity,
  findLoginActivityByRefreshHash,
  findLoginActivityBySessionId,
  updateLoginActivityAfterRefresh,
  revokeLoginActivityBySessionId,
} from '../models/queries/login-activity.query';
import { jwtExpiryToMs } from '../../common/jwt-expiry';
import { verifyAccessJwtToken } from '../../common/verify-access-jwt';

const OTP_EXPIRY_MINUTES = 5;
const OTP_LENGTH = 5; // used for OTP generation
const VERIFIED_TOKEN_EXPIRY = '10m';
/** Lets providers call `/providers/onboarding/*` before step 4 (no refresh session). */
const ONBOARDING_JWT_EXPIRY = '7d';
const MAX_OTP_ATTEMPTS = 5;

/** OAuth email is treated as verified when the provider says so (or Facebook returns email on a valid user token). */
function oauthMarksEmailVerified(
  provider: 'google' | 'apple' | 'facebook',
  email: string | undefined,
  raw?: boolean | string
): boolean {
  if (!email?.trim()) return false;
  if (provider === 'facebook') return true;
  return raw === true || raw === 'true';
}

export class AuthService {
  private readonly responseService = new ResponseService();
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: string;
  private readonly jwtRefreshExpiresIn: string;
  private readonly bcryptRounds: number;
  private readonly googleClientId?: string;
  private readonly appleClientId?: string;
  private readonly facebookAppId?: string;
  private readonly facebookAppSecret?: string;

  constructor(config: {
    jwtSecret: string;
    jwtExpiresIn: string;
    jwtRefreshExpiresIn: string;
    bcryptRounds: number;
    googleClientId?: string;
    appleClientId?: string;
    facebookAppId?: string;
    facebookAppSecret?: string;
  }) {
    this.jwtSecret = config.jwtSecret;
    this.jwtExpiresIn = config.jwtExpiresIn;
    this.jwtRefreshExpiresIn = config.jwtRefreshExpiresIn;
    this.bcryptRounds = config.bcryptRounds;
    this.googleClientId = config.googleClientId;
    this.appleClientId = config.appleClientId;
    this.facebookAppId = config.facebookAppId;
    this.facebookAppSecret = config.facebookAppSecret;
  }

  async sendOtp(dto: SendOtpDto) {
    const gate = await checkAndRecordOtpSend(dto.mobileNumber);
    if (!gate.allowed) {
      return this.responseService.rateLimited(AuthErrorMessages.OTP_SEND_RATE_LIMITED, [
        { retryAfterSeconds: gate.retryAfterSeconds },
      ]);
    }
    const code = Math.floor(
      10 ** (OTP_LENGTH - 1) + Math.random() * 9 * 10 ** (OTP_LENGTH - 1)
    ).toString();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    await createOtp({
      mobileNumber: dto.mobileNumber,
      code,
      expiresAt,
    });
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

    const existing = await findUserByMobile(dto.mobileNumber);
    const onboarding = buildOnboardingResponse({
      role: 'user',
      isPhoneVerified: true,
      isEmailVerified: false,
      isProfileCompleted: false,
      isStepperCompleted: false,
    });
    if (existing) {
      const updated = await patchUserOnboarding(existing.id, { isPhoneVerified: true });
      if (updated) {
        // Existing user/provider: return post-OTP auth payload.
        // - tokenEligible => access+refresh tokens
        // - provider incomplete => onboardingToken for stepper APIs
        const authData = await this.buildPostOtpAuthData(updated);
        // Onboarding state lives on user.onboarding only (avoid duplicate top-level field).
        return this.responseService.success(
          ResponseCode.VALIDATION_SUCCESS,
          AuthSuccessMessages.OTP_VERIFIED,
          { verifiedToken, ...authData }
        );
      }
    }

    return this.responseService.success(
      ResponseCode.VALIDATION_SUCCESS,
      AuthSuccessMessages.OTP_VERIFIED,
      { verifiedToken, onboarding }
    );
  }

  /**
   * Provider flow without separate register step:
   * verify OTP, ensure provider user exists, and return onboarding/auth payload.
   */
  async verifyProviderOtp(dto: VerifyOtpDto) {
    const valid = await this.validateOtp(dto.mobileNumber, dto.code);
    if (valid !== true) return valid;

    const verifiedToken = jwt.sign(
      { sub: dto.mobileNumber, type: 'otp_verified' },
      this.jwtSecret,
      { expiresIn: VERIFIED_TOKEN_EXPIRY }
    );

    let user = await findUserByMobile(dto.mobileNumber);
    if (!user) {
      user = await createUser({
        mobileNumber: dto.mobileNumber,
        firstName: 'Provider',
        lastName: '',
        termsAndConditionsAccepted: true,
        isMobileVerified: true,
        isPhoneVerified: true,
        // Provider has no register/profile screen in this flow.
        isProfileCompleted: true,
        role: 'provider',
      });
    } else {
      const patched = await patchUserOnboarding(user.id, {
        isPhoneVerified: true,
        // Provider profile/register step is removed, treat as completed.
        isProfileCompleted: true,
      });
      user = patched ?? user;
    }

    const authData = await this.buildPostOtpAuthData(user);
    // Onboarding state lives on user.onboarding only (avoid duplicate top-level field).
    return this.responseService.success(
      ResponseCode.VALIDATION_SUCCESS,
      AuthSuccessMessages.OTP_VERIFIED,
      { verifiedToken, ...authData }
    );
  }

  private async buildPostOtpAuthData(user: UserEntity): Promise<{
    user: ReturnType<AuthService['toUserResponse']>;
    tokens?: Awaited<ReturnType<AuthService['issueSession']>>;
    onboardingToken?: string;
    onboardingTokenExpiresIn?: string;
  }> {
    const data: {
      user: ReturnType<AuthService['toUserResponse']>;
      tokens?: Awaited<ReturnType<AuthService['issueSession']>>;
      onboardingToken?: string;
      onboardingTokenExpiresIn?: string;
    } = {
      user: this.toUserResponse(user),
    };
    if (isTokenEligibleStep(user.currentStep)) {
      data.tokens = await this.issueSession(user);
      return data;
    }
    if (user.role === 'provider') {
      data.onboardingToken = this.signOnboardingToken(user);
      data.onboardingTokenExpiresIn = ONBOARDING_JWT_EXPIRY;
    }
    return data;
  }

  private async validateOtp(
    mobileNumber: string,
    code: string
  ): Promise<ReturnType<AuthService['responseService']['badRequest']> | true> {
    const record = await findLatestOtpByMobile(mobileNumber);
    if (!record) {
      return this.responseService.badRequest(AuthErrorMessages.OTP_NOT_FOUND);
    }
    if (record.expiresAt < new Date()) {
      await deleteOtpById(record.id);
      return this.responseService.badRequest(AuthErrorMessages.OTP_EXPIRED);
    }
    if (record.attempts >= MAX_OTP_ATTEMPTS) {
      await deleteOtpById(record.id);
      return this.responseService.badRequest(AuthErrorMessages.OTP_MAX_ATTEMPTS);
    }
    if (record.code !== code) {
      await incrementOtpAttempts(record.id);
      return this.responseService.badRequest(AuthErrorMessages.INVALID_OTP);
    }
    await deleteOtpById(record.id);
    return true;
  }

  async register(dto: RegisterDto, verifiedToken?: string, sessionMeta?: SessionMeta) {
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
    const existing = await findUserByMobile(mobileNumber);
    if (existing) {
      return this.responseService.badRequest(AuthErrorMessages.USER_ALREADY_EXISTS);
    }
    if (dto.email) {
      const existingEmail = await findUserByEmailLower(dto.email.toLowerCase());
      if (existingEmail) {
        return this.responseService.badRequest(AuthErrorMessages.USER_ALREADY_EXISTS);
      }
    }
    const phoneVerifiedViaOtp = Boolean(verifiedToken);
    const user = await createUser({
      mobileNumber,
      countryCode: dto.countryCode,
      email: dto.email ? dto.email.toLowerCase() : undefined,
      firstName: dto.firstName,
      lastName: dto.lastName,
      emergencyNumber: dto.emergencyNumber || undefined,
      gender: dto.gender as GenderType,
      referCode: dto.referCode,
      termsAndConditionsAccepted: true,
      isMobileVerified: phoneVerifiedViaOtp,
      isPhoneVerified: phoneVerifiedViaOtp,
      isProfileCompleted: true,
      role: (dto.role ?? 'user') as UserRoleType,
    });
    return this.registerOrLoginSuccess(user, ResponseCode.CREATED, AuthSuccessMessages.USER_REGISTERED, sessionMeta);
  }

  async login(dto: LoginDto, sessionMeta?: SessionMeta) {
    if (dto.code !== undefined && dto.mobileNumber) {
      const valid = await this.validateOtp(dto.mobileNumber, dto.code);
      if (valid !== true) return valid;
      let user = await findUserByMobile(dto.mobileNumber);
      if (!user) {
        return this.responseService.badRequest(AuthErrorMessages.USER_NOT_FOUND);
      }
      if (!user.isActive) {
        return this.responseService.badRequest(AuthErrorMessages.AUTHENTICATION_FAILED);
      }
      const patched = await patchUserOnboarding(user.id, { isPhoneVerified: true });
      user = patched ?? user;
      return this.registerOrLoginSuccess(
        user,
        ResponseCode.LOGIN_SUCCESS,
        AuthSuccessMessages.LOGIN_SUCCESS,
        sessionMeta
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
    const user = byMobile
      ? await findUserByMobile(byMobile.mobileNumber)
      : await findUserByEmailLower(byEmail!.email);
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
    return this.registerOrLoginSuccess(
      user,
      ResponseCode.LOGIN_SUCCESS,
      AuthSuccessMessages.LOGIN_SUCCESS,
      sessionMeta
    );
  }

  async loginWithGoogle(dto: GoogleAuthDto, sessionMeta?: SessionMeta) {
    if (!this.googleClientId) {
      return this.responseService.badRequest(AuthErrorMessages.OAUTH_NOT_CONFIGURED);
    }
    try {
      const payload = await verifyGoogleIdToken(dto.idToken, this.googleClientId);
      return await this.findOrCreateOAuthUser(
        'google',
        payload.sub,
        payload.email,
        oauthMarksEmailVerified('google', payload.email, payload.email_verified),
        payload.given_name ?? payload.name?.split(' ')[0] ?? 'User',
        payload.family_name ?? (payload.name?.split(' ').slice(1).join(' ') || 'User'),
        dto.role ?? 'user',
        dto.termsAndConditionsAccepted,
        sessionMeta
      );
    } catch {
      return this.responseService.badRequest(AuthErrorMessages.INVALID_OAUTH_TOKEN);
    }
  }

  async loginWithApple(dto: AppleAuthDto, sessionMeta?: SessionMeta) {
    if (!this.appleClientId) {
      return this.responseService.badRequest(AuthErrorMessages.OAUTH_NOT_CONFIGURED);
    }
    try {
      const payload = await verifyAppleIdentityToken(
        dto.identityToken,
        this.appleClientId
      );
      const namePart = payload.email?.split('@')[0] ?? 'User';
      return await this.findOrCreateOAuthUser(
        'apple',
        payload.sub,
        payload.email,
        oauthMarksEmailVerified('apple', payload.email, payload.email_verified),
        namePart,
        'User',
        dto.role ?? 'user',
        dto.termsAndConditionsAccepted,
        sessionMeta
      );
    } catch {
      return this.responseService.badRequest(AuthErrorMessages.INVALID_OAUTH_TOKEN);
    }
  }

  async loginWithOAuth(
    dto: { provider: string; token: string; role?: string; termsAndConditionsAccepted?: boolean },
    sessionMeta?: SessionMeta
  ) {
    try {
      if (dto.provider === 'google') {
        if (!this.googleClientId) {
          return this.responseService.badRequest(AuthErrorMessages.OAUTH_NOT_CONFIGURED);
        }
        const payload = await verifyGoogleIdToken(dto.token, this.googleClientId);
        return await this.findOrCreateOAuthUser(
          'google',
          payload.sub,
          payload.email,
          oauthMarksEmailVerified('google', payload.email, payload.email_verified),
          payload.given_name ?? payload.name?.split(' ')[0] ?? 'User',
          payload.family_name ?? (payload.name?.split(' ').slice(1).join(' ') || 'User'),
          dto.role ?? 'user',
          dto.termsAndConditionsAccepted,
          sessionMeta
        );
      }

      if (dto.provider === 'apple') {
        if (!this.appleClientId) {
          return this.responseService.badRequest(AuthErrorMessages.OAUTH_NOT_CONFIGURED);
        }
        const payload = await verifyAppleIdentityToken(dto.token, this.appleClientId);
        const namePart = payload.email?.split('@')[0] ?? 'User';
        return await this.findOrCreateOAuthUser(
          'apple',
          payload.sub,
          payload.email,
          oauthMarksEmailVerified('apple', payload.email, payload.email_verified),
          namePart,
          'User',
          dto.role ?? 'user',
          dto.termsAndConditionsAccepted,
          sessionMeta
        );
      }

      if (!this.facebookAppId || !this.facebookAppSecret) {
        return this.responseService.badRequest(AuthErrorMessages.OAUTH_NOT_CONFIGURED);
      }
      const fb = await verifyFacebookAccessToken({
        accessToken: dto.token,
        appId: this.facebookAppId,
        appSecret: this.facebookAppSecret,
      });
      const parts = (fb.name ?? 'User').trim().split(' ');
      const firstName = parts[0] || 'User';
      const lastName = parts.slice(1).join(' ') || 'User';
      return await this.findOrCreateOAuthUser(
        'facebook',
        fb.id,
        fb.email,
        oauthMarksEmailVerified('facebook', fb.email, undefined),
        firstName,
        lastName,
        dto.role ?? 'user',
        dto.termsAndConditionsAccepted,
        sessionMeta
      );
    } catch {
      return this.responseService.badRequest(AuthErrorMessages.INVALID_OAUTH_TOKEN);
    }
  }

  private async findOrCreateOAuthUser(
    provider: 'google' | 'apple' | 'facebook',
    providerId: string,
    email: string | undefined,
    oauthEmailVerified: boolean,
    firstName: string,
    lastName: string,
    role: string,
    termsAccepted: boolean | undefined,
    sessionMeta?: SessionMeta
  ) {
    const idField =
      provider === 'google' ? 'googleId' : provider === 'apple' ? 'appleId' : 'facebookId';
    let user =
      provider === 'google'
        ? await findUserByGoogleId(providerId)
        : provider === 'apple'
          ? await findUserByAppleId(providerId)
          : await findUserByFacebookId(providerId);
    if (user) {
      if (!user.isActive) {
        return this.responseService.badRequest(AuthErrorMessages.AUTHENTICATION_FAILED);
      }
      return this.registerOrLoginSuccess(
        user,
        ResponseCode.LOGIN_SUCCESS,
        AuthSuccessMessages.LOGIN_SUCCESS,
        sessionMeta
      );
    }
    if (email) {
      user = await findUserByEmailLower(email.toLowerCase());
      if (user) {
        const updated =
          idField === 'googleId'
            ? await updateUserById(user.id, { googleId: providerId })
            : idField === 'appleId'
              ? await updateUserById(user.id, { appleId: providerId })
              : await updateUserById(user.id, { facebookId: providerId });
        const linked = updated ?? (await findUserById(user.id));
        if (!linked) {
          return this.responseService.badRequest(AuthErrorMessages.USER_NOT_FOUND);
        }
        if (!linked.isActive) {
          return this.responseService.badRequest(AuthErrorMessages.AUTHENTICATION_FAILED);
        }
        return this.registerOrLoginSuccess(
          linked,
          ResponseCode.LOGIN_SUCCESS,
          AuthSuccessMessages.LOGIN_SUCCESS,
          sessionMeta
        );
      }
    }
    if (!termsAccepted) {
      return this.responseService.badRequest(
        AuthErrorMessages.TERMS_AND_CONDITIONS_REQUIRED
      );
    }
    const roleTyped = role as UserRoleType;
    const isProvider = roleTyped === 'provider';
    // No placeholder mobile: OAuth users may have null phone; onboarding uses verified email + flags.
    const newUser = await createUser({
      mobileNumber: null,
      firstName,
      lastName,
      email: email?.toLowerCase(),
      googleId: idField === 'googleId' ? providerId : undefined,
      appleId: idField === 'appleId' ? providerId : undefined,
      facebookId: idField === 'facebookId' ? providerId : undefined,
      termsAndConditionsAccepted: true,
      isMobileVerified: false,
      isPhoneVerified: false,
      isEmailVerified: oauthEmailVerified,
      isProfileCompleted: true,
      isStepperCompleted: isProvider ? false : true,
      role: roleTyped,
    });
    return this.registerOrLoginSuccess(
      newUser,
      ResponseCode.CREATED,
      AuthSuccessMessages.USER_REGISTERED,
      sessionMeta
    );
  }

  async refresh(refreshToken: string) {
    const hash = hashRefreshToken(refreshToken, this.jwtSecret);
    const row = await findLoginActivityByRefreshHash(hash);
    if (!row || !row.isActive) {
      return this.responseService.unauthorized(AuthErrorMessages.INVALID_REFRESH_TOKEN);
    }
    if (row.refreshTokenExpiresAt < new Date()) {
      return this.responseService.unauthorized(AuthErrorMessages.INVALID_REFRESH_TOKEN);
    }
    const user = await findUserById(row.userId);
    if (!user || !user.isActive) {
      return this.responseService.unauthorized(AuthErrorMessages.INVALID_REFRESH_TOKEN);
    }
    if (!isTokenEligibleStep(user.currentStep)) {
      return this.responseService.unauthorized(AuthErrorMessages.ONBOARDING_INCOMPLETE);
    }
    const newRaw = generateRefreshToken();
    const newHash = hashRefreshToken(newRaw, this.jwtSecret);
    const now = Date.now();
    const accessExp = new Date(now + jwtExpiryToMs(this.jwtExpiresIn));
    const refreshExp = new Date(now + jwtExpiryToMs(this.jwtRefreshExpiresIn));
    await updateLoginActivityAfterRefresh({
      sessionId: row.sessionId,
      refreshTokenHash: newHash,
      refreshTokenExpiresAt: refreshExp,
      accessTokenExpiresAt: accessExp,
    });
    const accessToken = this.signAccessToken(user, row.sessionId);
    return this.responseService.success(ResponseCode.LOGIN_SUCCESS, AuthSuccessMessages.LOGIN_SUCCESS, {
      accessToken,
      refreshToken: newRaw,
      expiresIn: this.jwtExpiresIn,
      refreshExpiresAt: refreshExp.toISOString(),
      sessionId: row.sessionId,
    });
  }

  async getProfile(userId: string) {
    const user = await findUserById(userId);
    if (!user) {
      return this.responseService.notFound(AuthErrorMessages.USER_NOT_FOUND);
    }
    return this.responseService.success(
      ResponseCode.RETRIEVED,
      'Profile retrieved',
      this.toUserResponse(user)
    );
  }

  async logout(userId: string, sessionId?: string) {
    if (sessionId) {
      const row = await findLoginActivityBySessionId(sessionId);
      if (row?.userId === userId) {
        await revokeLoginActivityBySessionId(sessionId);
      }
    }
    return this.responseService.success(
      ResponseCode.LOGOUT_SUCCESS,
      AuthSuccessMessages.LOGOUT_SUCCESS,
      null
    );
  }

  verifyToken(token: string): JwtPayload | null {
    return verifyAccessJwtToken(token, this.jwtSecret);
  }

  private signAccessToken(user: UserEntity, sessionId: string): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email ?? '',
      mobileNumber: user.mobileNumber ?? '',
      sid: sessionId,
      typ: 'access',
    };
    const options: jwt.SignOptions = {
      expiresIn: this.jwtExpiresIn as jwt.SignOptions['expiresIn'],
    };
    return jwt.sign(payload as object, this.jwtSecret, options);
  }

  private async issueSession(
    user: UserEntity,
    meta?: SessionMeta
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
    refreshExpiresAt: string;
    sessionId: string;
  }> {
    const sessionId = generateSessionId();
    const rawRefresh = generateRefreshToken();
    const refreshHash = hashRefreshToken(rawRefresh, this.jwtSecret);
    const now = Date.now();
    const accessExp = new Date(now + jwtExpiryToMs(this.jwtExpiresIn));
    const refreshExp = new Date(now + jwtExpiryToMs(this.jwtRefreshExpiresIn));
    await insertLoginActivity({
      userId: user.id,
      sessionId,
      refreshTokenHash: refreshHash,
      accessTokenExpiresAt: accessExp,
      refreshTokenExpiresAt: refreshExp,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      fcmToken: meta?.fcmToken,
      apnsToken: meta?.apnsToken,
      onesignalPlayerId: meta?.onesignalPlayerId,
      devicePlatform: meta?.devicePlatform,
      timezone: meta?.timezone,
      deviceInfo: meta?.deviceInfo,
      locationInfo: meta?.locationInfo,
    });
    const accessToken = this.signAccessToken(user, sessionId);
    return {
      accessToken,
      refreshToken: rawRefresh,
      expiresIn: this.jwtExpiresIn,
      refreshExpiresAt: refreshExp.toISOString(),
      sessionId,
    };
  }

  private async registerOrLoginSuccess(
    user: UserEntity,
    code: ResponseCode,
    message: string,
    sessionMeta?: SessionMeta
  ) {
    if (!isTokenEligibleStep(user.currentStep)) {
      const data: {
        user: ReturnType<AuthService['toUserResponse']>;
        onboardingToken?: string;
        onboardingTokenExpiresIn?: string;
      } = {
        user: this.toUserResponse(user),
      };
      if (user.role === 'provider') {
        data.onboardingToken = this.signOnboardingToken(user);
        data.onboardingTokenExpiresIn = ONBOARDING_JWT_EXPIRY;
      }
      return this.responseService.success(code, message, data);
    }
    const tokens = await this.issueSession(user, sessionMeta);
    return this.responseService.success(code, message, {
      user: this.toUserResponse(user),
      tokens,
    });
  }

  /** Scoped JWT for provider stepper APIs (`typ: 'onboarding'`). */
  private signOnboardingToken(user: UserEntity): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email ?? '',
      mobileNumber: user.mobileNumber ?? '',
      typ: 'onboarding',
    };
    return jwt.sign(payload as object, this.jwtSecret, {
      expiresIn: ONBOARDING_JWT_EXPIRY,
    });
  }

  private toUserResponse(user: UserEntity): {
    id: string;
    email?: string;
    mobileNumber?: string;
    firstName: string;
    lastName: string;
    role: string;
    onboarding: ReturnType<typeof buildOnboardingResponse>;
  } {
    return {
      id: user.id,
      email: user.email,
      mobileNumber: user.mobileNumber,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      onboarding: buildOnboardingResponse({
        role: user.role,
        isPhoneVerified: user.isPhoneVerified,
        isEmailVerified: user.isEmailVerified,
        isProfileCompleted: user.isProfileCompleted,
        isStepperCompleted: user.isStepperCompleted,
      }),
    };
  }
}
