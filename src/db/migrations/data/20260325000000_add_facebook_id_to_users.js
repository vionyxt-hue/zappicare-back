exports.up = async function up(knex) {
  const schema = process.env.DB_DATA_SCHEMA || 'data';
  await knex.schema.withSchema(schema).alterTable('users', (t) => {
    t.string('facebook_id').nullable();
  });
};

exports.down = async function down(knex) {
  const schema = process.env.DB_DATA_SCHEMA || 'data';
  await knex.schema.withSchema(schema).alterTable('users', (t) => {
    t.dropColumn('facebook_id');
  });
};

