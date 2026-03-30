// IBS Pro Chat Service - startup wrapper
// This file ensures the event loop stays alive for socket.io

import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverFile = join(__dirname, 'server.cjs');

const child = spawn(process.execPath, [serverFile], {
  stdio: 'inherit',
  env: { ...process.env },
});

child.on('error', (err) => {
  console.error('Failed to start chat service:', err);
  process.exit(1);
});

child.on('exit', (code) => {
  console.log(`Chat service exited with code ${code}`);
  process.exit(code || 0);
});

process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
