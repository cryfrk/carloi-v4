// Some dependency trees expose `statuses` without the legacy `.message` map.
// Express/http-errors still expect this shape in some environments.
const statuses = require('statuses') as ((code: number) => string) & {
  message?: Record<number, string>;
  [key: string]: unknown;
};

if (!statuses.message) {
  statuses.message = statuses as unknown as Record<number, string>;
}
