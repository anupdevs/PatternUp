import { spawn } from 'child_process';
import path from 'path';

const dsaDir = path.resolve(process.cwd(), 'dsa-app');
console.log('Starting next dev on port 3005 in', dsaDir);

const child = spawn('npx', ['next', 'dev', '-p', '3005'], {
  cwd: dsaDir,
  shell: true,
  env: { ...process.env, PORT: '3005' }
});

child.stdout.on('data', (d) => process.stdout.write(`[NEXT] ${d}`));
child.stderr.on('data', (d) => process.stderr.write(`[NEXT ERR] ${d}`));

async function probe() {
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    try {
      const res = await fetch('http://localhost:3005/problems/two-sum');
      console.log('HTTP response status:', res.status);
      const text = await res.text();
      console.log('HTTP response snippet:', text.slice(0, 300));
      if (text.includes("This page couldn't load")) {
        console.error('FOUND SERVER ERROR SCREEN!');
      } else if (res.status === 200) {
        console.log('SUCCESS! Loaded two-sum page!');
      }
      child.kill();
      process.exit(0);
    } catch (e: any) {
      // not ready yet
    }
  }
  console.log('Timed out waiting for server');
  child.kill();
  process.exit(1);
}

probe();

