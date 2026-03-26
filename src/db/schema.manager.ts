import type { Knex } from 'knex';
import { EnvironmentConfigValidator } from '../config/environment.config';
import type { EnvironmentConfig } from '../config/environment.config';
import { LoggerService } from '../common/logger';

export class SchemaManager {
  private readonly knex: Knex;
  private readonly config: EnvironmentConfig;
  private readonly logger = new LoggerService('SchemaManager');

  constructor(knex: Knex) {
    this.knex = knex;
    this.config = EnvironmentConfigValidator.validate(process.env);
  }

  /**
   * Ensure all required schemas exist and set default search_path for this connection.
   */
  async ensureSchemasExist(): Promise<void> {
    try {
      await this.knex.raw(
        `CREATE SCHEMA IF NOT EXISTS "${this.config.DB_DATA_SCHEMA}"`
      );
      await this.knex.raw(
        `CREATE SCHEMA IF NOT EXISTS "${this.config.DB_AUDIT_SCHEMA}"`
      );
      const list = [
        `"${this.config.DB_DATA_SCHEMA}"`,
        `"${this.config.DB_AUDIT_SCHEMA}"`,
        `"${this.config.DB_PUBLIC_SCHEMA}"`,
      ].join(', ');
      await this.knex.raw(`SET search_path TO ${list}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error('Schema creation failed', { error: msg });
      throw new Error(`Schema creation failed: ${msg}`);
    }
  }

  getDataSchema(): string {
    return this.config.DB_DATA_SCHEMA;
  }

  getAuditSchema(): string {
    return this.config.DB_AUDIT_SCHEMA;
  }

  getPublicSchema(): string {
    return this.config.DB_PUBLIC_SCHEMA;
  }

  async schemaExists(schemaName: string): Promise<boolean> {
    try {
      const result = await this.knex.raw(
        'SELECT schema_name FROM information_schema.schemata WHERE schema_name = ?',
        [schemaName]
      );
      const rows = (result as { rows: { schema_name: string }[] }).rows;
      return rows.length > 0;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error('Error checking schema existence', { error: msg });
      return false;
    }
  }

  async getAllSchemas(): Promise<string[]> {
    try {
      const result = await this.knex.raw(
        "SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast') ORDER BY schema_name"
      );
      const rows = (result as { rows: { schema_name: string }[] }).rows;
      return rows.map((row) => row.schema_name);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error('Error getting schemas', { error: msg });
      return [];
    }
  }

  async setSearchPath(schemas: string[]): Promise<void> {
    try {
      const schemaList = schemas.map((s) => `"${s}"`).join(', ');
      await this.knex.raw(`SET search_path TO ${schemaList}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error('Error setting search path', { error: msg });
      throw new Error(`Failed to set search path: ${msg}`);
    }
  }

  async getTablesInSchema(schemaName: string): Promise<string[]> {
    try {
      const result = await this.knex.raw(
        'SELECT table_name FROM information_schema.tables WHERE table_schema = ? ORDER BY table_name',
        [schemaName]
      );
      const rows = (result as { rows: { table_name: string }[] }).rows;
      return rows.map((row) => row.table_name);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error getting tables in schema ${schemaName}`, {
        error: msg,
      });
      return [];
    }
  }

  async createTableInSchema(
    schemaName: string,
    tableName: string,
    callback: (table: Knex.CreateTableBuilder) => void
  ): Promise<void> {
    try {
      await this.knex.schema.withSchema(schemaName).createTable(tableName, callback);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error creating table ${tableName} in schema ${schemaName}`,
        { error: msg }
      );
      throw new Error(`Failed to create table: ${msg}`);
    }
  }

  async dropTableFromSchema(schemaName: string, tableName: string): Promise<void> {
    try {
      await this.knex.schema.withSchema(schemaName).dropTableIfExists(tableName);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error dropping table ${tableName} from schema ${schemaName}`,
        { error: msg }
      );
      throw new Error(`Failed to drop table: ${msg}`);
    }
  }
}
