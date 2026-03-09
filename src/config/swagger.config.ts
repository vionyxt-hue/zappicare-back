/** OpenAPI 3.0 document for Swagger UI */
export const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'ZappieCare API',
    description: 'ZappieCare Backend API – Auth (manual, Google, Apple), user registration and login.',
    version: '1.0.0',
  },
  servers: [
    { url: 'http://localhost:3000', description: 'Development' },
  ],
  tags: [
    { name: 'Health', description: 'Health check' },
    { name: 'Auth', description: 'Authentication (OTP, email/password, Google, Apple)' },
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
        },
      },
    },
    '/auth/verify-otp': {
      post: {
        tags: ['Auth'],
        summary: 'Verify OTP',
        description: 'Verifies the OTP. Returns a short-lived verifiedToken to use in Register (x-verified-token header).',
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
                      properties: { verifiedToken: { type: 'string', description: 'Use in x-verified-token for Register' } },
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
        description: 'Creates a user after OTP verification. Send x-verified-token header with the token from verify-otp.',
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
                        tokens: { $ref: '#/components/schemas/Tokens' },
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
        description: 'Login with (1) mobileNumber + code (OTP), or (2) mobileNumber + password, or (3) email + password.',
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
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login success',
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
                        tokens: { $ref: '#/components/schemas/Tokens' },
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
    '/auth/google': {
      post: {
        tags: ['Auth'],
        summary: 'Login / sign up with Google',
        description: 'Authenticate with Google ID token. New users must send termsAndConditionsAccepted: true.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['idToken'],
                properties: {
                  idToken: { type: 'string', description: 'Google ID token from Google Sign-In SDK' },
                  role: { type: 'string', enum: ['user', 'provider'], default: 'user' },
                  termsAndConditionsAccepted: { type: 'boolean', enum: [true], description: 'Required for new sign-ups' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login success (existing user)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthSuccessResponse' } } },
          },
          '201': {
            description: 'User created (new sign-up)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthSuccessResponse' } } },
          },
          '400': { description: 'Invalid token or terms required', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/auth/apple': {
      post: {
        tags: ['Auth'],
        summary: 'Login / sign up with Apple',
        description: 'Authenticate with Apple identity token. New users must send termsAndConditionsAccepted: true.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['identityToken'],
                properties: {
                  identityToken: { type: 'string', description: 'Apple identity token from Sign in with Apple' },
                  role: { type: 'string', enum: ['user', 'provider'], default: 'user' },
                  termsAndConditionsAccepted: { type: 'boolean', enum: [true], description: 'Required for new sign-ups' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login success (existing user)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthSuccessResponse' } } },
          },
          '201': {
            description: 'User created (new sign-up)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthSuccessResponse' } } },
          },
          '400': { description: 'Invalid token or terms required', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout',
        description: 'Logout current session. Requires Bearer token.',
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
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Access token from login/register/google/apple',
      },
    },
    schemas: {
      UserResponse: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'User ID' },
          email: { type: 'string', nullable: true },
          mobileNumber: { type: 'string' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          role: { type: 'string', enum: ['user', 'provider'] },
        },
      },
      Tokens: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          expiresIn: { type: 'string', example: '24h' },
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
              tokens: { $ref: '#/components/schemas/Tokens' },
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
    },
  },
};
