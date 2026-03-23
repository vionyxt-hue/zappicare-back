/**
 * Audit / compliance events in schema `audit` (immutable-style log).
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  await knex.raw('CREATE SCHEMA IF NOT EXISTS "audit"');

  await knex.schema.withSchema('audit').createTable('audit_events', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('action', 128).notNullable();
    t.string('entity_type', 128).notNullable();
    t.uuid('entity_id').nullable();
    t.uuid('actor_user_id').nullable();
    t.jsonb('payload').nullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
  await knex.raw(
    'CREATE INDEX audit_events_entity_idx ON audit.audit_events (entity_type, entity_id)'
  );
  await knex.raw('CREATE INDEX audit_events_created_at_idx ON audit.audit_events (created_at DESC)');
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  await knex.schema.withSchema('audit').dropTableIfExists('audit_events');
  await knex.raw('DROP SCHEMA IF EXISTS "audit" CASCADE');
};
