export const OAuthProvider = ['google', 'apple', 'facebook'] as const;
export type OAuthProviderType = (typeof OAuthProvider)[number];

