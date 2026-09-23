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
  // Create enum types
  pgm.createType('lead_status', ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST']);
  pgm.createType('activity_type', ['LEAD_CREATED', 'LEAD_UPDATED', 'STATUS_CHANGED', 'DUPLICATE_IGNORED']);

  // Create leads table
  pgm.createTable('leads', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    external_lead_id: {
      type: 'text',
      unique: true,
    },
    full_name: {
      type: 'text',
      notNull: true,
    },
    email: {
      type: 'text',
    },
    phone: {
      type: 'text',
    },
    source: {
      type: 'text',
      notNull: true,
      default: 'meta_ads',
    },
    page_id: {
      type: 'text',
    },
    form_id: {
      type: 'text',
    },
    ad_id: {
      type: 'text',
    },
    status: {
      type: 'lead_status',
      notNull: true,
      default: 'NEW',
    },
    raw_payload: {
      type: 'jsonb',
      notNull: true,
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });

  // Create activities table
  pgm.createTable('activities', {
    id: {
      type: 'bigserial',
      primaryKey: true,
    },
    lead_id: {
      type: 'uuid',
      notNull: true,
      references: 'leads(id)',
      onDelete: 'CASCADE',
    },
    type: {
      type: 'activity_type',
      notNull: true,
    },
    description: {
      type: 'text',
      notNull: true,
    },
    metadata: {
      type: 'jsonb',
    },
    actor: {
      type: 'text',
      notNull: true,
      default: 'system:webhook',
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });

  // Create indexes
  pgm.createIndex('leads', 'external_lead_id', {
    name: 'idx_leads_external_lead_id',
  });

  pgm.createIndex('activities', ['lead_id', { name: 'created_at', sort: 'DESC' }, { name: 'id', sort: 'DESC' }], {
    name: 'idx_activities_lead_created',
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropIndex('activities', ['lead_id', 'created_at', 'id'], { name: 'idx_activities_lead_created' });
  pgm.dropIndex('leads', 'external_lead_id', { name: 'idx_leads_external_lead_id' });
  pgm.dropTable('activities');
  pgm.dropTable('leads');
  pgm.dropType('activity_type');
  pgm.dropType('lead_status');
};
