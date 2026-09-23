import pg from 'pg';
import { config } from '../config/index.js';

const { Pool } = pg;

function getSslConfig() {
  const url = config.DATABASE_URL.toLowerCase();
  // Railway internal private network (.railway.internal) and local docker/localhost do NOT use SSL
  if (
    url.includes('.railway.internal') ||
    url.includes('@postgres:') ||
    url.includes('@postgres') ||
    url.includes('localhost') ||
    url.includes('127.0.0.1') ||
    url.includes('sslmode=disable')
  ) {
    return undefined;
  }
  // Remote / Public cloud databases (e.g. rlwy.net public proxy, Supabase, Neon, AWS)
  if (
    url.includes('sslmode=require') ||
    url.includes('rlwy.net') ||
    url.includes('supabase') ||
    url.includes('neon.tech') ||
    url.includes('render.com')
  ) {
    return { rejectUnauthorized: false };
  }
  return undefined;
}

export const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: getSslConfig(),
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  const res = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  if (config.NODE_ENV === 'development') {
    console.log('Executed query', { text, duration, rows: res.rowCount });
  }
  return res;
}

export async function withTransaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('Error executing ROLLBACK on client:', rollbackErr);
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function checkDbHealth(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (err) {
    console.error('Database healthcheck failed:', err);
    return false;
  }
}
