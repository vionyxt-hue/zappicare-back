/**
 * Seed reference lists for provider onboarding (hospitals, specializations).
 * Runs against schema `data`.
 * @param {import('knex').Knex} knex
 */
exports.seed = async function seed(knex) {
  const d = (table) => knex.withSchema('data').table(table);

  await d('hospitals').del();
  await d('specializations').del();

  await d('hospitals').insert([
    { name: 'General Hospital', is_active: true },
    { name: 'City Medical Center', is_active: true },
  ]);

  await d('specializations').insert([
    { name: 'General Medicine', is_active: true },
    { name: 'Cardiology', is_active: true },
    { name: 'Pediatrics', is_active: true },
  ]);
};
