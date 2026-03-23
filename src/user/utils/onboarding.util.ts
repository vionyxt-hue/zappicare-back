import type { UserRoleType } from '../models/user.schema';
import {
  NextOnboardingAction,
  UserOnboardingStep,
  type NextOnboardingActionValue,
  type UserOnboardingStepValue,
  TOKEN_ELIGIBLE_STEP,
} from '../models/onboarding.enum';

export const ONBOARDING_TOTAL_STEPS = 4;

export function computeCurrentStep(input: {
  role: UserRoleType;
  isPhoneVerified: boolean;
  isProfileCompleted: boolean;
  isStepperCompleted: boolean;
}): UserOnboardingStepValue {
  const { role, isPhoneVerified: p, isProfileCompleted: prof, isStepperCompleted: s } =
    input;
  if (!p) return UserOnboardingStep.NEED_PHONE_VERIFICATION;
  if (!prof) return UserOnboardingStep.PHONE_VERIFIED_NEED_PROFILE;
  if (role === 'provider') {
    if (!s) return UserOnboardingStep.NEED_PROVIDER_STEPPER;
    return UserOnboardingStep.READY_FOR_TOKENS;
  }
  return UserOnboardingStep.READY_FOR_TOKENS;
}

export function isTokenEligibleStep(currentStep: number): boolean {
  return currentStep >= TOKEN_ELIGIBLE_STEP;
}

export function nextOnboardingAction(input: {
  role: UserRoleType;
  isPhoneVerified: boolean;
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
  isProfileCompleted: boolean;
  isStepperCompleted: boolean;
}): {
  currentStep: UserOnboardingStepValue;
  totalSteps: number;
  isPhoneVerified: boolean;
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
    isProfileCompleted: input.isProfileCompleted,
    isStepperCompleted: input.isStepperCompleted,
    tokenEligible: isTokenEligibleStep(currentStep),
    nextAction: nextOnboardingAction(input),
  };
}
