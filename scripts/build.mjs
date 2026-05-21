import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const outputFile = path.join(distDir, 'pinfix.user.js');
const rootOutputFile = path.join(rootDir, 'pinfix.user.js');

const parts = [
  'src/userscript.header.txt',
  'src/modules/config.js',
  'src/modules/utils.js',
  'src/modules/i18n.js',
  'src/modules/storage.js',
  'src/modules/selector.js',
  'src/modules/anchors.js',
  'src/modules/review.js',
  'vendor/html2canvas.min.js',
  'src/modules/exporters.js',
  'src/modules/styles.js',
  'src/modules/ui.js',
  'src/modules/app.js'
];

const chunks = [];

for (const part of parts) {
  const filePath = path.join(rootDir, part);
  const content = await readFile(filePath, 'utf8');
  chunks.push(content.trimEnd());
}

await mkdir(distDir, { recursive: true });
const bundle = `${chunks.join('\n\n')}\n`;
await writeFile(outputFile, bundle, 'utf8');
await writeFile(rootOutputFile, bundle, 'utf8');

console.log(`Built ${path.relative(rootDir, outputFile)} and ${path.relative(rootDir, rootOutputFile)}`);
