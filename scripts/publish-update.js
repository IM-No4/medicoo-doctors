#!/usr/bin/env node
// Sends an over-the-air update to everyone running the production doctor app (no new Play Store review needed for JavaScript / asset
// changes).
//
//   npm run update:production -- "what changed"
//
// The production value below is set explicitly so that a local .env pointing at a development server can never end up inside an update
// that every doctor receives (variables already in the environment win over .env files).
const { spawnSync } = require('child_process');

const message = process.argv.slice(2).join(' ').trim();
if (message.length < 5) {
  console.error('Say what changed:  npm run update:production -- "Earnings screen colours follow dark mode"');
  process.exit(1);
}

const env = { ...process.env, EXPO_PUBLIC_API_BASE_URL: 'https://backend.medicoo.in' };

const result = spawnSync('npx', ['eas-cli', 'update', '--channel', 'production', '--message', message], { stdio: 'inherit', env, shell: true });
process.exit(result.status === null ? 1 : result.status);
