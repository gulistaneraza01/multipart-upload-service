import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.1.0',
    info: {
      title: 'JS Boilerplate API',
      version: '1.0.0',
    },
    servers: [
      {
        url: process.env.API_BASE_URL ?? '/api/v1',
        description: 'Current environment',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.routes.js'],
};

export const swaggerSpec = swaggerJsdoc(options);
