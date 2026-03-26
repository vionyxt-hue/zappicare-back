/** Knex client name for SQL dialects. */
export const DatabaseProvider = {
  POSTGRESQL: 'pg',
} as const;
export type DatabaseProviderValue = (typeof DatabaseProvider)[keyof typeof DatabaseProvider];

/** Log levels used by DatabaseConnection Knex hooks and internal logging. */
export const LogLevel = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
} as const;
export type LogLevelValue = (typeof LogLevel)[keyof typeof LogLevel];
