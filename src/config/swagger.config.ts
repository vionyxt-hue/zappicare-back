/** OpenAPI 3.0 document for Swagger UI */
export const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'ZappieCare API',
    description:
      'ZappieCare Backend API – Auth (OTP, email/password, Google, Apple), registration, refresh tokens, and onboarding (steps 0–4; full access+refresh only when tokenEligible).',
    version: '1.0.0',
  },
  servers: [
    { url: 'http://localhost:3000', description: 'Development' },
  ],
  tags: [
    { name: 'Health', description: 'Health check' },
    { name: 'Auth', description: 'Authentication (OTP, email/password, Google, Apple)' },
    { name: 'Provider Verification', description: 'Provider onboarding entry: send OTP and verify OTP' },
    { name: 'Provider Onboarding', description: 'Provider onboarding (personal info, professional details, documents, bank details)' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Returns API health status.',
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    statusCode: { type: 'integer', example: 200 },
                    responseCode: { type: 'string', example: 'SUCCESS' },
                    message: { type: 'string', example: 'OK' },
                    data: {
                      type: 'object',
                      properties: { status: { type: 'string', example: 'healthy' } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/auth/send-otp': {
      post: {
        tags: ['Auth'],
        summary: 'Send OTP',
        description: 'Sends a 5-digit OTP to the given mobile number. User must accept terms.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['mobileNumber', 'termsAndConditionsAccepted'],
                properties: {
                  mobileNumber: { type: 'string', example: '8160495306', description: '10–15 digits' },
                  countryCode: { type: 'string', example: '+91', default: '+91' },
                  termsAndConditionsAccepted: { type: 'boolean', enum: [true], description: 'Must be true' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'OTP sent', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessWithData' } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '429': {
            description: 'Too many OTP sends (max 5 per 5 minutes per mobile); check errors[0].retryAfterSeconds',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/RateLimitErrorResponse' } } },
          },
        },
      },
    },
    '/auth/verify-otp': {
      post: {
        tags: ['Auth'],
        summary: 'Verify OTP',
        description:
          'Verifies OTP. When a user exists, onboarding state is returned only inside `data.user.onboarding` (no duplicate top-level `onboarding`).',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['mobileNumber', 'code'],
                properties: {
                  mobileNumber: { type: 'string', example: '8160495306' },
                  code: { type: 'string', example: '58149', minLength: 5, maxLength: 5, description: '5-digit OTP' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'OTP verified',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    statusCode: { type: 'integer' },
                    responseCode: { type: 'string' },
                    message: { type: 'string' },
                    data: {
                      type: 'object',
                      properties: {
                        verifiedToken: { type: 'string', description: 'Short-lived OTP verification token' },
                        onboarding: {
                          description:
                            'Only when no user exists yet (first-time flow). If `user` is present, use `user.onboarding` instead.',
                          allOf: [{ $ref: '#/components/schemas/OnboardingState' }],
                        },
                        user: { $ref: '#/components/schemas/UserResponse' },
                        onboardingToken: { type: 'string' },
                        onboardingTokenExpiresIn: { type: 'string', example: '7d' },
                        tokens: { $ref: '#/components/schemas/Tokens' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': { description: 'Invalid or expired OTP', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register (create account)',
        description:
          'Creates a user after OTP verification. Send x-verified-token header with the token from verify-otp. Access+refresh tokens are returned only when onboarding is complete (tokenEligible); otherwise only `user` is returned.',
        parameters: [
          {
            name: 'x-verified-token',
            in: 'header',
            required: true,
            description: 'JWT from POST /auth/verify-otp',
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['mobileNumber', 'firstName', 'lastName', 'gender'],
                properties: {
                  mobileNumber: { type: 'string', example: '8160495306' },
                  countryCode: { type: 'string', example: '+91' },
                  firstName: { type: 'string', example: 'Sanjana' },
                  lastName: { type: 'string', example: 'Dubey' },
                  emergencyNumber: { type: 'string', example: '8160495306' },
                  email: { type: 'string', format: 'email', example: 'user@example.com' },
                  referCode: { type: 'string', example: '2000000' },
                  gender: { type: 'string', enum: ['Male', 'Female', 'Other'] },
                  role: { type: 'string', enum: ['user', 'provider'], default: 'user' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'User registered',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    statusCode: { type: 'integer' },
                    responseCode: { type: 'string' },
                    message: { type: 'string' },
                    data: {
                      type: 'object',
                      properties: {
                        user: { $ref: '#/components/schemas/UserResponse' },
                        tokens: { $ref: '#/components/schemas/Tokens', description: 'Present only when tokenEligible' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': { description: 'Validation or OTP required', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login',
        description:
          'Login with (1) mobileNumber + code (OTP), or (2) mobileNumber + password, or (3) email + password. Tokens are omitted until onboarding is complete. Optional body fields for session: fcmToken, devicePlatform, timezone, deviceInfo, locationInfo.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  mobileNumber: { type: 'string', example: '8160495306' },
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                  code: { type: 'string', minLength: 5, maxLength: 5, description: 'OTP when using mobile' },
                  fcmToken: { type: 'string' },
                  apnsToken: { type: 'string' },
                  onesignalPlayerId: { type: 'string' },
                  devicePlatform: { type: 'string' },
                  timezone: { type: 'string' },
                  deviceInfo: { type: 'object' },
                  locationInfo: { type: 'object' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login success (tokens only if tokenEligible)',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    statusCode: { type: 'integer' },
                    responseCode: { type: 'string' },
                    message: { type: 'string' },
                    data: {
                      type: 'object',
                      properties: {
                        user: { $ref: '#/components/schemas/UserResponse' },
                        tokens: { $ref: '#/components/schemas/Tokens', description: 'Omitted until onboarding complete' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/auth/oauth': {
      post: {
        tags: ['Auth'],
        summary: 'OAuth login (Google/Apple/Facebook)',
        description:
          'Single OAuth endpoint. Send provider token and receive the same response shape as login (tokens only when tokenEligible). For new users, termsAndConditionsAccepted must be true.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['provider', 'token'],
                properties: {
                  provider: { type: 'string', enum: ['google', 'apple', 'facebook'] },
                  token: { type: 'string', description: 'google:idToken, apple:identityToken, facebook:access_token' },
                  role: { type: 'string', enum: ['user', 'provider'], default: 'user' },
                  termsAndConditionsAccepted: { type: 'boolean', enum: [true], description: 'Required for new sign-ups' },
                  fcmToken: { type: 'string' },
                  apnsToken: { type: 'string' },
                  onesignalPlayerId: { type: 'string' },
                  devicePlatform: { type: 'string' },
                  timezone: { type: 'string' },
                  deviceInfo: { type: 'object' },
                  locationInfo: { type: 'object' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Login success', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthSuccessResponse' } } } },
          '201': { description: 'User created', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthSuccessResponse' } } } },
          '400': { description: 'Invalid token/terms missing', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        description:
          'Exchanges a valid refresh token for new access and refresh tokens. Session row is rotated in `login_activity`.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: { refreshToken: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'New tokens',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    statusCode: { type: 'integer' },
                    responseCode: { type: 'string' },
                    message: { type: 'string' },
                    data: { $ref: '#/components/schemas/Tokens' },
                  },
                },
              },
            },
          },
          '401': { description: 'Invalid or expired refresh', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout',
        description:
          'Revokes the current session (from access JWT `sid`). Requires Bearer access token.',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Logout success',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    statusCode: { type: 'integer' },
                    responseCode: { type: 'string' },
                    message: { type: 'string' },
                    data: { type: 'object', nullable: true },
                  },
                },
              },
            },
          },
          '401': { description: 'Missing or invalid token', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current user profile',
        description: 'Returns the authenticated user profile. Requires Bearer token.',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Profile',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    statusCode: { type: 'integer' },
                    responseCode: { type: 'string' },
                    message: { type: 'string' },
                    data: { $ref: '#/components/schemas/UserResponse' },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'User not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },

    // ---------- Provider Verification ----------
    '/providers/verification/send-otp': {
      post: {
        tags: ['Provider Verification'],
        summary: 'Send OTP (provider)',
        description: 'Sends a 5-digit OTP to the given mobile number for provider sign-up. User must accept terms.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['mobileNumber', 'termsAndConditionsAccepted'],
                properties: {
                  mobileNumber: { type: 'string', example: '8160495306', description: '10–15 digits' },
                  countryCode: { type: 'string', example: '+91', default: '+91' },
                  termsAndConditionsAccepted: { type: 'boolean', enum: [true], description: 'Must be true' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'OTP sent', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessWithData' } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '429': {
            description: 'OTP send rate limited',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/RateLimitErrorResponse' } } },
          },
        },
      },
    },
    '/providers/verification/verify-otp': {
      post: {
        tags: ['Provider Verification'],
        summary: 'Verify OTP (provider)',
        description:
          'Verifies OTP and returns provider user + tokens. Onboarding state is only in `data.user.onboarding` (no duplicate top-level `onboarding`).',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['mobileNumber', 'code'],
                properties: {
                  mobileNumber: { type: 'string', example: '8160495306' },
                  code: { type: 'string', example: '58149', minLength: 5, maxLength: 5, description: '5-digit OTP' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'OTP verified',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    statusCode: { type: 'integer' },
                    responseCode: { type: 'string' },
                    message: { type: 'string' },
                    data: {
                      type: 'object',
                      properties: {
                        verifiedToken: { type: 'string', description: 'Short-lived OTP verification token' },
                        user: { $ref: '#/components/schemas/UserResponse' },
                        onboardingToken: { type: 'string' },
                        onboardingTokenExpiresIn: { type: 'string', example: '7d' },
                        tokens: { $ref: '#/components/schemas/Tokens' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': { description: 'Invalid or expired OTP', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    // ---------- Provider Onboarding ----------
    '/providers/onboarding/status': {
      get: {
        tags: ['Provider Onboarding'],
        summary: 'Get onboarding status',
        description:
          'Returns current onboarding step, verification status, and provider summary. Use **accessToken** after onboarding is complete, or **onboardingToken** from register/login while step 4 is not reached (JWT typ=onboarding).',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Onboarding status',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    statusCode: { type: 'integer' },
                    responseCode: { type: 'string' },
                    message: { type: 'string' },
                    data: {
                      type: 'object',
                      properties: {
                        onboardingStep: { type: 'string', enum: ['personal_info', 'professional_details', 'documents', 'bank_details', 'submitted'] },
                        verificationStatus: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
                        provider: { $ref: '#/components/schemas/ProviderResponse' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/providers/onboarding/personal-info': {
      post: {
        tags: ['Provider Onboarding'],
        summary: 'Submit personal info',
        description:
          'Step 1: Submit or update provider personal information. `fullName` is mandatory and stored as users.first_name (users.last_name is forced to empty string). Send `countryCode` (e.g. +91) and `phoneNumber` (national digits only) separately; both are stored on the provider profile and synced to users.country_code and users.mobile_number.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PersonalInfoRequest' },
            },
          },
        },
        responses: {
          '200': { description: 'Saved', content: { 'application/json': { schema: { $ref: '#/components/schemas/ProviderSuccessResponse' } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/providers/onboarding/professional-profile': {
      post: {
        tags: ['Provider Onboarding'],
        summary: 'Add professional profile',
        description: 'Step 2 (Doctor): Add a professional profile (qualification, experience, work mode, availability, specialization).',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ProfessionalProfileRequest' },
            },
          },
        },
        responses: {
          '200': { description: 'Profile added', content: { 'application/json': { schema: { $ref: '#/components/schemas/ProviderSuccessResponse' } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Provider not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/providers/onboarding/professional-profile/{profileIndex}': {
      put: {
        tags: ['Provider Onboarding'],
        summary: 'Update professional profile',
        description: 'Update an existing professional profile by index (0-based).',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'profileIndex', in: 'path', required: true, schema: { type: 'integer', minimum: 0 }, description: '0-based index of the profile' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ProfessionalProfileRequest' },
            },
          },
        },
        responses: {
          '200': { description: 'Profile updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/ProviderSuccessResponse' } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Profile not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/providers/onboarding/lab-professional-details': {
      post: {
        tags: ['Provider Onboarding'],
        summary: 'Submit lab professional details',
        description: 'Step 2 (Labs): Lab name, registration number, services, operating hours. Required when provider type is Labs.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LabProfessionalDetailsRequest' },
            },
          },
        },
        responses: {
          '200': { description: 'Saved', content: { 'application/json': { schema: { $ref: '#/components/schemas/ProviderSuccessResponse' } } } },
          '400': { description: 'Validation error or wrong provider type', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Provider not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/providers/onboarding/ambulance-professional-details': {
      post: {
        tags: ['Provider Onboarding'],
        summary: 'Submit ambulance professional details',
        description: 'Step 2 (Ambulance): Driver, vehicle, license, ambulance type, coverage area. Required when provider type is Ambulance.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AmbulanceProfessionalDetailsRequest' },
            },
          },
        },
        responses: {
          '200': { description: 'Saved', content: { 'application/json': { schema: { $ref: '#/components/schemas/ProviderSuccessResponse' } } } },
          '400': { description: 'Validation error or wrong provider type', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Provider not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/providers/onboarding/nurse-professional-details': {
      post: {
        tags: ['Provider Onboarding'],
        summary: 'Submit nurse professional details',
        description: 'Step 2 (Nurse): Certification, services, coverage area, availability. Required when provider type is Nurse.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/NurseProfessionalDetailsRequest' },
            },
          },
        },
        responses: {
          '200': { description: 'Saved', content: { 'application/json': { schema: { $ref: '#/components/schemas/ProviderSuccessResponse' } } } },
          '400': { description: 'Validation error or wrong provider type', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Provider not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/providers/onboarding/hospital-professional-details': {
      post: {
        tags: ['Provider Onboarding'],
        summary: 'Submit hospital professional details',
        description: 'Step 2 (Hospital/Institution): Hospital name, registration/license number, departments, operating hours.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/HospitalProfessionalDetailsRequest' },
            },
          },
        },
        responses: {
          '200': { description: 'Saved', content: { 'application/json': { schema: { $ref: '#/components/schemas/ProviderSuccessResponse' } } } },
          '400': { description: 'Validation error or wrong provider type', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Provider not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/providers/onboarding/documents': {
      post: {
        tags: ['Provider Onboarding'],
        summary: 'Submit documents',
        description: 'Step 3: Upload documents (multipart/form-data). Files are uploaded to S3; URLs are stored. Alternatively send JSON with pre-uploaded URLs. Optional text: medicalRegistrationNumber. File fields: medicalRegistrationCertificate, qualificationProof, governmentId, profilePicture, licenseCertificate, labEntrancePhoto, vehicleRegistrationPapers, driverLicense, hospitalLicense, hospitalLogo. Max 10 MB per file; types: JPEG, PNG, WebP, PDF.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/DocumentsRequest' },
              description: 'Optional: submit document URLs and metadata without file upload',
            },
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  medicalRegistrationNumber: { type: 'string' },
                  medicalRegistrationCertificate: { type: 'string', format: 'binary' },
                  qualificationProof: { type: 'string', format: 'binary' },
                  governmentId: { type: 'string', format: 'binary' },
                  profilePicture: { type: 'string', format: 'binary' },
                  licenseCertificate: { type: 'string', format: 'binary' },
                  labEntrancePhoto: { type: 'string', format: 'binary' },
                  vehicleRegistrationPapers: { type: 'string', format: 'binary' },
                  driverLicense: { type: 'string', format: 'binary' },
                  hospitalLicense: { type: 'string', format: 'binary' },
                  hospitalLogo: { type: 'string', format: 'binary' },
                },
              },
              description: 'Upload files; they are stored in S3 and URLs saved',
            },
          },
        },
        responses: {
          '200': { description: 'Documents saved', content: { 'application/json': { schema: { $ref: '#/components/schemas/ProviderSuccessResponse' } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Provider not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '503': { description: 'S3 not configured (when uploading files)', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/providers/onboarding/bank-details': {
      post: {
        tags: ['Provider Onboarding'],
        summary: 'Submit bank details',
        description:
          'Step 4: Bank account, IFSC, optional UPI; for Hospital/Institution optional GST number. On success, returns the same auth payload as login when onboarding is complete (`user` with `onboarding.tokenEligible`, `tokens` access+refresh), plus full `provider` profile — use to replace the onboarding JWT on the client. Optional body fields for session/device: `fcmToken`, `apnsToken`, `onesignalPlayerId`, `devicePlatform`, `timezone`, `deviceInfo`, `locationInfo` (same as `/auth/login`).',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/BankDetailsRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Bank details saved; full session issued',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ProviderBankStepCompleteResponse' } } },
          },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Provider not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/providers/me': {
      get: {
        tags: ['Provider Onboarding'],
        summary: 'Get current provider profile',
        description: 'Returns full provider profile including documents and bank details. Requires provider Bearer token.',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Provider profile',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    statusCode: { type: 'integer' },
                    responseCode: { type: 'string' },
                    message: { type: 'string' },
                    data: { $ref: '#/components/schemas/ProviderResponse' },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Provider not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/providers/hospitals': {
      get: {
        tags: ['Provider Onboarding'],
        summary: 'List hospitals',
        description: 'Returns list of hospitals for dropdown (e.g. when linking to Hospital/Institution).',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'List of hospitals', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessWithData' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/providers/specializations': {
      get: {
        tags: ['Provider Onboarding'],
        summary: 'List specializations',
        description: 'Returns list of doctor specializations for dropdown.',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'List of specializations', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessWithData' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/providers/lab-services': {
      get: {
        tags: ['Provider Onboarding'],
        summary: 'List lab services',
        description: 'Returns list of lab services for dropdown.',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'List of lab services', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessWithData' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/providers/ambulance-types': {
      get: {
        tags: ['Provider Onboarding'],
        summary: 'List ambulance types',
        description: 'Returns list of ambulance types for dropdown.',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'List of ambulance types', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessWithData' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/providers/coverage-areas': {
      get: {
        tags: ['Provider Onboarding'],
        summary: 'List coverage areas',
        description:
          'Optional suggested labels for UI only; `POST .../ambulance-professional-details` and nurse professional details accept any non-empty strings in `coverageArea`.',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'List of coverage areas', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessWithData' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/providers/nurse-services': {
      get: {
        tags: ['Provider Onboarding'],
        summary: 'List nurse services',
        description:
          'Optional suggested nurse service labels for UI only; `POST .../nurse-professional-details` accepts any non-empty strings in `services` and `coverageArea`.',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'List of nurse services', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessWithData' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/providers/hospital-departments': {
      get: {
        tags: ['Provider Onboarding'],
        summary: 'List hospital departments',
        description: 'Returns list of hospital departments for dropdown.',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'List of hospital departments', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessWithData' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'For most APIs: access JWT (typ=access) with `sid`. For `/providers/onboarding/*` before step 4: use **onboardingToken** from register/login (typ=onboarding).',
      },
    },
    schemas: {
      OnboardingState: {
        type: 'object',
        description: 'Client stepper / gating (currentStep 0–4; tokenEligible at 4)',
        properties: {
          currentStep: { type: 'integer', minimum: 0, maximum: 4 },
          totalSteps: { type: 'integer', example: 4 },
          isPhoneVerified: { type: 'boolean' },
          isProfileCompleted: { type: 'boolean' },
          isStepperCompleted: { type: 'boolean', description: 'Provider bank/stepper submitted' },
          tokenEligible: { type: 'boolean' },
          nextAction: {
            type: 'string',
            enum: [
              'VERIFY_PHONE',
              'COMPLETE_PROFILE',
              'COMPLETE_PROVIDER_STEPPER',
              'VERIFY_PHONE_TO_FINISH',
              'NONE',
            ],
          },
        },
      },
      UserResponse: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'User ID' },
          email: { type: 'string', nullable: true },
          mobileNumber: { type: 'string' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          role: { type: 'string', enum: ['user', 'provider', 'admin'] },
          onboarding: { $ref: '#/components/schemas/OnboardingState' },
        },
      },
      Tokens: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
          expiresIn: { type: 'string', example: '1h' },
          refreshExpiresAt: { type: 'string', format: 'date-time' },
          sessionId: { type: 'string', format: 'uuid', description: 'Same as access JWT claim sid' },
        },
      },
      AuthSuccessResponse: {
        type: 'object',
        properties: {
          statusCode: { type: 'integer' },
          responseCode: { type: 'string' },
          message: { type: 'string' },
          data: {
            type: 'object',
            properties: {
              user: { $ref: '#/components/schemas/UserResponse' },
              tokens: { $ref: '#/components/schemas/Tokens', description: 'Omitted until tokenEligible' },
              onboardingToken: {
                type: 'string',
                description:
                  'Provider only, before step 4: Bearer for `/providers/onboarding/*` (JWT typ=onboarding). Not a refresh session.',
              },
              onboardingTokenExpiresIn: { type: 'string', example: '7d' },
            },
          },
        },
      },
      RateLimitErrorResponse: {
        type: 'object',
        properties: {
          statusCode: { type: 'integer', example: 429 },
          responseCode: { type: 'string', example: 'RATE_LIMITED' },
          message: { type: 'string', example: 'OTP_SEND_RATE_LIMITED' },
          data: { type: 'object', nullable: true },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: { retryAfterSeconds: { type: 'integer' } },
            },
          },
        },
      },
      SuccessWithData: {
        type: 'object',
        properties: {
          statusCode: { type: 'integer' },
          responseCode: { type: 'string' },
          message: { type: 'string' },
          data: { type: 'object' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          statusCode: { type: 'integer', example: 400 },
          responseCode: { type: 'string', example: 'BAD_REQUEST_ERROR' },
          message: { type: 'string' },
          data: { type: 'object', nullable: true },
          errors: { type: 'array', items: {}, description: 'Validation errors' },
        },
      },

      // Provider onboarding
      ProviderResponse: {
        type: 'object',
        description: 'Full provider profile (personal info, professional profiles, documents, bank details)',
        properties: {
          personalInfo: { type: 'object' },
          professionalProfiles: { type: 'array', items: {} },
          documents: { type: 'object' },
          bankDetails: { type: 'object', nullable: true },
          onboardingStep: { type: 'string' },
          verificationStatus: { type: 'string' },
        },
      },
      ProviderSuccessResponse: {
        type: 'object',
        properties: {
          statusCode: { type: 'integer' },
          responseCode: { type: 'string' },
          message: { type: 'string' },
          data: { $ref: '#/components/schemas/ProviderResponse' },
        },
      },
      ProviderBankStepCompleteResponse: {
        type: 'object',
        properties: {
          statusCode: { type: 'integer' },
          responseCode: { type: 'string' },
          message: { type: 'string' },
          data: {
            type: 'object',
            required: ['user', 'tokens', 'provider'],
            properties: {
              user: { $ref: '#/components/schemas/UserResponse' },
              tokens: { $ref: '#/components/schemas/Tokens', description: 'Access + refresh session (same as login when token-eligible)' },
              provider: { $ref: '#/components/schemas/ProviderResponse' },
            },
          },
        },
      },
      PersonalInfoRequest: {
        type: 'object',
        required: ['fullName', 'countryCode', 'phoneNumber', 'providerType'],
        properties: {
          fullName: { type: 'string', example: 'John Doe' },
          firstName: { type: 'string', deprecated: true, description: 'Deprecated: use fullName' },
          lastName: { type: 'string', deprecated: true, description: 'Deprecated: ignored for provider flow' },
          countryCode: {
            type: 'string',
            example: '+91',
            description: 'Calling prefix only (1–4 digits, optional + in input; stored normalized with +). Do not include the subscriber number.',
          },
          phoneNumber: {
            type: 'string',
            example: '8160495306',
            description: 'National mobile number, digits only (5–15). Must not include country code.',
          },
          alternateCountryCode: {
            type: 'string',
            example: '+91',
            description:
              'Optional. Alternate line country prefix only (key differs from `countryCode`). Required if `alternateMobileNumber` is sent.',
          },
          alternateMobileNumber: {
            type: 'string',
            example: '9876543210',
            description:
              'Optional. Alternate national number, digits only. Required if `alternateCountryCode` is sent.',
          },
          email: { type: 'string', format: 'email' },
          providerType: { type: 'string', enum: ['Doctor', 'Nurse', 'Ambulance', 'Labs', 'Hospital/Institution'] },
          gender: { type: 'string', enum: ['Male', 'Female', 'Other'] },
        },
      },
      AvailabilitySlot: {
        type: 'object',
        required: ['dayOfWeek', 'startTime', 'endTime'],
        properties: {
          dayOfWeek: { type: 'string', enum: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] },
          startTime: { type: 'string', example: '09:00' },
          endTime: { type: 'string', example: '17:00' },
        },
      },
      ProfessionalProfileRequest: {
        type: 'object',
        required: ['workLocationType', 'specialization'],
        description:
          'Doctor-only payload. Hospital / Institution requires hospitalInstitutionName(or id), specialization, and teamCode. Independent Practice requires qualification, experienceYears, workMode, onlineConsultationModes, address, specialization, and availability.',
        properties: {
          workLocationType: { type: 'string', enum: ['Hospital / Institution', 'Independent Practice'] },
          hospitalInstitutionId: { type: 'string' },
          hospitalInstitutionName: { type: 'string' },
          teamCode: { type: 'string' },
          qualification: { type: 'string' },
          experienceYears: { type: 'integer', minimum: 0 },
          workMode: { type: 'string', enum: ['Clinic Visit', 'Home Visit', 'Both'] },
          onlineConsultationModes: { type: 'array', items: { type: 'string', enum: ['Video Call', 'Audio Call', 'Chat'] }, minItems: 1 },
          address: { type: 'string' },
          specialization: { type: 'string' },
          availability: { type: 'array', items: { $ref: '#/components/schemas/AvailabilitySlot' }, minItems: 1 },
        },
      },
      LabProfessionalDetailsRequest: {
        type: 'object',
        required: ['workLocationType', 'services', 'operatingHours'],
        properties: {
          workLocationType: { type: 'string', enum: ['Hospital / Institution', 'Independent Practice'] },
          labName: { type: 'string' },
          registrationCertificationNumber: { type: 'string' },
          address: { type: 'string' },
          hospitalInstitutionId: { type: 'string' },
          hospitalInstitutionName: { type: 'string' },
          teamCode: { type: 'string' },
          services: { type: 'array', items: { type: 'string' }, minItems: 1 },
          operatingHours: { type: 'array', items: { $ref: '#/components/schemas/AvailabilitySlot' }, minItems: 1 },
        },
      },
      AmbulanceProfessionalDetailsRequest: {
        type: 'object',
        required: ['workLocationType', 'ambulanceType', 'coverageArea'],
        properties: {
          workLocationType: { type: 'string', enum: ['Hospital / Institution', 'Independent Practice'] },
          driverName: { type: 'string' },
          vehicleRegistrationNumber: { type: 'string' },
          driverLicenseNumber: { type: 'string' },
          ambulanceType: { type: 'string' },
          coverageArea: {
            type: 'array',
            items: { type: 'string', minLength: 1 },
            minItems: 1,
            description: 'Free-text coverage areas from the client (not restricted to a fixed enum).',
          },
          availabilityHours: { type: 'string' },
          hospitalInstitutionId: { type: 'string' },
          hospitalInstitutionName: { type: 'string' },
          teamCode: { type: 'string' },
        },
      },
      NurseProfessionalDetailsRequest: {
        type: 'object',
        required: ['workLocationType', 'services', 'coverageArea', 'availability'],
        properties: {
          workLocationType: { type: 'string', enum: ['Hospital / Institution', 'Independent Practice'] },
          certificationLicenseNumber: { type: 'string' },
          services: {
            type: 'array',
            items: { type: 'string', minLength: 1 },
            minItems: 1,
            description: 'Free-text services / specialisations from the client (not restricted to a fixed enum).',
          },
          coverageArea: {
            type: 'array',
            items: { type: 'string', minLength: 1 },
            minItems: 1,
            description: 'Free-text coverage areas from the client (not restricted to a fixed enum).',
          },
          availability: { type: 'array', items: { $ref: '#/components/schemas/AvailabilitySlot' }, minItems: 1 },
          hospitalInstitutionId: { type: 'string' },
          hospitalInstitutionName: { type: 'string' },
          teamCode: { type: 'string' },
        },
      },
      HospitalProfessionalDetailsRequest: {
        type: 'object',
        required: ['hospitalInstituteName', 'registrationLicenseNumber', 'departmentsAvailable', 'operatingHours'],
        properties: {
          hospitalInstituteName: { type: 'string' },
          registrationLicenseNumber: { type: 'string' },
          departmentsAvailable: {
            type: 'array',
            items: { type: 'string', enum: ['Emergency', 'General Medicine', 'General Surgery', 'Cardiology', 'Radiology / Imaging', 'ICU', 'Pathology / Lab Medicine'] },
            minItems: 1,
          },
          operatingHours: { type: 'array', items: { $ref: '#/components/schemas/AvailabilitySlot' }, minItems: 1 },
        },
      },
      DocumentsRequest: {
        type: 'object',
        description: 'Optional document URLs and metadata (when not using file upload). For file upload use multipart/form-data.',
        properties: {
          medicalRegistrationNumber: { type: 'string' },
          medicalRegistrationCertificateUrl: { type: 'string', format: 'uri' },
          medicalRegistrationCertificateFileName: { type: 'string' },
          medicalRegistrationCertificateFileSize: { type: 'integer' },
          qualificationProofUrl: { type: 'string', format: 'uri' },
          qualificationProofFileName: { type: 'string' },
          qualificationProofFileSize: { type: 'integer' },
          governmentIdUrl: { type: 'string', format: 'uri' },
          governmentIdFileName: { type: 'string' },
          governmentIdFileSize: { type: 'integer' },
          profilePictureUrl: { type: 'string', format: 'uri' },
          profilePictureFileName: { type: 'string' },
          profilePictureFileSize: { type: 'integer' },
          licenseCertificateUrl: { type: 'string', format: 'uri' },
          licenseCertificateFileName: { type: 'string' },
          licenseCertificateFileSize: { type: 'integer' },
          labEntrancePhotoUrl: { type: 'string', format: 'uri' },
          labEntrancePhotoFileName: { type: 'string' },
          labEntrancePhotoFileSize: { type: 'integer' },
          vehicleRegistrationPapersUrl: { type: 'string', format: 'uri' },
          vehicleRegistrationPapersFileName: { type: 'string' },
          vehicleRegistrationPapersFileSize: { type: 'integer' },
          driverLicenseUrl: { type: 'string', format: 'uri' },
          driverLicenseFileName: { type: 'string' },
          driverLicenseFileSize: { type: 'integer' },
          hospitalLicenseUrl: { type: 'string', format: 'uri' },
          hospitalLicenseFileName: { type: 'string' },
          hospitalLicenseFileSize: { type: 'integer' },
          hospitalLogoUrl: { type: 'string', format: 'uri' },
          hospitalLogoFileName: { type: 'string' },
          hospitalLogoFileSize: { type: 'integer' },
        },
      },
      BankDetailsRequest: {
        type: 'object',
        required: ['accountHolderName', 'bankAccountNumber', 'ifsc'],
        properties: {
          accountHolderName: { type: 'string' },
          bankAccountNumber: { type: 'string' },
          ifsc: { type: 'string' },
          upiId: { type: 'string' },
          gstNumber: { type: 'string', description: 'Optional for Hospital/Institution' },
        },
      },
    },
  },
};
