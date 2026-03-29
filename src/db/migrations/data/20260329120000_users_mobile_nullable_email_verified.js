/**
 * OAuth users may have no phone; provider onboarding can rely on verified email.
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  const schema = process.env.DB_DATA_SCHEMA || 'data';
  await knex.schema.withSchema(schema).alterTable('users', (t) => {
    t.boolean('is_email_verified').notNullable().defaultTo(false);
  });
  await knex.raw(`ALTER TABLE "${schema}".users ALTER COLUMN mobile_number DROP NOT NULL`);
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  const schema = process.env.DB_DATA_SCHEMA || 'data';
  await knex.raw(
    `UPDATE "${schema}".users SET mobile_number = md5(id::text) WHERE mobile_number IS NULL`
  );
  await knex.raw(`ALTER TABLE "${schema}".users ALTER COLUMN mobile_number SET NOT NULL`);
  await knex.schema.withSchema(schema).alterTable('users', (t) => {
    t.dropColumn('is_email_verified');
  });
};
