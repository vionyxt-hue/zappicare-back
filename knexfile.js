require('dotenv').config();

const path = require('path');

const poolMin = parseInt(process.env.DB_POOL_MIN || '0', 10);
const poolMax = parseInt(process.env.DB_POOL_MAX || '10', 10);

function buildConnection() {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0) {
    return process.env.DATABASE_URL;
  }
  const useSsl = process.env.DB_SSL === 'true';
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'zappicare',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: useSsl
      ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
      : undefined,
  };
}

/** @type {import('knex').Knex.Config} */
module.exports = {
  client: 'pg',
  connection: buildConnection(),
  pool: { min: poolMin, max: poolMax },
  migrations: {
    tableName: process.env.DB_MIGRATIONS_TABLE || 'knex_migrations',
    directory: [
      path.join(__dirname, 'src/db/migrations/data'),
      path.join(__dirname, 'src/db/migrations/audit'),
    ],
    extension: 'js',
  },
  seeds: {
    directory: path.join(__dirname, 'src/db/seeds/data'),
    extension: 'js',
  },
};
