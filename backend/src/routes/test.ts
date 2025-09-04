import { Router } from 'express';
import { validate, validationSchemas, authRateLimit } from '../middleware';

const router = Router();

// Test route for validation middleware
router.post('/validate-user', 
  validate(validationSchemas.auth.register),
  (req, res) => {
    res.json({
      success: true,
      message: 'Validation passed successfully',
      data: {
        email: req.body.email,
        name: req.body.name,
        phone: req.body.phone,
      },
      timestamp: new Date().toISOString(),
    });
  }
);

// Test route for rate limiting
router.post('/test-rate-limit',
  authRateLimit,
  (req, res) => {
    res.json({
      success: true,
      message: 'Rate limit test passed',
      timestamp: new Date().toISOString(),
    });
  }
);

// Test route for query parameter validation
router.get('/validate-query',
  validate({
    query: validationSchemas.content.list.query,
  }),
  (req, res) => {
    res.json({
      success: true,
      message: 'Query validation passed',
      data: {
        page: req.query.page,
        limit: req.query.limit,
        type: req.query.type,
        isPublished: req.query.isPublished,
        search: req.query.search,
      },
      timestamp: new Date().toISOString(),
    });
  }
);

// Test route for parameter validation
router.get('/validate-params/:id',
  validate({
    params: validationSchemas.content.getById.params,
  }),
  (req, res) => {
    res.json({
      success: true,
      message: 'Parameter validation passed',
      data: {
        id: req.params.id,
      },
      timestamp: new Date().toISOString(),
    });
  }
);

export default router;