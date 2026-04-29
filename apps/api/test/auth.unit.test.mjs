import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  durationToMs,
  hashToken,
  normalizeEmail,
  normalizeIdentifier,
  normalizePhone,
  normalizeUsername,
  resolveContactIdentifier,
} = require('../dist/modules/auth/auth.utils.js');

test('auth utils normalize identifiers consistently', () => {
  assert.equal(normalizeEmail('  USER@Example.com '), 'user@example.com');
  assert.equal(normalizePhone(' +90 (555) 111 22 33 '), '+905551112233');
  assert.equal(normalizeUsername('  Carloi.User  '), 'carloi.user');
  assert.deepEqual(normalizeIdentifier('USER@example.com'), {
    kind: 'email',
    value: 'user@example.com',
  });
  assert.deepEqual(normalizeIdentifier('+90 555 111 22 33'), {
    kind: 'phone',
    value: '+905551112233',
  });
  assert.deepEqual(normalizeIdentifier('Carloi.User'), {
    kind: 'username',
    value: 'carloi.user',
  });
  assert.deepEqual(resolveContactIdentifier('+90 555 111 22 33'), {
    kind: 'phone',
    targetType: 'PHONE',
    value: '+905551112233',
  });
});

test('auth utils parse durations and hash tokens deterministically', () => {
  assert.equal(durationToMs('15m'), 900_000);
  assert.equal(durationToMs('30d'), 2_592_000_000);
  assert.equal(durationToMs(120), 120_000);
  assert.equal(
    hashToken('refresh-token'),
    '0eb17643d4e9261163783a420859c92c7d212fa9624106a12b510afbec266120',
  );
});
