/**
 * Parses jsonwebtoken-style expiry strings (e.g. `1h`, `30d`, `60`) into milliseconds.
 * Numeric-only strings are treated as seconds (jwt.sign convention).
 */
export function jwtExpiryToMs(expiresIn: string): number {
  const t = expiresIn.trim();
  if (/^\d+$/.test(t)) {
    return parseInt(t, 10) * 1000;
  }
  const m = /^(\d+)(ms|s|m|h|d|w|y)$/i.exec(t);
  if (!m) {
    throw new Error(`Invalid JWT expiry: ${expiresIn}`);
  }
  const n = parseInt(m[1], 10);
  const u = m[2].toLowerCase();
  switch (u) {
    case 'ms':
      return n;
    case 's':
      return n * 1000;
    case 'm':
      return n * 60 * 1000;
    case 'h':
      return n * 60 * 60 * 1000;
    case 'd':
      return n * 24 * 60 * 60 * 1000;
    case 'w':
      return n * 7 * 24 * 60 * 60 * 1000;
    case 'y':
      return n * 365 * 24 * 60 * 60 * 1000;
    default:
      return n * 1000;
  }
}
