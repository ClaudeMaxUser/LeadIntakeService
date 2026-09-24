import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import runner from 'node-pg-migrate';
import { runMigrations } from '../../src/db/migrate.js';

vi.mock('node-pg-migrate', () => ({
  default: vi.fn(),
}));

describe('Database Migrations (Fail-Closed Lifecycle)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves successfully when runner succeeds', async () => {
    vi.mocked(runner).mockResolvedValueOnce([] as any);

    await expect(runMigrations()).resolves.toBeUndefined();
    expect(runner).toHaveBeenCalledTimes(1);
  });

  it('throws error and does not swallow migration failure', async () => {
    const migrationError = new Error('Connection refused to database');
    vi.mocked(runner).mockRejectedValueOnce(migrationError);

    await expect(runMigrations()).rejects.toThrow('Connection refused to database');
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('❌ Database migration failed: Connection refused to database')
    );
  });
});

