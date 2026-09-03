import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, '..');
const distDir = path.join(serverRoot, 'dist');
const srcDir = path.join(serverRoot, 'src');
const cleanOnly = process.argv.includes('--clean');

async function main() {
  await rm(distDir, { recursive: true, force: true });

  if (cleanOnly) {
    return;
  }

  await mkdir(distDir, { recursive: true });
  await cp(srcDir, distDir, { recursive: true });
}

main().catch((error) => {
  console.error('Server build failed.');
  console.error(error);
  process.exit(1);
});
