/**
 * Application tables in PostgreSQL schema `data`.
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  await knex.raw('CREATE SCHEMA IF NOT EXISTS "data"');

  await knex.schema.withSchema('data').createTable('users', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('mobile_number', 32).notNullable();
    t.string('country_code', 16);
    t.string('email', 255);
    t.string('password', 255);
    t.string('first_name', 255).notNullable();
    t.string('last_name', 255).notNullable();
    t.string('emergency_number', 32);
    t.string('gender', 32);
    t.string('refer_code', 64);
    t.boolean('terms_and_conditions_accepted').notNullable().defaultTo(false);
    t.boolean('is_mobile_verified').notNullable().defaultTo(false);
    t.string('role', 32).notNullable();
    t.string('google_id', 255);
    t.string('apple_id', 255);
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });
  await knex.raw(
    'CREATE UNIQUE INDEX users_mobile_number_unique ON data.users (mobile_number)'
  );
  await knex.raw(
    'CREATE UNIQUE INDEX users_email_lower_unique ON data.users (lower(email)) WHERE email IS NOT NULL'
  );
  await knex.raw(
    'CREATE UNIQUE INDEX users_google_id_unique ON data.users (google_id) WHERE google_id IS NOT NULL'
  );
  await knex.raw(
    'CREATE UNIQUE INDEX users_apple_id_unique ON data.users (apple_id) WHERE apple_id IS NOT NULL'
  );
  await knex.raw('CREATE INDEX users_role_idx ON data.users (role)');

  await knex.schema.withSchema('data').createTable('otp_verifications', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('mobile_number', 32).notNullable();
    t.string('code', 32).notNullable();
    t.timestamp('expires_at', { useTz: true }).notNullable();
    t.integer('attempts').notNullable().defaultTo(0);
    t.uuid('user_id').nullable();
    t.timestamps(true, true);
  });
  await knex.raw(`
    ALTER TABLE data.otp_verifications
    ADD CONSTRAINT otp_verifications_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES data.users(id) ON DELETE SET NULL
  `);
  await knex.raw(
    'CREATE INDEX otp_verifications_mobile_created_idx ON data.otp_verifications (mobile_number, created_at DESC)'
  );

  await knex.schema.withSchema('data').createTable('hospitals', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('name', 512).notNullable();
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });
  await knex.raw('CREATE INDEX hospitals_name_idx ON data.hospitals (name)');

  await knex.schema.withSchema('data').createTable('specializations', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('name', 512).notNullable();
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });
  await knex.raw('CREATE INDEX specializations_name_idx ON data.specializations (name)');

  await knex.schema.withSchema('data').createTable('providers', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable();
    t.jsonb('personal_info').notNullable();
    t.jsonb('professional_profiles').notNullable().defaultTo(knex.raw('\'[]\'::jsonb'));
    t.jsonb('lab_professional_details');
    t.jsonb('ambulance_professional_details');
    t.jsonb('nurse_professional_details');
    t.jsonb('hospital_professional_details');
    t.string('onboarding_step', 64).notNullable().defaultTo('personal_info');
    t.string('verification_status', 32).notNullable().defaultTo('pending');
    t.text('rejection_reason');
    t.timestamp('approved_at', { useTz: true });
    t.timestamps(true, true);
  });
  await knex.raw(`
    ALTER TABLE data.providers
    ADD CONSTRAINT providers_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES data.users(id) ON DELETE CASCADE
  `);
  await knex.raw('CREATE UNIQUE INDEX providers_user_id_unique ON data.providers (user_id)');
  await knex.raw(
    'CREATE INDEX providers_verification_status_idx ON data.providers (verification_status)'
  );

  await knex.schema.withSchema('data').createTable('provider_documents', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('provider_id').notNullable();
    t.string('document_type', 64).notNullable();
    t.string('url', 2048);
    t.string('file_name', 512);
    t.integer('file_size');
    t.string('document_number', 512);
    t.jsonb('metadata');
    t.timestamps(true, true);
  });
  await knex.raw(`
    ALTER TABLE data.provider_documents
    ADD CONSTRAINT provider_documents_provider_id_fkey
    FOREIGN KEY (provider_id) REFERENCES data.providers(id) ON DELETE CASCADE
  `);
  await knex.raw(
    'CREATE UNIQUE INDEX provider_documents_provider_type_unique ON data.provider_documents (provider_id, document_type)'
  );

  await knex.schema.withSchema('data').createTable('provider_payment_details', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('provider_id').notNullable();
    t.string('account_holder_name', 255).notNullable();
    t.string('bank_account_number', 64).notNullable();
    t.string('ifsc', 32).notNullable();
    t.string('upi_id', 255);
    t.string('gst_number', 64);
    t.timestamps(true, true);
  });
  await knex.raw(`
    ALTER TABLE data.provider_payment_details
    ADD CONSTRAINT provider_payment_details_provider_id_fkey
    FOREIGN KEY (provider_id) REFERENCES data.providers(id) ON DELETE CASCADE
  `);
  await knex.raw(
    'CREATE UNIQUE INDEX provider_payment_details_provider_unique ON data.provider_payment_details (provider_id)'
  );
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  await knex.schema.withSchema('data').dropTableIfExists('provider_payment_details');
  await knex.schema.withSchema('data').dropTableIfExists('provider_documents');
  await knex.schema.withSchema('data').dropTableIfExists('providers');
  await knex.schema.withSchema('data').dropTableIfExists('specializations');
  await knex.schema.withSchema('data').dropTableIfExists('hospitals');
  await knex.schema.withSchema('data').dropTableIfExists('otp_verifications');
  await knex.schema.withSchema('data').dropTableIfExists('users');
  await knex.raw('DROP SCHEMA IF EXISTS "data" CASCADE');
};
