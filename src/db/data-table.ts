import type { Knex } from 'knex';
import { DatabaseConnection } from './database.connection';

/** Shared Knex instance (same pool as bootstrap). */
export function getKnex(): Knex {
  return DatabaseConnection.getInstance().getKnex();
}

/** Query builder for tables in the configured application schema (`DB_DATA_SCHEMA`). */
export function dataTable(tableName: string): Knex.QueryBuilder {
  const schema = DatabaseConnection.getInstance().getDataSchema();
  return getKnex().withSchema(schema).table(tableName);
}
