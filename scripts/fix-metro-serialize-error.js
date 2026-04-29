const fs = require('node:fs');
const path = require('node:path');

const targetFile = path.join(
  __dirname,
  '..',
  'node_modules',
  'metro',
  'src',
  'lib',
  'formatBundlingError.js',
);

if (!fs.existsSync(targetFile)) {
  console.log('[fix-metro-serialize-error] metro file not found, skipping');
  process.exit(0);
}

const original = fs.readFileSync(targetFile, 'utf8');

if (original.includes('function _getSerializeErrorCompat()')) {
  console.log('[fix-metro-serialize-error] patch already applied');
  process.exit(0);
}

const marker = `function _interopRequireDefault(e) {\r\n  return e && e.__esModule ? e : { default: e };\r\n}\r\n`;
const markerLf = `function _interopRequireDefault(e) {\n  return e && e.__esModule ? e : { default: e };\n}\n`;

const helper = `function _getSerializeErrorCompat() {\n  if (typeof _serializeError.default === "function") {\n    return _serializeError.default;\n  }\n  if (\n    _serializeError.default &&\n    typeof _serializeError.default.serializeError === "function"\n  ) {\n    return _serializeError.default.serializeError;\n  }\n  if (typeof _serializeError.serializeError === "function") {\n    return _serializeError.serializeError;\n  }\n  throw new TypeError("serialize-error export is not compatible with Metro");\n}\n`;

let patched = original;

if (patched.includes(marker)) {
  patched = patched.replace(marker, `${marker}${helper}`);
} else if (patched.includes(markerLf)) {
  patched = patched.replace(markerLf, `${markerLf}${helper}`);
} else {
  console.error('[fix-metro-serialize-error] could not find insertion point');
  process.exit(1);
}

patched = patched.replace(
  '      ...(0, _serializeError.default)(error),',
  '      ..._getSerializeErrorCompat()(error),',
);

if (patched === original) {
  console.error('[fix-metro-serialize-error] patch did not change target file');
  process.exit(1);
}

fs.writeFileSync(targetFile, patched, 'utf8');
console.log('[fix-metro-serialize-error] patch applied');
