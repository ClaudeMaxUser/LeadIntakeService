import { describe, it, expect, vi } from 'vitest';
import { z, ZodError } from 'zod';
import { errorHandler, AppError } from '../../src/middleware/errorHandler.js';

describe('Error Handler Middleware', () => {
  const createMockRes = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  };

  it('handles AppError with custom status and message', () => {
    const res = createMockRes();
    const appError = new AppError('Lead not found', 404, { leadId: '123' });

    errorHandler(appError, {} as any, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Lead not found',
      details: { leadId: '123' },
    });
  });

  it('handles ZodError with 400 and structured issue paths', () => {
    const res = createMockRes();
    const testSchema = z.object({ email: z.string().email() });
    const parseResult = testSchema.safeParse({ email: 'not-an-email' });

    expect(parseResult.success).toBe(false);
    if (!parseResult.success) {
      errorHandler(parseResult.error, {} as any, res, vi.fn());
    }

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Validation Error',
      issues: [{ path: 'email', message: 'Invalid email' }],
    });
  });

  it('handles SyntaxError with malformed JSON body', () => {
    const res = createMockRes();
    const syntaxErr: any = new SyntaxError('Unexpected token in JSON');
    syntaxErr.body = '{ bad json }';

    errorHandler(syntaxErr, {} as any, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Bad Request',
      message: 'Malformed JSON payload',
    });
  });

  it('handles payload too large (413)', () => {
    const res = createMockRes();
    const payloadErr = { type: 'entity.too.large', status: 413 };

    errorHandler(payloadErr, {} as any, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(413);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Payload Too Large',
      message: 'Request entity exceeds allowed size limit',
    });
  });

  it('handles generic unhandled error with 500 status', () => {
    const res = createMockRes();
    const genericErr = new Error('Database connection crashed');
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    errorHandler(genericErr, {} as any, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Internal Server Error',
      })
    );
    spy.mockRestore();
  });
});
