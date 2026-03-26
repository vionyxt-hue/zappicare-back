import path from 'path';
import knex, { type Knex } from 'knex';
import { EnvironmentConfigValidator } from '../config/environment.config';
import type { EnvironmentConfig } from '../config/environment.config';
import { DatabaseProvider, LogLevel } from '../enums/application.enum';
import { SchemaManager } from './schema.manager';

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private knex!: Knex;
  private config!: EnvironmentConfig;
  private isConnected = false;
  private schemaManager: SchemaManager | null = null;

  private constructor() {
    this.initializeConnection();
  }

  static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  private initializeConnection(): void {
    this.config = EnvironmentConfigValidator.validate(process.env);

    const connection = this.buildConnection(this.config);

    this.knex = knex({
      client: DatabaseProvider.POSTGRESQL,
      connection,
      pool: {
        min: this.config.DB_POOL_MIN,
        max: this.config.DB_POOL_MAX,
        acquireTimeoutMillis: 60000,
        createTimeoutMillis: 30000,
        destroyTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 200,
      },
      migrations: {
        tableName: this.config.DB_MIGRATIONS_TABLE,
        directory: [
          path.join(process.cwd(), 'src/db/migrations/data'),
          path.join(process.cwd(), 'src/db/migrations/audit'),
        ],
        extension: 'js',
        loadExtensions: ['.js'],
      },
      seeds: {
        directory: path.join(process.cwd(), 'src/db/seeds/data'),
        extension: 'js',
        loadExtensions: ['.js'],
      },
      debug: this.config.NODE_ENV === 'development',
      log: {
        warn: (message: string) => this.log(LogLevel.WARN, message),
        error: (message: string) => this.log(LogLevel.ERROR, message),
        deprecate: (message: string) => this.log(LogLevel.WARN, message),
        debug: (message: string) => this.log(LogLevel.DEBUG, message),
      },
    });
  }

  private buildConnection(config: EnvironmentConfig): Knex.Config['connection'] {
    if (config.DATABASE_URL && config.DATABASE_URL.trim().length > 0) {
      return config.DATABASE_URL;
    }
    const useSsl = config.DB_SSL === 'true';
    return {
      host: config.DB_HOST,
      port: config.DB_PORT,
      database: config.DB_NAME,
      user: config.DB_USER,
      password: config.DB_PASSWORD,
      ssl: useSsl
        ? { rejectUnauthorized: config.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
        : undefined,
    };
  }

  async connect(): Promise<void> {
    try {
      await this.knex.raw('SELECT 1');
      await this.getSchemaManager().ensureSchemasExist();
      this.isConnected = true;
      // Log DB + schema wiring once to avoid “wrong DB/schema” confusion during local dev.
      try {
        const dataSchema = this.config.DB_DATA_SCHEMA;
        const dbRow = await this.knex
          .raw(
            `
            select
              current_database() as db,
              current_user as user,
              current_schema() as current_schema
          `
          )
          .then((r) => (Array.isArray(r?.rows) ? r.rows[0] : undefined));

        const fbCol = await this.knex
          .raw(
            `
            select 1
            from information_schema.columns
            where table_schema = ?
              and table_name = 'users'
              and column_name = 'facebook_id'
            limit 1
          `,
            [dataSchema]
          )
          .then((r) => (Array.isArray(r?.rows) ? r.rows.length > 0 : false));

        this.log(
          LogLevel.INFO,
          `DB ready: db=${String(dbRow?.db ?? 'unknown')} schema=data:${dataSchema} facebook_id=${
            fbCol ? 'yes' : 'no'
          }`
        );
      } catch {
        // Don't block startup for diagnostics.
      }

      this.log(LogLevel.INFO, 'Database connected successfully');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.log(LogLevel.ERROR, `Database connection failed: ${msg}`);
      throw new Error(`Database connection failed: ${msg}`);
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.knex.destroy();
      this.isConnected = false;
      this.schemaManager = null;
      this.log(LogLevel.INFO, 'Database disconnected successfully');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.log(LogLevel.ERROR, `Database disconnection failed: ${msg}`);
      throw new Error(`Database disconnection failed: ${msg}`);
    }
  }

  getKnex(): Knex {
    if (!this.isConnected) {
      throw new Error('Database is not connected. Call connect() first.');
    }
    return this.knex;
  }

  /** Schema helpers (search_path, introspection, DDL helpers). */
  getSchemaManager(): SchemaManager {
    if (!this.schemaManager) {
      this.schemaManager = new SchemaManager(this.knex);
    }
    return this.schemaManager;
  }

  getDataSchema(): string {
    return this.config.DB_DATA_SCHEMA;
  }

  getAuditSchema(): string {
    return this.config.DB_AUDIT_SCHEMA;
  }

  getEnvironmentConfig(): EnvironmentConfig {
    return this.config;
  }

  /**
   * Runs all Knex migrations (data + audit dirs) using `DB_MIGRATIONS_TABLE`.
   * Prefer this or `npm run migrate:latest` — do not mix with {@link runDataMigrations} on the same DB.
   */
  async runMigrations(): Promise<void> {
    try {
      await this.getSchemaManager().ensureSchemasExist();
      await this.knex.migrate.latest();
      this.log(LogLevel.INFO, 'Database migrations completed successfully');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.log(LogLevel.ERROR, `Migration failed: ${msg}`);
      throw new Error(`Migration failed: ${msg}`);
    }
  }

  /**
   * Runs only `src/db/migrations/data` using `{DB_MIGRATIONS_TABLE}_data`.
   * Optional split history; avoid running the same migrations again via {@link runMigrations}.
   */
  async runDataMigrations(): Promise<void> {
    try {
      await this.getSchemaManager().ensureSchemasExist();
      await this.knex.migrate.latest({
        tableName: `${this.config.DB_MIGRATIONS_TABLE}_data`,
        directory: path.join(process.cwd(), 'src/db/migrations/data'),
        extension: 'js',
        loadExtensions: ['.js'],
      });
      this.log(LogLevel.INFO, 'Data schema migrations completed successfully');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('already exists')) {
        this.log(
          LogLevel.WARN,
          `Some tables already exist in data schema, skipping: ${msg}`
        );
        return;
      }
      this.log(LogLevel.ERROR, `Data migration failed: ${msg}`);
      throw new Error(`Data migration failed: ${msg}`);
    }
  }

  /**
   * Runs only `src/db/migrations/audit` using `{DB_MIGRATIONS_TABLE}_audit`.
   */
  async runAuditMigrations(): Promise<void> {
    try {
      await this.getSchemaManager().ensureSchemasExist();
      await this.knex.migrate.latest({
        tableName: `${this.config.DB_MIGRATIONS_TABLE}_audit`,
        directory: path.join(process.cwd(), 'src/db/migrations/audit'),
        extension: 'js',
        loadExtensions: ['.js'],
      });
      this.log(LogLevel.INFO, 'Audit schema migrations completed successfully');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('already exists')) {
        this.log(
          LogLevel.WARN,
          `Some tables already exist in audit schema, skipping: ${msg}`
        );
        return;
      }
      this.log(LogLevel.ERROR, `Audit migration failed: ${msg}`);
      throw new Error(`Audit migration failed: ${msg}`);
    }
  }

  async ensureSchemasExist(): Promise<void> {
    await this.getSchemaManager().ensureSchemasExist();
  }

  /**
   * Optional audit tables (e.g. generic change log). Prefer Knex migrations for production DDL.
   */
  async createAuditTables(): Promise<void> {
    try {
      const audit = this.config.DB_AUDIT_SCHEMA;

      const hasAuditLogs = await this.knex.schema.withSchema(audit).hasTable('audit_logs');
      if (!hasAuditLogs) {
        await this.knex.schema.withSchema(audit).createTable('audit_logs', (table) => {
          table.increments('id').primary();
          table.string('table_name', 100).notNullable();
          table.string('operation', 20).notNullable();
          table.jsonb('old_values').nullable();
          table.jsonb('new_values').nullable();
          table.string('user_id', 50).nullable();
          table.string('ip_address', 45).nullable();
          table.string('user_agent', 500).nullable();
          table.timestamp('created_at').notNullable().defaultTo(this.knex.fn.now());
          table.index(['table_name', 'created_at']);
          table.index(['user_id', 'created_at']);
          table.index(['operation', 'created_at']);
        });
      }

      const hasSystemEvents = await this.knex.schema.withSchema(audit).hasTable('system_events');
      if (!hasSystemEvents) {
        await this.knex.schema.withSchema(audit).createTable('system_events', (table) => {
          table.increments('id').primary();
          table.string('event_type', 100).notNullable();
          table.string('event_category', 50).notNullable();
          table.jsonb('event_data').nullable();
          table.string('user_id', 50).nullable();
          table.string('ip_address', 45).nullable();
          table.string('user_agent', 500).nullable();
          table.timestamp('created_at').notNullable().defaultTo(this.knex.fn.now());
          table.index(['event_type', 'created_at']);
          table.index(['event_category', 'created_at']);
          table.index(['user_id', 'created_at']);
        });
      }

      this.log(LogLevel.INFO, 'Audit tables ensured (audit_logs, system_events)');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.log(LogLevel.ERROR, `Audit table creation failed: ${msg}`);
      throw new Error(`Audit table creation failed: ${msg}`);
    }
  }

  async rollbackMigrations(): Promise<void> {
    try {
      await this.knex.migrate.rollback();
      this.log(LogLevel.INFO, 'Database migrations rolled back successfully');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.log(LogLevel.ERROR, `Migration rollback failed: ${msg}`);
      throw new Error(`Migration rollback failed: ${msg}`);
    }
  }

  async runSeeds(): Promise<void> {
    try {
      await this.knex.seed.run();
      this.log(LogLevel.INFO, 'Database seeds completed successfully');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.log(LogLevel.ERROR, `Seeding failed: ${msg}`);
      throw new Error(`Seeding failed: ${msg}`);
    }
  }

  async getMigrationStatus(): Promise<unknown[]> {
    try {
      return await this.knex.migrate.list();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.log(LogLevel.ERROR, `Failed to get migration status: ${msg}`);
      throw new Error(`Failed to get migration status: ${msg}`);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.knex.raw('SELECT 1');
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.log(LogLevel.ERROR, `Database health check failed: ${msg}`);
      return false;
    }
  }

  isDatabaseConnected(): boolean {
    return this.isConnected;
  }

  private log(level: (typeof LogLevel)[keyof typeof LogLevel], message: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${String(level).toUpperCase()}] [DatabaseConnection] ${message}`;
    switch (level) {
      case LogLevel.ERROR:
        console.error(logMessage);
        break;
      case LogLevel.WARN:
        console.warn(logMessage);
        break;
      case LogLevel.INFO:
        console.info(logMessage);
        break;
      case LogLevel.DEBUG:
        console.debug(logMessage);
        break;
      default:
        console.log(logMessage);
    }
  }
}
