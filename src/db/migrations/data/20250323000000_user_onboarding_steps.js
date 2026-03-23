/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  await knex.schema.withSchema('data').alterTable('users', (t) => {
    t.boolean('is_phone_verified').notNullable().defaultTo(false);
    t.boolean('is_profile_completed').notNullable().defaultTo(false);
    t.smallint('current_step').notNullable().defaultTo(0);
  });

  await knex.raw(`
    UPDATE data.users SET
      is_phone_verified = is_mobile_verified,
      is_profile_completed = COALESCE(terms_and_conditions_accepted, false),
      current_step = CASE
        WHEN is_mobile_verified AND COALESCE(terms_and_conditions_accepted, false) THEN 3
        WHEN is_mobile_verified THEN 1
        WHEN COALESCE(terms_and_conditions_accepted, false) THEN 2
        ELSE 0
      END
  `);
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  await knex.schema.withSchema('data').alterTable('users', (t) => {
    t.dropColumn('is_phone_verified');
    t.dropColumn('is_profile_completed');
    t.dropColumn('current_step');
  });
};
