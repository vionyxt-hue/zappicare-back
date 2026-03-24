/** Stored on `users.current_step` — 0–3 onboarding pipeline. */
export const UserOnboardingStep = {
  NEED_PHONE_VERIFICATION: 0,
  PHONE_VERIFIED_NEED_PROFILE: 1,
  NEED_PROVIDER_STEPPER: 2,
  READY_FOR_TOKENS: 3,
} as const;
export type UserOnboardingStepValue =
  (typeof UserOnboardingStep)[keyof typeof UserOnboardingStep];

export const TOKEN_ELIGIBLE_STEP = UserOnboardingStep.READY_FOR_TOKENS;

export const NextOnboardingAction = {
  VERIFY_PHONE: 'VERIFY_PHONE',
  COMPLETE_PROFILE: 'COMPLETE_PROFILE',
  COMPLETE_PROVIDER_STEPPER: 'COMPLETE_PROVIDER_STEPPER',
  VERIFY_PHONE_TO_FINISH: 'VERIFY_PHONE_TO_FINISH',
  NONE: 'NONE',
} as const;
export type NextOnboardingActionValue =
  (typeof NextOnboardingAction)[keyof typeof NextOnboardingAction];
