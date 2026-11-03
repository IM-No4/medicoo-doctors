// Fails when a colour literal (#hex, rgb(), rgba()) appears in the app code outside src/theme/.
// Colours live in src/theme/colors.ts (light/dark, read with useTheme()) and src/theme/palette.ts (fixed colours, by name).
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'src');
const LITERAL = /#[0-9A-Fa-f]{8}\b|#[0-9A-Fa-f]{6}\b|['"`]#[0-9A-Fa-f]{3}['"`]|rgba?\(\s*\d/;
const offenders = [];

(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'theme' || entry.name === 'assets') continue;
      walk(file);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, i) => {
        if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
        if (LITERAL.test(line)) offenders.push(`${path.relative(path.join(__dirname, '..'), file)}:${i + 1}: ${line.trim()}`);
      });
    }
  }
})(root);

if (offenders.length) {
  console.error(`Colour literals outside src/theme (${offenders.length}). Use useTheme() or palette from src/theme:\n` + offenders.join('\n'));
  process.exit(1);
}
console.log('No colour literals outside src/theme.');
