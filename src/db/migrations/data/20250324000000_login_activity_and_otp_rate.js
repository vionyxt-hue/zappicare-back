/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  await knex.schema.withSchema('data').alterTable('users', (t) => {
    t.boolean('is_stepper_completed').notNullable().defaultTo(false);
  });

  await knex.schema.withSchema('data').createTable('otp_send_windows', (t) => {
    t.string('mobile_number', 32).primary();
    t.timestamp('window_started_at', { useTz: true }).notNullable();
    t.integer('send_count').notNullable().defaultTo(0);
    t.timestamps(true, true);
  });

  await knex.schema.withSchema('data').createTable('login_activity', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable();
    t.uuid('session_id').notNullable();
    t.string('refresh_token_hash', 128).notNullable();
    t.string('status', 32).notNullable().defaultTo('active');
    t.timestamp('access_token_expires_at', { useTz: true }).notNullable();
    t.timestamp('refresh_token_expires_at', { useTz: true }).notNullable();
    t.jsonb('device_info');
    t.jsonb('location_info');
    t.string('ip_address', 64);
    t.text('user_agent');
    t.string('fcm_token', 512);
    t.string('apns_token', 512);
    t.string('onesignal_player_id', 255);
    t.string('device_platform', 64);
    t.string('timezone', 128);
    t.timestamp('logout_at', { useTz: true });
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });
  await knex.raw(`
    ALTER TABLE data.login_activity
    ADD CONSTRAINT login_activity_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES data.users(id) ON DELETE CASCADE
  `);
  await knex.raw(
    'CREATE UNIQUE INDEX login_activity_session_id_unique ON data.login_activity (session_id)'
  );
  await knex.raw(
    'CREATE UNIQUE INDEX login_activity_refresh_hash_unique ON data.login_activity (refresh_token_hash)'
  );
  await knex.raw(
    'CREATE INDEX login_activity_user_active_idx ON data.login_activity (user_id, is_active)'
  );

  await knex.raw(`
    UPDATE data.users SET
      is_stepper_completed = CASE WHEN role != 'provider' THEN true ELSE false END,
      current_step = CASE
        WHEN is_phone_verified AND is_profile_completed AND role != 'provider' THEN 4
        WHEN is_phone_verified AND is_profile_completed AND role = 'provider' THEN 2
        WHEN is_phone_verified AND NOT is_profile_completed THEN 1
        WHEN NOT is_phone_verified AND is_profile_completed THEN 2
        ELSE 0
      END
  `);
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  await knex.schema.withSchema('data').dropTableIfExists('login_activity');
  await knex.schema.withSchema('data').dropTableIfExists('otp_send_windows');
  await knex.schema.withSchema('data').alterTable('users', (t) => {
    t.dropColumn('is_stepper_completed');
  });
};
