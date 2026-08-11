/* eslint-disable @typescript-eslint/no-explicit-any, no-console */
import express from 'express';
import request from 'supertest';
import Joi from 'joi';
import { requestContext } from '../../../src/middleware/requestContext';
import { tenantResolver } from '../../../src/middleware/tenantResolver';
import { validate } from '../../../src/middleware/validate';
import { errorHandler } from '../../../src/middleware/errorHandler';
import { getPaginationOptions, getPaginationMetadata } from '../../../src/utils/pagination';
import { getSortOrder } from '../../../src/utils/sorting';
import { buildFilters } from '../../../src/utils/filtering';
import { withTransaction } from '../../../src/utils/transactions';
import { ValidationError, NotFoundError } from '../../../src/shared/errors/AppError';
import { sequelize, connectDatabase, disconnectDatabase } from '../../../src/config/database';
import { env } from '../../../src/config/env';
import { resetDatabase } from '../../../src/database/helpers/reset';
import { execSync } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

describe('Shared Utilities & Infrastructure Middleware', () => {
  let app: express.Express;

  beforeAll(async () => {
    expect(env.NODE_ENV).toBe('test');
    expect(env.TEST_DB_NAME).toContain('test');

    // Programmatically reset the test database for a clean slate
    await resetDatabase();

    // Programmatically execute migrations and seeders
    execSync('npm run db:test:migrate', { stdio: 'ignore' });
    execSync('npm run db:test:seed', { stdio: 'ignore' });

    await connectDatabase();
  }, 30000);

  afterAll(async () => {
    await disconnectDatabase();
  });

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(requestContext);
  });

  // 1. Request Context Test
  it('should initialize request context properly', async () => {
    app.get('/test-context', (req, res) => {
      expect(req.context).toBeDefined();
      expect(req.context.requestId).toBeDefined();
      expect(req.context.ipAddress).toBeDefined();
      expect(req.context.userAgent).toBeDefined();
      expect(req.context.requestStartTime).toBeDefined();
      res.sendStatus(200);
    });

    const response = await request(app).get('/test-context');
    expect(response.status).toBe(200);
    expect(response.headers['x-request-id']).toBeDefined();
  });

  // 2. Tenant Resolver Test
  it('should resolve tenant via custom header', async () => {
    // Create a mock tenant first
    const uuid = uuidv4();
    const slug = `t-${uuidv4().substring(0, 8)}`;
    await sequelize.query(
      `INSERT INTO tenants (uuid, name, slug, status, created_at, updated_at) 
       VALUES (:uuid, 'Resolver Tenant', :slug, 'active', NOW(), NOW())`,
      { replacements: { uuid, slug } }
    );

    app.get('/test-tenant', tenantResolver, (req, res) => {
      expect(req.context.tenantId).toBeDefined();
      expect(req.context.tenantUuid).toBe(uuid);
      res.sendStatus(200);
    });

    app.use(errorHandler);

    const response = await request(app).get('/test-tenant').set('X-Tenant-UUID', uuid);

    expect(response.status).toBe(200);

    // Clean up
    await sequelize.query('DELETE FROM tenants WHERE uuid = :uuid', { replacements: { uuid } });
  });

  it('should throw TenantNotFoundError if tenant cannot be resolved', async () => {
    app.get('/test-tenant-fail', tenantResolver, (_req, res) => {
      res.sendStatus(200);
    });
    app.use(errorHandler);

    const response = await request(app)
      .get('/test-tenant-fail')
      .set('X-Tenant-UUID', 'non-existent-uuid');

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('TENANT_NOT_FOUND');
  });

  // 3. Joi Validation Middleware Test
  it('should validate body and query parameters correctly', async () => {
    const schemas = {
      body: Joi.object({
        email: Joi.string().email().required(),
        age: Joi.number().min(18).required(),
      }),
      query: Joi.object({
        search: Joi.string().optional(),
      }),
    };

    app.post('/test-val', validate(schemas), (_req, res) => {
      res.sendStatus(200);
    });
    app.use(errorHandler);

    // Should succeed
    let response = await request(app)
      .post('/test-val?search=test')
      .send({ email: 'valid@example.com', age: 20 });
    expect(response.status).toBe(200);

    // Should fail validation
    response = await request(app).post('/test-val').send({ email: 'invalid-email', age: 10 });
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_ERROR');
    expect(response.body.errors.length).toBe(2);
  });

  // 4. Centralized Response & Error mapping Tests
  it('should map errors and return standardized JSON payload', async () => {
    app.get('/test-err', (_req, _res, next) => {
      next(new NotFoundError('Custom not found message'));
    });
    app.use(errorHandler);

    const response = await request(app).get('/test-err');
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe('NOT_FOUND');
    expect(response.body.message).toBe('Custom not found message');
    expect(response.body.requestId).toBeDefined();
    expect(response.body.timestamp).toBeDefined();
  });

  // 5. Pagination Utility Test
  it('should correctly parse pagination parameters', () => {
    const query = { page: '2', limit: '10' };
    const options = getPaginationOptions(query);
    expect(options.page).toBe(2);
    expect(options.limit).toBe(10);
    expect(options.offset).toBe(10);

    const metadata = getPaginationMetadata(2, 10, 25);
    expect(metadata.totalPages).toBe(3);
    expect(metadata.total).toBe(25);
  });

  // 6. Sorting Utility Test
  it('should validate and sanitize sort order', () => {
    const query = { sort: 'name', direction: 'asc' };
    const order = getSortOrder(query, ['name', 'created_at']);
    expect(order.column).toBe('name');
    expect(order.direction).toBe('ASC');

    // Reject column not in whitelist
    expect(() => {
      getSortOrder({ sort: 'password' }, ['name', 'created_at']);
    }).toThrow(ValidationError);
  });

  // 7. Filtering Utility Test
  it('should build filter parameters correctly', () => {
    const query = { search: 'John', status: 'active' };
    const filters = buildFilters(query, ['name', 'email']);
    expect(filters.status).toBe('active');
    expect((filters as any)[Symbol.for('or')]).toBeDefined();
  });

  // 8. Transaction Helper Test
  it('should commit or rollback transactions automatically', async () => {
    // Test transaction commit
    const tVal = await withTransaction(async (t) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [res]: any = await sequelize.query('SELECT 1 + 1 AS sum', { transaction: t });
      return res[0].sum;
    });
    expect(tVal).toBe(2);

    // Test transaction rollback
    const uuid = uuidv4();
    const slug = `t-${uuidv4().substring(0, 8)}`;
    await expect(
      withTransaction(async (t) => {
        await sequelize.query(
          `INSERT INTO tenants (uuid, name, slug, status, created_at, updated_at) 
           VALUES (:uuid, 'Fail Tenant', :slug, 'active', NOW(), NOW())`,
          { replacements: { uuid, slug }, transaction: t }
        );
        throw new Error('Force rollback');
      })
    ).rejects.toThrow('Force rollback');

    // Verify record was rolled back
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [findRes]: any = await sequelize.query('SELECT * FROM tenants WHERE uuid = :uuid', {
      replacements: { uuid },
    });
    expect(findRes.length).toBe(0);
  });
});
