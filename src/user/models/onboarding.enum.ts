/** Stored on `users.current_step` — 0–4 onboarding pipeline. */
export const UserOnboardingStep = {
  NEED_PHONE_VERIFICATION: 0,
  PHONE_VERIFIED_NEED_PROFILE: 1,
  NEED_PROVIDER_STEPPER: 2,
  /** Reserved: stepper submitted; app promotes to READY immediately when checks pass. */
  STEPPER_SUBMITTED: 3,
  READY_FOR_TOKENS: 4,
} as const;
export type UserOnboardingStepValue =
  (typeof UserOnboardingStep)[keyof typeof UserOnboardingStep];

export const TOKEN_ELIGIBLE_STEP = UserOnboardingStep.READY_FOR_TOKENS;

/**
 * What the client should do next (maps to Figma / stepper screens).
 */
export const NextOnboardingAction = {
  VERIFY_PHONE: 'VERIFY_PHONE',
  COMPLETE_PROFILE: 'COMPLETE_PROFILE',
  COMPLETE_PROVIDER_STEPPER: 'COMPLETE_PROVIDER_STEPPER',
  VERIFY_PHONE_TO_FINISH: 'VERIFY_PHONE_TO_FINISH',
  NONE: 'NONE',
} as const;
export type NextOnboardingActionValue =
  (typeof NextOnboardingAction)[keyof typeof NextOnboardingAction];
