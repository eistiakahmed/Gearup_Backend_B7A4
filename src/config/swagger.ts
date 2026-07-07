import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'GearUp API',
      version: '1.0.0',
      description: `
        GearUp is a sports equipment rental platform API that allows users to browse, rent, and review sports gear.

        ## Authentication
        Most endpoints require authentication using a JWT token stored in an HTTP-only cookie. The token is automatically sent with requests when you're logged in.

        ## Roles
        - **User**: Can browse gear, create rentals, and leave reviews
        **Provider**: Can manage their own gear listings and rental requests
        **Admin**: Full access to all resources including user management

        ## Rate Limiting
        Authentication endpoints have rate limiting to prevent abuse.
      `,
      contact: {
        name: 'GearUp API Support',
        email: 'support@gearup.com',
      },
      license: {
        name: 'ISC',
        url: 'https://opensource.org/licenses/ISC',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://api.gearup.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'accessToken',
          description: 'JWT token stored in HTTP-only cookie for authentication',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              description: 'Error message describing what went wrong',
            },
            error: {
              type: 'string',
              description: 'Detailed error information (only in development mode)',
            },
          },
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              description: 'Success message describing the result',
            },
            data: {
              type: 'object',
              description: 'Response data (if applicable)',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique user identifier',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
            },
            name: {
              type: 'string',
              description: 'User full name',
            },
            role: {
              type: 'string',
              enum: ['USER', 'PROVIDER', 'ADMIN'],
              description: 'User role in the system',
            },
            phoneNumber: {
              type: 'string',
              description: 'User phone number (optional)',
              nullable: true,
            },
            address: {
              type: 'string',
              description: 'User address (optional)',
              nullable: true,
            },
            isActive: {
              type: 'boolean',
              description: 'Whether the user account is active',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        Gear: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique gear identifier',
            },
            title: {
              type: 'string',
              description: 'Gear item title',
            },
            description: {
              type: 'string',
              description: 'Detailed description of the gear',
            },
            categoryId: {
              type: 'string',
              format: 'uuid',
              description: 'Category identifier',
            },
            providerId: {
              type: 'string',
              format: 'uuid',
              description: 'Provider user identifier',
            },
            pricePerDay: {
              type: 'number',
              format: 'float',
              description: 'Daily rental price',
            },
            condition: {
              type: 'string',
              enum: ['NEW', 'GOOD', 'FAIR', 'POOR'],
              description: 'Condition of the gear',
            },
            location: {
              type: 'string',
              description: 'Gear location/availability',
            },
            isAvailable: {
              type: 'boolean',
              description: 'Whether the gear is currently available',
            },
            images: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'List of image URLs',
            },
            specs: {
              type: 'object',
              description: 'Gear specifications (varies by category)',
            },
            averageRating: {
              type: 'number',
              format: 'float',
              description: 'Average rating from reviews',
              nullable: true,
            },
            reviewCount: {
              type: 'integer',
              description: 'Number of reviews',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        Category: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique category identifier',
            },
            name: {
              type: 'string',
              description: 'Category name',
            },
            description: {
              type: 'string',
              description: 'Category description',
            },
            icon: {
              type: 'string',
              description: 'Category icon URL',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        Rental: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique rental identifier',
            },
            gearId: {
              type: 'string',
              format: 'uuid',
              description: 'Rented gear identifier',
            },
            renterId: {
              type: 'string',
              format: 'uuid',
              description: 'User renting the gear',
            },
            providerId: {
              type: 'string',
              format: 'uuid',
              description: 'Provider owning the gear',
            },
            startDate: {
              type: 'string',
              format: 'date-time',
              description: 'Rental start date and time',
            },
            endDate: {
              type: 'string',
              format: 'date-time',
              description: 'Rental end date and time',
            },
            totalCost: {
              type: 'number',
              format: 'float',
              description: 'Total rental cost',
            },
            status: {
              type: 'string',
              enum: ['PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED'],
              description: 'Rental status',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        Review: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique review identifier',
            },
            gearId: {
              type: 'string',
              format: 'uuid',
              description: 'Reviewed gear identifier',
            },
            userId: {
              type: 'string',
              format: 'uuid',
              description: 'User who wrote the review',
            },
            rating: {
              type: 'integer',
              minimum: 1,
              maximum: 5,
              description: 'Rating from 1 to 5',
            },
            comment: {
              type: 'string',
              description: 'Review comment',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
      },
    },
    security: [
      {
        cookieAuth: [],
      },
    ],
  },
  apis: ['./src/modules/**/*.routes.ts', './src/modules/**/*.controller.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
