import type { UserRoleType } from '../models/entities/user.entity';
import {
  NextOnboardingAction,
  UserOnboardingStep,
  type NextOnboardingActionValue,
  type UserOnboardingStepValue,
  TOKEN_ELIGIBLE_STEP,
} from '../enums/onboarding.enum';

export const ONBOARDING_TOTAL_STEPS = 3;

export function computeCurrentStep(input: {
  role: UserRoleType;
  isPhoneVerified: boolean;
  /** OAuth (or other) verified email — counts as “contact verified” when phone is absent. */
  isEmailVerified: boolean;
  isProfileCompleted: boolean;
  isStepperCompleted: boolean;
}): UserOnboardingStepValue {
  const {
    role,
    isPhoneVerified: p,
    isEmailVerified: e,
    isProfileCompleted: prof,
    isStepperCompleted: s,
  } = input;
  const contactVerified = p || e;
  if (!contactVerified) return UserOnboardingStep.NEED_PHONE_VERIFICATION;
  if (role === 'provider') {
    // Provider: phone OTP or verified email (e.g. Google) → stepper next.
    if (!s) return UserOnboardingStep.NEED_PROVIDER_STEPPER;
    return UserOnboardingStep.READY_FOR_TOKENS;
  }
  if (!prof) return UserOnboardingStep.PHONE_VERIFIED_NEED_PROFILE;
  return UserOnboardingStep.READY_FOR_TOKENS;
}

export function isTokenEligibleStep(currentStep: number): boolean {
  return currentStep >= TOKEN_ELIGIBLE_STEP;
}

export function nextOnboardingAction(input: {
  role: UserRoleType;
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  isProfileCompleted: boolean;
  isStepperCompleted: boolean;
}): NextOnboardingActionValue {
  const step = computeCurrentStep(input);
  switch (step) {
    case UserOnboardingStep.READY_FOR_TOKENS:
      return NextOnboardingAction.NONE;
    case UserOnboardingStep.NEED_PHONE_VERIFICATION:
      return NextOnboardingAction.VERIFY_PHONE;
    case UserOnboardingStep.PHONE_VERIFIED_NEED_PROFILE:
      return NextOnboardingAction.COMPLETE_PROFILE;
    case UserOnboardingStep.NEED_PROVIDER_STEPPER:
      return NextOnboardingAction.COMPLETE_PROVIDER_STEPPER;
    default:
      return NextOnboardingAction.NONE;
  }
}

export function buildOnboardingResponse(input: {
  role: UserRoleType;
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  isProfileCompleted: boolean;
  isStepperCompleted: boolean;
}): {
  currentStep: UserOnboardingStepValue;
  totalSteps: number;
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  isProfileCompleted: boolean;
  isStepperCompleted: boolean;
  tokenEligible: boolean;
  nextAction: NextOnboardingActionValue;
} {
  const currentStep = computeCurrentStep(input);
  return {
    currentStep,
    totalSteps: ONBOARDING_TOTAL_STEPS,
    isPhoneVerified: input.isPhoneVerified,
    isEmailVerified: input.isEmailVerified,
    isProfileCompleted: input.isProfileCompleted,
    isStepperCompleted: input.isStepperCompleted,
    tokenEligible: isTokenEligibleStep(currentStep),
    nextAction: nextOnboardingAction(input),
  };
}
