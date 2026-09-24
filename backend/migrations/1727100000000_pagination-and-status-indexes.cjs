/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  // Composite index for fast deterministic pagination (ORDER BY created_at DESC, id DESC)
  pgm.createIndex('leads', [{ name: 'created_at', sort: 'DESC' }, { name: 'id', sort: 'DESC' }], {
    name: 'idx_leads_created_at_id',
    ifNotExists: true,
  });

  // Composite index for status-filtered pagination (WHERE status = ... ORDER BY created_at DESC)
  pgm.createIndex('leads', ['status', { name: 'created_at', sort: 'DESC' }], {
    name: 'idx_leads_status_created_at',
    ifNotExists: true,
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropIndex('leads', ['status', { name: 'created_at', sort: 'DESC' }], {
    name: 'idx_leads_status_created_at',
    ifExists: true,
  });
  pgm.dropIndex('leads', [{ name: 'created_at', sort: 'DESC' }, { name: 'id', sort: 'DESC' }], {
    name: 'idx_leads_created_at_id',
    ifExists: true,
  });
};

