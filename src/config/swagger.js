const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'FiTribe API Documentation',
      version: '1.0.0',
      description: 'AI-powered fitness trainer and community platform API',
      contact: {
        name: 'FiTribe Team',
        email: 'support@fitribe.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://api.fitribe.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Firebase ID token'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              example: 'Error message'
            },
            code: {
              type: 'string',
              example: 'ERROR_CODE'
            }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              example: 1
            },
            limit: {
              type: 'integer',
              example: 20
            },
            totalCount: {
              type: 'integer',
              example: 100
            },
            totalPages: {
              type: 'integer',
              example: 5
            },
            hasNextPage: {
              type: 'boolean',
              example: true
            },
            hasPrevPage: {
              type: 'boolean',
              example: false
            }
          }
        },
        WorkoutSession: {
          type: 'object',
          required: ['userId', 'exercises', 'durationMinutes'],
          properties: {
            userId: {
              type: 'string',
              description: 'User ID',
              example: 'user_123'
            },
            workoutPlanId: {
              type: 'string',
              description: 'Optional workout plan ID',
              example: 'plan_456'
            },
            exercises: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  exerciseName: {
                    type: 'string',
                    example: 'Push-ups'
                  },
                  totalReps: {
                    type: 'integer',
                    example: 30
                  },
                  caloriesBurned: {
                    type: 'number',
                    example: 50
                  },
                  averageFormScore: {
                    type: 'number',
                    example: 85.5
                  }
                }
              }
            },
            durationMinutes: {
              type: 'integer',
              example: 45,
              minimum: 1,
              maximum: 600
            }
          }
        },
        Challenge: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'challenge_123'
            },
            name: {
              type: 'string',
              example: '30-Day Push-up Challenge'
            },
            description: {
              type: 'string',
              example: 'Complete 1000 push-ups in 30 days'
            },
            type: {
              type: 'string',
              enum: ['exercise_count', 'calories', 'duration', 'workout_count'],
              example: 'exercise_count'
            },
            goal: {
              type: 'object',
              properties: {
                targetValue: {
                  type: 'number',
                  example: 1000
                },
                exerciseName: {
                  type: 'string',
                  example: 'Push-ups'
                }
              }
            },
            status: {
              type: 'string',
              enum: ['active', 'completed', 'cancelled'],
              example: 'active'
            },
            startDate: {
              type: 'string',
              format: 'date-time',
              example: '2024-02-01T00:00:00Z'
            },
            endDate: {
              type: 'string',
              format: 'date-time',
              example: '2024-03-01T23:59:59Z'
            },
            participantCount: {
              type: 'integer',
              example: 150
            }
          }
        },
        Badge: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'badge_123'
            },
            name: {
              type: 'string',
              example: 'First Workout'
            },
            description: {
              type: 'string',
              example: 'Complete your first workout'
            },
            iconUrl: {
              type: 'string',
              example: 'https://cdn.fitribe.com/badges/first-workout.png'
            },
            tier: {
              type: 'string',
              enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
              example: 'common'
            },
            category: {
              type: 'string',
              enum: ['milestone', 'streak', 'social', 'challenge', 'performance'],
              example: 'milestone'
            },
            points: {
              type: 'integer',
              example: 50
            },
            condition: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  example: 'workout_count'
                },
                value: {
                  type: 'number',
                  example: 1
                }
              }
            }
          }
        }
      }
    },
    security: [
      {
        BearerAuth: []
      }
    ]
  },
  apis: ['./routes/*.js', './controllers/*.js']
};

const specs = swaggerJsdoc(options);

module.exports = specs;