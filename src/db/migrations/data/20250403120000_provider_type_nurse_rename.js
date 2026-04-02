/**
 * Rename provider type value Nurse/Caretaker -> Nurse (personal_info JSON).
 *
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  await knex.raw(`
    UPDATE data.providers
    SET personal_info = jsonb_set(
      personal_info,
      '{providerType}',
      '"Nurse"'::jsonb,
      true
    )
    WHERE personal_info->>'providerType' = 'Nurse/Caretaker'
  `);
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  await knex.raw(`
    UPDATE data.providers
    SET personal_info = jsonb_set(
      personal_info,
      '{providerType}',
      '"Nurse/Caretaker"'::jsonb,
      true
    )
    WHERE personal_info->>'providerType' = 'Nurse'
  `);
};
